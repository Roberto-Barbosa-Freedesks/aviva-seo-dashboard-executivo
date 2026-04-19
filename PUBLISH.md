# Publicar Dashboard em GitHub Pages

Passo-a-passo para publicar o dashboard de `/dashboard/` no repositorio `IvoireAg/aviva-seo-geo`.

## Pre-requisitos

- Acesso push ao repo `IvoireAg/aviva-seo-geo`.
- Branch `main` com GitHub Pages habilitavel.

## Passo 1 — Copiar para o repo

```bash
# Assumindo que o repo esta clonado em /Users/macbookair/code/aviva-seo-geo
cd /Users/macbookair/code/aviva-seo-geo
git pull origin main

# Copiar pasta dashboard (ou mover — preferencial: seccao separada)
rsync -av --delete \
  /Users/macbookair/Documents/VibeCoding/Aviva-seo/dashboard/ \
  ./dashboard/

git add dashboard/
git commit -m "feat(dashboard): v1 com design system Ivoire (sprint S-2026-09)"
git push origin main
```

## Passo 2 — Habilitar GitHub Pages

No GitHub:
1. Settings → Pages.
2. Source: **Deploy from a branch**.
3. Branch: `main` / folder `/dashboard`.
4. Save.

Aguardar ~1-3 minutos. URL publica: `https://ivoireag.github.io/aviva-seo-geo/`.

## Passo 3 — Validar publicacao

```bash
# Ver status do deploy
gh run list --repo IvoireAg/aviva-seo-geo --limit 5

# Testar URL publica
curl -I https://ivoireag.github.io/aviva-seo-geo/
curl -I https://ivoireag.github.io/aviva-seo-geo/data/snapshot.json
```

Esperado: HTTP 200 em index.html e snapshot.json.

## Passo 4 — Atualizacao continua

A partir da S-2026-10, a cada kickoff/mid-review/close, o orchestrator regenera `dashboard/data/snapshot.json` automaticamente via hook em `generate_control_artifacts.py::run()`. Para refletir no site:

```bash
# Nova sprint aberta (ex: S-2026-10)
python3 ~/.claude/skills/aviva-project-orchestrator/scripts/sprint_kickoff.py \
  --sprint S-2026-10 --force

# Hook regenera automaticamente:
#   /roadmap/control/control-sprint-S-2026-10.xlsx
#   /roadmap/control/control-sprint-S-2026-10.docx
#   /dashboard/data/snapshot.json  ← NOVO

# Commitar snapshot atualizado
cd /Users/macbookair/code/aviva-seo-geo
rsync -av /Users/macbookair/Documents/VibeCoding/Aviva-seo/dashboard/data/ ./dashboard/data/
git add dashboard/data/snapshot.json
git commit -m "chore(dashboard): snapshot S-2026-10 kickoff"
git push origin main
```

## Arquivos que fazem parte da publicacao

| Arquivo | Publicado em GH Pages | Funcao |
|---|---|---|
| `index.html` | sim | pagina principal |
| `styles.css` | sim | estilos |
| `dashboard.js` | sim | bootstrap |
| `ivoire-theme.css` | sim | variaveis CSS |
| `design-tokens.json` | sim (mas robots bloqueia) | tokens |
| `assets/Logotipo-Ivoire.png` | sim | logo |
| `assets/Logotipo-Aviva.png` | sim | logo |
| `data/snapshot.json` | sim (robots bloqueia indexacao) | dados vivos |
| `.nojekyll` | sim (evita Jekyll processing) | — |
| `robots.txt` | sim | controle bots |
| `README.md` | nao renderiza (GH Pages puro) | — |
| `PUBLISH.md` | nao renderiza | — |

## Regras duras aplicadas

- Zero ROI / R$ em qualquer texto visivel.
- Nomenclatura oficial Aviva (Rio Quente Resorts plural, Hot Park, Costa do Sauipe).
- Tom Ivoire.
- Acessibilidade AA+.
- Design system 100% Ivoire (consome design-tokens.json).

## Troubleshooting

- **CSS nao carrega**: confirmar que `.nojekyll` existe no root do `/dashboard/`.
- **Fontes nao aplicam**: checar se Google Fonts nao esta bloqueado pela rede.
- **snapshot.json retorna 404**: confirmar que `/data/snapshot.json` foi commitado.
- **Logos nao aparecem**: checar caminho `/assets/Logotipo-*.png`.
