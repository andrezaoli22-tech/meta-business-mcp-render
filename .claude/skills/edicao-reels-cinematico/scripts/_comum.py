"""Funções compartilhadas pelos scripts da skill de edição."""
import json
import os
import shutil
import subprocess
import sys

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(SKILL_DIR, "assets")


def erro(msg):
    print(f"ERRO: {msg}", file=sys.stderr)
    sys.exit(1)


def exigir(binario):
    if not shutil.which(binario):
        erro(f"'{binario}' não encontrado no PATH.")


def rodar(cmd, silencioso=True):
    """Roda um comando; em caso de falha mostra o final do stderr."""
    if not silencioso:
        print("$ " + " ".join(str(c) for c in cmd), file=sys.stderr)
    p = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
    if p.returncode != 0:
        print(p.stderr[-4000:], file=sys.stderr)
        erro(f"comando falhou: {cmd[0]} (código {p.returncode})")
    return p


def ffprobe(caminho):
    exigir("ffprobe")
    p = rodar(["ffprobe", "-v", "error", "-print_format", "json",
               "-show_format", "-show_streams", caminho])
    return json.loads(p.stdout)


def info_video(caminho):
    """Resumo útil: largura, altura (já considerando rotação), fps, duração, tem_audio."""
    d = ffprobe(caminho)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    info = {"duracao": float(d["format"].get("duration", 0)), "tem_audio": a is not None}
    if v:
        w, h = int(v["width"]), int(v["height"])
        rot = 0
        for sd in v.get("side_data_list", []) or []:
            if "rotation" in sd:
                rot = int(sd["rotation"])
        rot = int(v.get("tags", {}).get("rotate", rot))
        if abs(rot) % 180 == 90:
            w, h = h, w
        num, den = v.get("avg_frame_rate", "30/1").split("/")
        fps = float(num) / float(den) if float(den) else 30.0
        info.update({"largura": w, "altura": h, "fps": round(fps, 3),
                     "codec": v.get("codec_name"), "pix_fmt": v.get("pix_fmt"),
                     "transfer": v.get("color_transfer"), "rotacao": rot})
    if a:
        info.update({"audio_codec": a.get("codec_name"),
                     "audio_hz": int(a.get("sample_rate", 48000)),
                     "audio_canais": int(a.get("channels", 2))})
    return info


def ler_json(caminho):
    with open(caminho, encoding="utf-8") as f:
        return json.load(f)


def salvar_json(obj, caminho):
    os.makedirs(os.path.dirname(os.path.abspath(caminho)), exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def par(n):
    """Arredonda para o número par mais próximo (exigência do yuv420p)."""
    n = int(round(n))
    return n - (n % 2)


def parse_formato(formato):
    """'9:16' -> (1080, 1920). Aceita também '1080x1920'."""
    tabela = {"9:16": (1080, 1920), "4:5": (1080, 1350), "1:1": (1080, 1080),
              "16:9": (1920, 1080), "4:3": (1440, 1080)}
    if formato in tabela:
        return tabela[formato]
    if "x" in formato:
        w, h = formato.lower().split("x")
        return par(float(w)), par(float(h))
    erro(f"formato desconhecido: {formato}")
