# JMC Tecnologia e Consultoria

Landing page institucional de www.jmctecnologia.com.br. Site estático (HTML, CSS e JS puros, sem build), pronto para o GitHub Pages.

- `index.html`: página inicial
- `blog.html`: blog (em breve)
- `area-do-cliente.html`: área do cliente com canais de suporte (portal em breve)
- `assets/css/styles.css`: estilos; as cores da marca (laranja `#ff9900` e grafite `#404040`) ficam nas variáveis do topo
- `assets/img/`: logotipo (`logo.png`) e ícones
- Domínio próprio: o arquivo `CNAME` (www.jmctecnologia.com.br) entra quando o DNS for apontado para o GitHub Pages

Para visualizar localmente, abra o `index.html` no navegador.

## Publicação e ambiente de teste

O site é publicado pelo GitHub Actions (`.github/workflows/publicar.yml`) na branch `gh-pages`, que o GitHub Pages serve:

- **Teste:** tudo que entra na branch `teste` aparece em `/teste/` (ex.: https://jandercavalcanti.github.io/jmctecnologia/teste/), com um aviso de "Ambiente de teste" no topo e fora dos buscadores.
- **Oficial:** depois de aprovado, o PR entra na `main` e a mudança vai para a raiz do site (e para www.jmctecnologia.com.br quando o domínio estiver apontado).

Configuração única no GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` / `(root)`**.
