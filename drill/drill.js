/* Drill-down universal — Aviva SEO/GEO · Ivoire
 * Le CSV dos anexos publicados no Vercel e renderiza uma tabela
 * interativa (busca, sort, paginação, toggle de colunas, download).
 *
 * Convenção de URL:
 *   /drill/?tipo=issue&id=4xx-page
 *   /drill/?tipo=conteudo&id=striking
 *   /drill/?tipo=offpage&id=backlinks
 *   /drill/?tipo=migracao&id=301
 *   /drill/?tipo=hreflang&id=issues
 *   /drill/?file=issue_4xx-page  (fallback direto pelo filename)
 *
 * Rewrite no vercel.json: /drill/:tipo/:id -> /drill/index.html
 */
"use strict";

// -------------------- Dicionário de anexos --------------------
const REGISTRY = {
  // tipo=issue: id é o slug do site-audit (vindo de _slugify_issue)
  issue: {
    file: (id) => `issue_${id}`,
    title: (id) => `Issue Técnico — ${id.replace(/-/g, " ")}`,
    kicker: "Técnico · Ahrefs Site Audit",
    back: "../#tecnico",
    explainer: `
      <p><strong>O que é:</strong> todas as URLs sinalizadas pelo Ahrefs Site Audit
      (Error ou Warning) para este tipo de issue, com as 3 colunas proprietárias
      Ivoire: <code>recomendacao_ivoire</code>, <code>categoria_ivoire</code> e
      <code>severidade_ivoire</code>.</p>
      <p><strong>Por que importa:</strong> este é o backlog de correção técnica
      priorizável. Cada linha vira um ticket no Dev Aviva (via briefing técnico
      semanal) ou entra no plano de outreach (quando aplicável).</p>
      <p><strong>Como usar:</strong> filtre por <em>severidade</em>, ordene por
      ocorrências e valide com o Guardian antes de subir para o cliente. Siga as
      etapas em <code>recomendacao_ivoire</code> — são plays específicos, não
      genéricos.</p>
    `,
  },
  // tipo=conteudo
  conteudo: {
    file: (id) => {
      const map = {
        striking: "conteudo_striking_distance",
        "striking-distance": "conteudo_striking_distance",
        "ctr-lift": "conteudo_ctr_lift",
        ctr: "conteudo_ctr_lift",
      };
      return map[id] || `conteudo_${id}`;
    },
    title: (id) =>
      id.includes("ctr")
        ? "Conteúdo — CTR-lift (queries com CTR baixo)"
        : "Conteúdo — Striking distance (posições 8–20)",
    kicker: "O3 Conteúdo · GSC últimos 28 dias",
    back: "../#conteudo",
    explainer: `
      <p><strong>O que é:</strong> filtragem tática de queries GSC com alto
      potencial de ganho rápido. <em>Striking distance</em> = queries nas posições
      8–20 com volume de impressões (≥50). <em>CTR-lift</em> = queries em top 10
      com CTR abaixo da mediana do cluster.</p>
      <p><strong>Por que importa:</strong> ganhos aqui são de semanas, não meses.
      Subir posição 12 → 8 em uma query de 2k imp/mês duplica os cliques sem
      precisar de link novo.</p>
      <p><strong>Como usar:</strong> ordene por impressões decrescente. Cada linha
      com <code>cluster</code> preenchido vira pauta priorizada na sprint — o
      briefing de conteúdo já consome este anexo.</p>
    `,
  },
  // tipo=offpage
  offpage: {
    file: (id) => {
      const map = {
        backlinks: "offpage_backlinks_ativos",
        ativos: "offpage_backlinks_ativos",
        anchors: "offpage_anchor_profile",
        "anchor-profile": "offpage_anchor_profile",
      };
      return map[id] || `offpage_${id}`;
    },
    title: (id) =>
      id.includes("anchor")
        ? "Off-page — Perfil de âncoras (BL-021 risk)"
        : "Off-page — Backlinks ativos (dofollow + DR)",
    kicker: "Autoridade · Ahrefs backlinks CSV",
    back: "../#offpage",
    explainer: `
      <p><strong>O que é:</strong> backlinks ativos (não deletados) ou perfil de
      âncoras consolidado do CSV manual mais recente
      (<code>/ahrefs-reports/backlinks/</code>). Zero requests à API Ahrefs —
      apenas ingestão offline.</p>
      <p><strong>Por que importa:</strong> é a evidência de autoridade usada em
      decisões de outreach, disavow e priorização de PR. O framework BL-021
      (Quality / Risk / Competitive) parte daqui.</p>
      <p><strong>Como usar:</strong> filtre tier-1 (DR ≥ 50) para pitches
      editoriais, monitore over-anchor no perfil de âncoras para risco de
      penalidade.</p>
    `,
  },
  // tipo=migracao
  migracao: {
    file: (id) => {
      const map = { "301": "301-audit", redirects: "301-audit", audit: "301-audit" };
      return map[id] || `301-${id}`;
    },
    title: () => "Migração 301 — auditoria de redirects",
    kicker: "O1 Migração · 3 properties (aviva + 2 legados)",
    back: "../#migracao",
    explainer: `
      <p><strong>O que é:</strong> auditoria end-to-end dos redirects dos domínios
      legados (riohotquente.com.br, costadosauipe.com.br) para aviva.com.br.
      Cada linha traz URL origem, status HTTP observado, URL destino final e
      classificação Ivoire.</p>
      <p><strong>Por que importa:</strong> chains longos, loops ou 404 em destino
      matam autoridade que o North Star Q2 precisa absorver (baseline 2026-04-17:
      7%, meta 2026-06-30: ≥70%).</p>
      <p><strong>Como usar:</strong> priorize URLs com inbound traffic GSC e
      broken redirects — são perda direta de equity.</p>
    `,
  },
  // tipo=hreflang
  hreflang: {
    file: () => "hreflang-issues",
    title: () => "Hreflang — issues de internacionalização",
    kicker: "Técnico · Ahrefs Site Audit",
    back: "../#tecnico",
    explainer: `
      <p><strong>O que é:</strong> URLs com problemas de hreflang (missing,
      broken, multi-language para o mesmo locale, conflito canonical).</p>
      <p><strong>Por que importa:</strong> Aviva opera PT-BR canônico. Hreflang
      mal-configurado canibaliza posição ou confunde o Googlebot sobre qual URL
      servir.</p>
      <p><strong>Como usar:</strong> corrija em lote por template (header, footer,
      sitemap XML) — nunca URL a URL.</p>
    `,
  },
};

// -------------------- Utils --------------------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));
const isNumericCol = (values) => {
  let ok = 0, total = 0;
  for (const v of values) {
    if (v === "" || v == null) continue;
    total++;
    const n = Number(String(v).replace(/\./g, "").replace(",", "."));
    if (!Number.isNaN(n) && Number.isFinite(n)) ok++;
  }
  return total > 0 && ok / total >= 0.8;
};

// RFC 4180 parser mínimo (suporta aspas duplas, escape "" e quebras dentro de campo)
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const len = text.length;
  while (i < len) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") { i++; continue; }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 0 && !(r.length === 1 && r[0] === ""));
}

// -------------------- State --------------------
const state = {
  file: null,
  config: null,
  headers: [],
  rows: [],
  filtered: [],
  visibleCols: new Set(),
  sortCol: -1,
  sortDir: 1,
  page: 0,
  pageSize: 50,
  query: "",
};

// -------------------- Boot --------------------
function parseParams() {
  const usp = new URLSearchParams(window.location.search);
  const tipo = usp.get("tipo");
  const id = usp.get("id") || "";
  const file = usp.get("file");
  const from = usp.get("from");
  return { tipo, id, file, from };
}

function resolveConfig({ tipo, id, file }) {
  if (file) {
    return {
      file,
      title: file.replace(/_/g, " ").replace(/-/g, " "),
      kicker: "Anexo CSV",
      back: "../",
      explainer: "<p>Anexo CSV gerado pela engine semanal <code>aviva-seo-geo-engine</code>.</p>",
    };
  }
  const reg = REGISTRY[tipo];
  if (!reg) {
    return null;
  }
  const fname = reg.file(id);
  return {
    file: fname,
    title: reg.title(id),
    kicker: reg.kicker,
    back: reg.back,
    explainer: reg.explainer,
  };
}

async function fetchCsv(filename) {
  const url = `/anexos/latest/${filename}.csv`;
  const resp = await fetch(url, { cache: "default" });
  if (!resp.ok) {
    const err = new Error(
      resp.status === 404
        ? `Anexo indisponível — slug "${filename}" não existe ou publicação semanal ainda não ocorreu. URL tentada: ${url}`
        : `CSV não pôde ser carregado (HTTP ${resp.status}) em ${url}.`
    );
    err.status = resp.status;
    err.url = url;
    throw err;
  }
  return resp.text();
}

async function fetchHistoryDate() {
  try {
    const resp = await fetch("/data/_dates.json", { cache: "no-cache" });
    if (!resp.ok) return null;
    const data = await resp.json();
    return (data.dates || [])[0] || data.latest || null;
  } catch (_) { return null; }
}

async function boot() {
  const params = parseParams();
  const cfg = resolveConfig(params);
  const backEl = $("back-link");
  if (params.from) {
    backEl.href = `../#${params.from}`;
  }

  if (!cfg) {
    renderFatal(
      "Parâmetros inválidos",
      `Use <code>?tipo=issue&amp;id=&lt;slug&gt;</code> ou <code>?file=&lt;nome&gt;</code>.
       Tipos disponíveis: ${Object.keys(REGISTRY).join(", ")}.`
    );
    return;
  }
  state.file = cfg.file;
  state.config = cfg;
  if (cfg.back && !params.from) backEl.href = cfg.back;

  $("drill-title").textContent = cfg.title;
  $("drill-kicker").textContent = cfg.kicker;
  $("drill-source").textContent = `/anexos/latest/${cfg.file}.csv`;
  $("drill-explainer").innerHTML = cfg.explainer;
  document.title = `${cfg.title} — Aviva SEO/GEO · Ivoire`;

  try {
    const [csvText, latestDate] = await Promise.all([
      fetchCsv(cfg.file),
      fetchHistoryDate(),
    ]);
    if (latestDate) $("drill-date").textContent = `snapshot ${latestDate}`;
    loadData(csvText);
    attachHandlers();
  } catch (err) {
    renderFatal("Falha ao carregar CSV", esc(err.message || String(err)));
  }
}

function renderFatal(title, htmlMsg) {
  $("drill-title").textContent = title;
  $("drill-kicker").textContent = "Erro";
  const body = $("drill-tbody");
  // colspan="999" cobre qualquer largura de tabela sem quebrar visualmente.
  body.innerHTML = `<tr><td colspan="999" class="empty">${htmlMsg}</td></tr>`;
  $("drill-empty").hidden = true;
}

function loadData(csvText) {
  const parsed = parseCSV(csvText);
  if (!parsed.length) {
    renderFatal("CSV vazio", "O anexo existe mas não tem linhas.");
    return;
  }
  state.headers = parsed[0].map((h) => String(h).trim());
  state.rows = parsed.slice(1);
  state.visibleCols = new Set(state.headers.map((_, i) => i));
  // Esconder colunas redundantes padrão (ex.: PR quando só tem 1 property)
  hideNoiseCols();
  state.filtered = state.rows.slice();
  $("drill-rows").textContent = fmtNum(state.rows.length);
  renderColsPanel();
  renderHeader();
  renderBody();
}

function hideNoiseCols() {
  const noiseNames = new Set(["No. of all inlinks", "Depth", "First found at"]);
  state.headers.forEach((h, i) => {
    if (noiseNames.has(h)) state.visibleCols.delete(i);
  });
}

function fmtNum(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("pt-BR");
}

function detectNumericCols() {
  const numeric = new Set();
  state.headers.forEach((_, i) => {
    const values = state.rows.slice(0, 200).map((r) => r[i]);
    if (isNumericCol(values)) numeric.add(i);
  });
  return numeric;
}

const NUMERIC_COLS = new WeakMap();
function getNumericCols() {
  if (!NUMERIC_COLS.has(state)) NUMERIC_COLS.set(state, detectNumericCols());
  return NUMERIC_COLS.get(state);
}

// -------------------- Rendering --------------------
function renderHeader() {
  const thead = $("drill-thead");
  const numeric = getNumericCols();
  const cells = state.headers
    .map((h, i) => {
      if (!state.visibleCols.has(i)) return "";
      const isIvoire = /_ivoire$/i.test(h);
      const numCls = numeric.has(i) ? " num" : "";
      const sortCls =
        state.sortCol === i
          ? state.sortDir === 1
            ? " sort-asc"
            : " sort-desc"
          : "";
      const ivCls = isIvoire ? " col-ivoire" : "";
      return `<th class="sortable${numCls}${sortCls}${ivCls}" data-col="${i}"
                  title="Clique para ordenar">${esc(h)}</th>`;
    })
    .join("");
  thead.innerHTML = `<tr>${cells}</tr>`;
}

function renderColsPanel() {
  const panel = $("drill-cols-panel");
  panel.innerHTML = state.headers
    .map((h, i) => {
      const checked = state.visibleCols.has(i) ? " checked" : "";
      return `<label class="col-toggle">
                <input type="checkbox" data-col="${i}"${checked}> ${esc(h)}
              </label>`;
    })
    .join("");
}

function renderBody() {
  const tbody = $("drill-tbody");
  const numeric = getNumericCols();
  const rows = state.filtered;
  const totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  if (state.page >= totalPages) state.page = 0;
  const start = state.page * state.pageSize;
  const slice = rows.slice(start, start + state.pageSize);

  if (!slice.length) {
    tbody.innerHTML = "";
    $("drill-empty").hidden = false;
  } else {
    $("drill-empty").hidden = true;
    tbody.innerHTML = slice
      .map((r) => {
        const cells = state.headers
          .map((h, i) => {
            if (!state.visibleCols.has(i)) return "";
            const val = r[i] ?? "";
            const numCls = numeric.has(i) ? " num" : "";
            const isUrl = /^https?:\/\//i.test(val);
            const inner = isUrl
              ? `<a href="${esc(val)}" target="_blank" rel="noopener noreferrer">${esc(val)}</a>`
              : renderCellValue(h, val);
            return `<td class="${numCls.trim()}">${inner}</td>`;
          })
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");
  }

  // Pager info
  const from = rows.length ? start + 1 : 0;
  const to = Math.min(start + state.pageSize, rows.length);
  $("drill-page-info").textContent = `${fmtNum(from)}–${fmtNum(to)} de ${fmtNum(rows.length)}`;
  $("drill-rows").textContent = fmtNum(rows.length);
  $("btn-prev").disabled = state.page === 0;
  $("btn-next").disabled = state.page >= totalPages - 1;
}

function renderCellValue(header, val) {
  // Badge colorido para severidade/prioridade
  if (/severidade_ivoire|severidade|prioridade/i.test(header)) {
    const v = String(val).toLowerCase();
    const cls =
      /alta|urgent|crítico|critico|vermelh/.test(v) ? "vermelho"
      : /média|media|medio|amarelo/.test(v) ? "amarelo"
      : /baixa|verde/.test(v) ? "verde"
      : "";
    if (cls) return `<span class="badge ${cls}">${esc(val)}</span>`;
  }
  return esc(val);
}

// -------------------- Handlers --------------------
function attachHandlers() {
  $("drill-thead").addEventListener("click", (e) => {
    const th = e.target.closest("th.sortable");
    if (!th) return;
    const col = Number(th.dataset.col);
    if (state.sortCol === col) {
      state.sortDir *= -1;
    } else {
      state.sortCol = col;
      state.sortDir = 1;
    }
    applySort();
    renderHeader();
    renderBody();
  });

  $("drill-cols-panel").addEventListener("change", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    const col = Number(t.dataset.col);
    if (t.checked) state.visibleCols.add(col);
    else state.visibleCols.delete(col);
    renderHeader();
    renderBody();
  });

  $("btn-cols").addEventListener("click", () => {
    const panel = $("drill-cols-panel");
    panel.hidden = !panel.hidden;
  });

  const search = $("drill-search");
  let searchDeb;
  search.addEventListener("input", () => {
    clearTimeout(searchDeb);
    searchDeb = setTimeout(() => {
      state.query = search.value.trim().toLowerCase();
      applyFilter();
      renderBody();
    }, 120);
  });

  $("drill-pagesize").addEventListener("change", (e) => {
    state.pageSize = Number(e.target.value) || 50;
    state.page = 0;
    renderBody();
  });

  $("btn-prev").addEventListener("click", () => {
    if (state.page > 0) { state.page--; renderBody(); }
  });
  $("btn-next").addEventListener("click", () => {
    state.page++; renderBody();
  });

  $("btn-download").addEventListener("click", () => {
    const url = `/anexos/latest/${state.file}.csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.file}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  $("btn-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flashToast("Link copiado.");
    } catch (_) {
      flashToast("Não foi possível copiar — selecione a URL manualmente.");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const p = $("drill-cols-panel");
      if (!p.hidden) p.hidden = true;
    }
    if (e.key === "/" && document.activeElement !== search) {
      e.preventDefault();
      search.focus();
    }
  });
}

function applyFilter() {
  const q = state.query;
  if (!q) {
    state.filtered = state.rows.slice();
  } else {
    state.filtered = state.rows.filter((r) =>
      r.some((v) => String(v).toLowerCase().includes(q))
    );
  }
  state.page = 0;
  applySort();
}

function applySort() {
  if (state.sortCol < 0) return;
  const col = state.sortCol;
  const dir = state.sortDir;
  const numeric = getNumericCols().has(col);
  state.filtered.sort((a, b) => {
    const av = a[col] ?? "";
    const bv = b[col] ?? "";
    if (numeric) {
      const an = Number(String(av).replace(/\./g, "").replace(",", "."));
      const bn = Number(String(bv).replace(/\./g, "").replace(",", "."));
      return (an - bn) * dir;
    }
    return String(av).localeCompare(String(bv), "pt-BR") * dir;
  });
}

let toastTimer;
function flashToast(msg) {
  let el = $("drill-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "drill-toast";
    el.className = "drill-toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

// -------------------- Go --------------------
boot();
