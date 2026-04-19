# Dashboard Aviva SEO/GEO · Ivoire

Dashboard executivo do projeto Aviva SEO/GEO, publicado em GitHub Pages.

Consome fielmente o design system Ivoire extraído do template institucional `TEMPLATE-Deck-Institucional-Ivoire.pptx` via `ivoire-document-factory` v2.0.

## Estrutura

```
dashboard/
├── index.html                # pagina principal
├── styles.css                # componentes canonicos Ivoire
├── dashboard.js              # bootstrap + populacao dinamica
├── ivoire-theme.css          # variaveis CSS (gerado por design_system_extractor.py)
├── design-tokens.json        # fonte unica do design system
├── assets/
│   ├── Logotipo-Ivoire.png
│   └── Logotipo-Aviva.png
└── data/
    └── snapshot.json         # dados da sprint atual
```

## Design system aplicado

- Paleta Ivoire (`#282828`, `#FFFF02`, cinzas) via variaveis CSS em `ivoire-theme.css`.
- Tipografia: Montserrat (titulos), Arvo (corpo), Bebas Neue (KPIs numericos).
- Grid responsivo: 4 colunas desktop > 2 tablet > 1 mobile.
- Header preto com barra amarela inferior (assinatura Ivoire).
- Logos Ivoire esquerda + Aviva direita.
- Tabelas com header preto, zebra cinza, hover em cinza claro.
- KPI cards com borda amarela esquerda.
- Badges de status em Alta/Media/Baixa com cores canonicas (`#C8102E` / `#FFB400` / `#00873C`).
- Acessibilidade: foco visivel em amarelo, contraste AA+ em todos textos.

## Publicacao em GitHub Pages

1. Copiar a pasta `dashboard/` para o repo `IvoireAg/aviva-seo-geo` (branch `main`).
2. Ativar GitHub Pages em Settings → Pages → Source: branch main, folder `/dashboard`.
3. URL publica: `https://ivoireag.github.io/aviva-seo-geo/`.

## Atualizacao de dados

O arquivo `data/snapshot.json` pode ser regenerado automaticamente pelo orchestrator. Sugestao futura:

```bash
# hook pos-kickoff / midreview / close
python -c "
import json
from pathlib import Path
# ler sprint-plan.md, capacity.md, OKRs
# escrever dashboard/data/snapshot.json
"
```

Enquanto nao tiver o gerador, editar manualmente `snapshot.json` a cada kickoff.

## Regenerar o tema CSS

Se o template institucional Ivoire for atualizado (nova versao do `.pptx`):

```bash
python ~/.claude/skills/ivoire-document-factory/scripts/design_system_extractor.py --refresh
cp ~/.claude/skills/ivoire-document-factory/ivoire-theme.css dashboard/ivoire-theme.css
cp ~/.claude/skills/ivoire-document-factory/design-tokens.json dashboard/design-tokens.json
```

## Componentes documentados

Guia canonico com regras de uso, do/don't e acessibilidade:
`~/.claude/skills/ivoire-document-factory/references/dashboard-design-guidelines.md`

## Regras duras respeitadas

- Zero ROI / R$ / projecao financeira em qualquer texto.
- Nomenclatura oficial Aviva preservada (Rio Quente Resorts plural, Hot Park separado, Costa do Sauipe).
- Hierarquia de dados: GSC (1) > GA4 (2) > Ahrefs (3) > Crawler (4).
- Toda afirmacao factual rastreavel em `aviva-knowledge-guardian` ou `/business-context/`.
