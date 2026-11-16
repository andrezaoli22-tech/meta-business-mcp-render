# Onde buscar imagens

## Livres para uso comercial (preferência)
| Fonte | Busca | Observações |
|---|---|---|
| Unsplash | `https://unsplash.com/s/photos/<termo>` | Melhor qualidade editorial. Download: `https://unsplash.com/photos/<id>/download?force=true` |
| Pexels | `https://www.pexels.com/search/<termo>/` | Bom para pessoas e negócios locais; tem vídeos |
| Pixabay | `https://pixabay.com/images/search/<termo>/` | Também ilustrações e vetores |
| Openverse | `https://openverse.org/search/?q=<termo>` | Agrega CC; conferir licença de cada item (evitar NC/ND) |
| Wikimedia Commons | `https://commons.wikimedia.org` | Lugares, monumentos, pessoas públicas; exige crédito conforme licença |

Se o ambiente tiver chaves de API (`UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`), use as APIs:
- `GET https://api.unsplash.com/search/photos?query=<termo>&orientation=portrait&per_page=10` (header `Authorization: Client-ID <key>`)
- `GET https://api.pexels.com/v1/search?query=<termo>&orientation=portrait&per_page=10` (header `Authorization: <key>`)

## Ícones e ilustrações
- Lucide (`https://lucide.dev`), Phosphor (`https://phosphoricons.com`) — SVG, licença livre
- unDraw (`https://undraw.co`) — ilustrações com cor customizável

## Critérios de escolha
1. Combina com a paleta do DNA (cor dominante parecida ou neutra)
2. Tem espaço negativo onde o texto vai entrar
3. ≥ 1080 px no lado menor; nítida; sem marca d'água
4. Diversidade e naturalidade; evitar clichês de banco
5. Sem logos/marcas de terceiros visíveis, sem pessoas reconhecíveis em contexto sensível

## Não usar
Google Imagens, Pinterest, Instagram/TikTok de terceiros, sites de notícias, Freepik
premium/Shutterstock com marca d'água — a menos que o usuário forneça a licença.

## Imagens da marca
Se o cliente tem fotos próprias (produto, equipe, espaço), elas sempre vencem banco de imagens.
Peça ao usuário ou procure no Google Drive conectado, se houver.
