# Curso: Personal Chef Pro — Da cozinha ao negócio

**Versão essencial (recomendada):** `curso-essencial.md` / `curso-essencial.html` / `apostila-essencial-personal-chef.pdf` — os pontos principais em 6 páginas.

Versão completa (24 aulas), em texto, sem depender de vídeos:

- **`curso-completo.html`**: página navegável com menu de aulas, progresso, respostas ocultas nos quizzes e prova final com correção automática.
- **`apostila-personal-chef-pro.pdf`**: apostila A4 com todo o conteúdo, gabaritos inclusos (144 páginas).
- **`curso-completo.md`**: todo o curso em um único arquivo de texto.

Os arquivos separados por módulo continuam em `modulos/`. Para regenerar a versão essencial: `python3 ferramentas/build_essencial.py .`. Para regenerar o HTML e o Markdown único da versão completa depois de editar uma aula:
`python3 ferramentas/build_course.py . ferramentas/template.html` (requer `pip install markdown`).

| Pasta/arquivo | Conteúdo |
|---|---|
| `00-visao-geral.md` | Promessa, público, competências, grade, carga horária, alinhamento |
| `pesquisa/fontes.md` | 33 fontes (64 links) |
| `pesquisa/benchmark.md` | 10 cursos/certificações analisados, lacunas e posicionamento |
| `modulos/` | 6 módulos, 24 aulas (conteúdo completo, passo a passo, prática, quiz) + atividades |
| `imagens/` | 5 infográficos SVG |
| `projeto-final.md` | Enunciado e rubrica |
| `avaliacao-final.md` | Prova com 30 questões + gabarito comentado |
| `glossario.md`, `recursos.md` | Glossário e biblioteca |
| `extras/` | Modelos (entrevista, ficha técnica, preço, contrato, checklist, manual), página de vendas, certificado |

Itens marcados **[a verificar]** / **[conferir]** precisam ser confirmados no texto oficial
antes da publicação.
