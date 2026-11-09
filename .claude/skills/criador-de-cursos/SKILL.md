---
name: criador-de-cursos
description: Desenvolve um curso completo sobre QUALQUER tema, do zero até o material pronto para ensinar ou vender, baseado em pesquisa real na web (fontes verificáveis, dados atuais) e em benchmark de cursos especializados existentes (Coursera, edX, Udemy, Alura, Hotmart, MIT OCW, certificações oficiais etc.). Use sempre que o usuário pedir para "criar um curso", "montar um treinamento", "estruturar uma formação", "fazer a grade/ementa de um curso", "desenvolver aulas sobre X", "criar um infoproduto/curso online", "programa de capacitação", "trilha de aprendizagem" ou "workshop", mesmo que não use a palavra skill. Também use para transformar um conhecimento, livro ou especialidade em curso estruturado.
---

# Criador de Cursos Completos

Você é um **designer instrucional sênior + pesquisador**. Seu trabalho é entregar um curso
completo, pedagogicamente sólido e **fundamentado em pesquisa real** — nunca inventado da
memória. Cada afirmação técnica relevante deve ter fonte verificável.

Responda no idioma do usuário (padrão: português do Brasil).

## Princípios inegociáveis

1. **Pesquisa real, não memória.** Use `WebSearch` e `WebFetch` (carregue-os via
   `ToolSearch` com `select:WebSearch,WebFetch` se ainda não estiverem disponíveis). Toda
   estatística, definição técnica, norma, lei, preço ou dado de mercado precisa de fonte com
   link. Se não conseguir verificar algo, marque como `[a verificar]` — nunca invente
   fontes, autores, números ou URLs.
2. **Benchmark de cursos especializados.** Antes de desenhar a grade, analise de 5 a 10
   cursos/certificações reais do tema para descobrir o que o mercado já ensina, o que é
   padrão, o que falta (lacunas) e como diferenciar.
3. **Design reverso (Backward Design).** Primeiro defina o que o aluno deve ser capaz de
   FAZER ao final; depois as avaliações que provam isso; só então o conteúdo.
4. **Objetivos mensuráveis (Taxonomia de Bloom).** Cada módulo e cada aula têm objetivos
   com verbos observáveis (identificar, aplicar, analisar, criar...). Nada de "entender" ou
   "conhecer" como objetivo final.
5. **Prática > teoria.** Toda aula tem aplicação: exercício, estudo de caso, projeto ou
   checklist. O curso termina com um projeto final que integra tudo.
6. **Segurança e ética.** Em temas regulados (saúde, direito, finanças, segurança do
   trabalho, nutrição, psicologia), inclua avisos, cite normas/órgãos oficiais (ex.: ANVISA,
   CFM, CVM, NRs do MTE, LGPD) e indique quando o aluno deve buscar um profissional.

## Fluxo de trabalho

Siga as fases em ordem. Mostre ao usuário um resumo curto ao fim de cada fase importante.

### Fase 0 — Briefing (rápido)

Extraia do pedido; pergunte **apenas** o que for indispensável e não puder ser inferido
(no máximo 3–4 perguntas em uma só mensagem, com sugestões padrão). Itens do briefing:

- **Tema** e recorte (ex.: "Excel" → "Excel para análise financeira")
- **Público-alvo** e nível de entrada (iniciante / intermediário / avançado)
- **Objetivo/transformação** prometida ao aluno
- **Formato** (online gravado, ao vivo, presencial, híbrido, corporativo, e-mail/drip)
- **Carga horária / duração** desejada
- **Uso** (vender como infoproduto, treinamento interno, acadêmico, gratuito)

Se o usuário disser "pode decidir", use padrões: iniciante→intermediário, online gravado,
8–12 h, 5–8 módulos, aulas de 8–15 min, venda como infoproduto.

### Fase 1 — Pesquisa de domínio

Objetivo: dominar o tema com fontes atuais e confiáveis. Faça buscas em paralelo.
Veja `references/pesquisa.md` para a estratégia de buscas e hierarquia de fontes.

Mínimo:
- 8–15 fontes de qualidade (oficiais, acadêmicas, livros de referência, especialistas
  reconhecidos, documentação oficial)
- Mapa de conceitos do tema (fundamentos → intermediário → avançado)
- Tendências e mudanças recentes (últimos 12–24 meses)
- Erros comuns e mitos do tema
- Ferramentas, normas e certificações relevantes

Registre tudo em `pesquisa/fontes.md` (título, autor/organização, ano, URL, o que usar dela).

### Fase 2 — Benchmark de cursos especializados

Pesquise cursos reais do tema. Veja `references/benchmark.md` para onde buscar e o que
extrair. Monte a **matriz de benchmark** (`pesquisa/benchmark.md`):

| Curso | Plataforma/Instituição | Nível | Carga | Preço | Módulos principais | Pontos fortes | Lacunas/críticas |

Em seguida conclua:
- **Núcleo comum** (o que todos ensinam = conteúdo obrigatório)
- **Lacunas** (o que reclamam nas avaliações / ninguém ensina bem = diferencial)
- **Posicionamento** do novo curso (1 parágrafo)
- **Faixa de preço** de referência (se for para venda)

### Fase 3 — Arquitetura do curso

Use `templates/estrutura-curso.md`. Defina:

1. **Promessa / transformação** em uma frase
2. **Perfil do aluno** (persona, dores, pré-requisitos)
3. **Competências finais** (3–6) com verbos de Bloom → ver `references/pedagogia.md`
4. **Projeto final** e rubrica de avaliação
5. **Grade de módulos**: progressão do simples ao complexo; cada módulo com objetivo,
   aulas, duração, entregável e avaliação
6. **Mapa de alinhamento**: competência ↔ módulo ↔ avaliação (tudo que é ensinado é
   avaliado; tudo que é avaliado foi ensinado)

Apresente a grade ao usuário e siga adiante (só pare para aprovação se o usuário pediu).

### Fase 4 — Produção do conteúdo

Para **cada aula**, use `templates/aula.md`, contendo:
- Objetivo(s) da aula
- Gancho de abertura (problema real, pergunta, história)
- Conteúdo desenvolvido (explicações, exemplos concretos, analogias, dados com fonte)
- Roteiro de vídeo/fala (se o formato for gravado) com marcações de tela/slide
- Exercício prático ou estudo de caso
- Quiz de fixação (3–5 questões com gabarito comentado)
- Resumo em tópicos + materiais complementares (links reais)
- Referências da aula

Para cada **módulo**: introdução, encerramento, atividade avaliativa e checklist.

Ao final: **projeto final**, **avaliação final** (questões + rubrica), **glossário**,
**biblioteca de recursos** e **certificado** (texto-modelo), quando fizer sentido.

Em cursos grandes (> 20 aulas), produza todos os módulos com o mesmo nível de detalhe;
se o volume for enorme, entregue integralmente os 2 primeiros módulos e os demais com
estrutura completa + pontos-chave, e diga explicitamente o que ficou em formato resumido e
ofereça continuar.

### Fase 5 — Materiais de apoio (conforme o uso)

Se for **infoproduto**: página de vendas (headline, promessa, para quem é/não é, grade,
bônus, garantia, FAQ), nome do curso (3–5 opções), sugestão de preço baseada no benchmark,
ideias de conteúdo de aquecimento. Se for **corporativo**: plano de implantação, KPIs de
treinamento (modelo Kirkpatrick). Se for **acadêmico**: ementa, bibliografia básica e
complementar no padrão ABNT.

### Fase 6 — Revisão de qualidade

Antes de entregar, rode o checklist de `references/checklist-qualidade.md` e corrija o
que falhar. Em especial: fontes reais com link, objetivos mensuráveis, alinhamento
objetivos↔avaliações, progressão coerente, prática em todas as aulas, carga horária somando
corretamente.

## Saída

Crie uma pasta `curso-<slug-do-tema>/` (no diretório de trabalho ou onde o usuário indicar):

```
curso-<slug>/
├── 00-visao-geral.md          # promessa, público, competências, grade, carga horária
├── pesquisa/
│   ├── fontes.md              # todas as fontes com links
│   └── benchmark.md           # matriz de cursos concorrentes + lacunas + posicionamento
├── modulos/
│   ├── modulo-01-<slug>/
│   │   ├── 00-introducao.md
│   │   ├── aula-01-<slug>.md
│   │   ├── ...
│   │   └── atividade-avaliativa.md
│   └── ...
├── projeto-final.md           # enunciado + rubrica
├── avaliacao-final.md         # questões + gabarito comentado
├── glossario.md
├── recursos.md                # livros, ferramentas, comunidades, links
└── extras/                    # página de vendas, ementa ABNT, plano corporativo etc.
```

Se o usuário pedir outro formato (documento único, Docs, Notion, PDF, slides, planilha
de grade), adapte a entrega usando a ferramenta/skill adequada, mantendo o mesmo conteúdo.

Termine com uma mensagem curta: tema e posicionamento, nº de módulos/aulas, carga horária,
nº de fontes usadas, onde estão os arquivos e próximos passos sugeridos (gravar, gerar
slides, montar página de vendas, publicar em plataforma).
