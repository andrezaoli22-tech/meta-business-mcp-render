# Estratégia de pesquisa de domínio

## Hierarquia de confiabilidade das fontes

1. **Oficiais/normativas**: órgãos governamentais, leis, normas técnicas (ABNT, ISO),
   conselhos profissionais, documentação oficial de produtos/linguagens.
2. **Acadêmicas**: artigos revisados por pares (Google Scholar, SciELO, PubMed, arXiv
   com cautela), livros-texto de referência, universidades.
3. **Especialistas e instituições reconhecidas**: associações do setor, relatórios de
   mercado (McKinsey, Gartner, Sebrae, IBGE, Statista), profissionais com histórico.
4. **Imprensa especializada** e blogs técnicos de empresas reconhecidas.
5. **Comunidades** (Reddit, Stack Overflow, fóruns): só para descobrir dúvidas e dores
   reais dos alunos — nunca como fonte de fato técnico.

Prefira fontes dos últimos 3 anos para temas que mudam rápido (tecnologia, marketing,
legislação). Para fundamentos estáveis, clássicos são aceitáveis.

## Roteiro de buscas (faça em paralelo, adaptando ao idioma)

- `<tema> fundamentos guia completo`
- `<tema> conceitos essenciais iniciantes`
- `<tema> boas práticas <ano atual>`
- `<tema> tendências <ano atual>`
- `<tema> erros comuns` / `<tema> mitos`
- `<tema> livro referência` / `best books <topic>`
- `<tema> norma OR legislação OR regulamentação` (se aplicável)
- `<tema> estatísticas mercado Brasil <ano>`
- `<topic> syllabus university` / `<topic> curriculum` (ementas acadêmicas são ótimas
  para a sequência lógica dos conteúdos)
- `<tema> dúvidas iniciantes reddit` / `site:reddit.com <topic> beginner` (dores reais)

Use `WebFetch` para ler as páginas mais relevantes por inteiro, não apenas o snippet.

## Registro de fontes (`pesquisa/fontes.md`)

```
## [F01] Título da fonte
- Autor/organização: ...
- Ano: ...
- URL: ...
- Tipo: oficial | acadêmica | especialista | mercado | comunidade
- Uso no curso: módulo X, aula Y — o que foi aproveitado
```

Nas aulas, cite como `[F01]` e liste a referência completa ao final da aula.

## Regras anti-alucinação

- Nunca cite uma URL que você não acessou ou que não apareceu nos resultados.
- Nunca atribua uma citação literal a alguém sem ter visto a fonte.
- Números: sempre com fonte e ano. Se divergirem entre fontes, mostre a faixa.
- Marque como `[a verificar]` tudo que não pôde ser confirmado.
