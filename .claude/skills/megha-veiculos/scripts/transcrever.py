#!/usr/bin/env python3
"""Transcreve a fala com tempo por palavra (faster-whisper).

Uso:
  python transcrever.py VIDEO --saida palavras.json [--modelo small] [--idioma pt]
                        [--vocabulario "Flamme, Meta Ads, ROAS"]

Saídas:
  palavras.json    - {"idioma", "duracao", "palavras":[{i,texto,inicio,fim,prob}], "frases":[...]}
  palavras.txt     - transcrição legível, uma frase por linha com tempo e índice das palavras
                     (é este arquivo que você lê para decupar)

Instala o faster-whisper se faltar. Modelos: tiny/base/small/medium/large-v3.
'small' é o equilíbrio padrão em CPU; use 'medium' ou 'large-v3' quando houver
nomes próprios, sotaque forte ou áudio ruim.
"""
import argparse
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import rodar, salvar_json  # noqa: E402


def garantir_whisper():
    try:
        import faster_whisper  # noqa: F401
    except ImportError:
        print("Instalando faster-whisper...", file=sys.stderr)
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "faster-whisper"], check=True)


def fmt(t):
    return f"{int(t // 60):02d}:{t % 60:05.2f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--saida", default="palavras.json")
    ap.add_argument("--modelo", default="small")
    ap.add_argument("--idioma", default="pt")
    ap.add_argument("--vocabulario", default="",
                    help="nomes/termos que o modelo deve reconhecer (marca, produto, pessoas)")
    a = ap.parse_args()

    garantir_whisper()
    from faster_whisper import WhisperModel

    # extrai áudio mono 16 kHz (mais rápido e evita problemas de container)
    wav = os.path.join(tempfile.mkdtemp(), "audio.wav")
    rodar(["ffmpeg", "-y", "-hide_banner", "-i", a.video, "-vn", "-ac", "1", "-ar", "16000", wav])

    modelo = WhisperModel(a.modelo, device="auto", compute_type="int8")
    prompt = None
    if a.vocabulario:
        prompt = f"Transcrição em português do Brasil. Termos: {a.vocabulario}."
    # passa o áudio já decodificado (evita incompatibilidades do PyAV usado internamente)
    import wave
    import numpy as np
    with wave.open(wav) as w:
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    segmentos, info = modelo.transcribe(
        audio, language=a.idioma or None, word_timestamps=True, vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 250}, initial_prompt=prompt,
        condition_on_previous_text=False, beam_size=5)

    palavras, frases = [], []
    for seg in segmentos:
        ini_idx = len(palavras)
        for w in seg.words or []:
            texto = w.word.strip()
            if not texto:
                continue
            palavras.append({"i": len(palavras), "texto": texto,
                             "inicio": round(w.start, 3), "fim": round(w.end, 3),
                             "prob": round(w.probability, 3)})
        if len(palavras) > ini_idx:
            frases.append({"inicio": palavras[ini_idx]["inicio"], "fim": palavras[-1]["fim"],
                           "palavras": [ini_idx, len(palavras) - 1], "texto": seg.text.strip()})

    salvar_json({"idioma": info.language, "duracao": round(info.duration, 3),
                 "fonte": os.path.abspath(a.video), "palavras": palavras, "frases": frases},
                a.saida)

    txt = os.path.splitext(a.saida)[0] + ".txt"
    with open(txt, "w", encoding="utf-8") as f:
        for fr in frases:
            duvidosas = [p["texto"] for p in palavras[fr["palavras"][0]:fr["palavras"][1] + 1]
                         if p["prob"] < 0.5]
            extra = f"   [baixa confiança: {', '.join(duvidosas)}]" if duvidosas else ""
            f.write(f"[{fmt(fr['inicio'])} → {fmt(fr['fim'])}] (palavras {fr['palavras'][0]}–"
                    f"{fr['palavras'][1]}) {fr['texto']}{extra}\n")
    print(f"{len(palavras)} palavras, {len(frases)} frases → {a.saida} e {txt}")


if __name__ == "__main__":
    main()
