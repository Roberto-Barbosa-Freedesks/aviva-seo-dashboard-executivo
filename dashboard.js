// Dashboard Aviva SEO/GEO — bootstrap vanilla JS
// Consome data/snapshot.json. Sem frameworks — GH Pages friendly.

(async function () {
  let data;
  try {
    const res = await fetch("data/snapshot.json", {cache: "no-store"});
    data = await res.json();
  } catch (e) {
    document.body.innerHTML = '<pre style="padding:2rem;color:#c00;">Erro carregando snapshot.json: ' + esc(String(e)) + '</pre>';
    return;
  }

  // Cada renderX é isolado em try/catch: falha de um campo ausente no
  // snapshot nunca pode impedir o restante do bootstrap (tabs, handlers
  // globais de teclado, busca ⌘K, modo apresentação).
  const steps = [
    ["setupTabs", () => setupTabs()],
    ["renderHeader", () => renderHeader(data)],
    ["renderVisao", () => renderVisao(data)],
    ["renderNorthStar", () => renderNorthStar(data)],
    ["renderMigracao", () => renderMigracao(data)],
    ["renderConteudo", () => renderConteudo(data)],
    ["renderOffpage", () => renderOffpage(data)],
    ["renderTecnico", () => renderTecnico(data)],
    ["renderSprint", () => renderSprint(data)],
    ["renderOkrs", () => renderOkrs(data)],
    ["renderCompetidores", () => renderCompetidores(data)],
    ["renderCalendario", () => renderCalendario(data)],
    ["renderReunioes", () => renderReunioes(data)],
    ["renderAlertas", () => renderAlertas(data)],
    ["setupDrillDown", () => setupDrillDown(data)],
    ["setupTabLinks", () => setupTabLinks()],
    ["setupPrint", () => setupPrint()],
    ["attachDrillLinks", () => attachDrillLinks()],
    ["attachDidacticHelp", () => attachDidacticHelp()],
    ["attachTableIntros", () => attachTableIntros()],
    ["attachPresentationMode", () => attachPresentationMode()],
    ["attachGlobalSearch", () => attachGlobalSearch(data)],
  ];
  for (const [name, fn] of steps) {
    try { fn(); }
    catch (err) { console.error(`[dashboard] falha em ${name}:`, err); }
  }
  try { await loadAnnotations(); }
  catch (err) { console.error("[dashboard] falha em loadAnnotations:", err); }
})();

// ========================== Modo apresentação ==========================
function attachPresentationMode() {
  const btn = document.getElementById("btn-present");
  const badge = document.getElementById("present-badge");
  if (!btn) return;
  let active = false;
  let autoscrollTimer = null;
  const tabs = ["visao", "northstar", "migracao", "conteudo", "offpage", "tecnico", "sprint", "okrs", "competidores", "calendario", "reunioes", "alertas"];

  function toggle() {
    active = !active;
    document.body.classList.toggle("present-mode", active);
    badge.hidden = !active;
    if (active) startAutoscroll();
    else stopAutoscroll();
  }
  function startAutoscroll() {
    stopAutoscroll();
    autoscrollTimer = setInterval(() => {
      const panel = document.querySelector(".tab-panel.active");
      if (!panel) return;
      const maxY = panel.scrollHeight - window.innerHeight;
      if (window.scrollY >= maxY - 20) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.scrollBy({ top: 2, behavior: "auto" });
      }
    }, 80);
  }
  function stopAutoscroll() {
    if (autoscrollTimer) clearInterval(autoscrollTimer);
    autoscrollTimer = null;
  }

  btn.addEventListener("click", toggle);
  document.addEventListener("keydown", (e) => {
    // Guardas: não dispara dentro de input/textarea nem com modal ⌘K aberto
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
    if (CmdK.isOpen()) return;
    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      toggle();
    } else if (active && e.key === "Escape") {
      toggle();
    } else if (active && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      const cur = document.querySelector(".tab.active")?.dataset.tab || "visao";
      const idx = tabs.indexOf(cur);
      const next = tabs[(idx + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      window.activateTab?.(next);
    }
  });
}

// ========================== Busca global ⌘K ==========================
// Estado compartilhado para que outros handlers globais possam consultar
// (ex.: modo apresentação evita disparar enquanto a busca está aberta).
const CmdK = { isOpen: () => !document.getElementById("cmdk-overlay")?.hidden };

function attachGlobalSearch(data) {
  const overlay = document.getElementById("cmdk-overlay");
  const input = document.getElementById("cmdk-input");
  const results = document.getElementById("cmdk-results");
  const btn = document.getElementById("btn-search");
  if (!overlay || !input || !results) return;

  // Garantia defensiva: overlay DEVE começar fechado, mesmo se algum CSS
  // futuro sobrepuser [hidden]. Não remove a regra global [hidden] do CSS,
  // só imuniza contra regressão pontual.
  overlay.hidden = true;

  const index = buildSearchIndex(data);
  let selected = 0;
  let current = [];
  let triggerEl = null; // Para retornar foco ao elemento que abriu o modal

  function open(fromTrigger) {
    triggerEl = fromTrigger || document.activeElement;
    overlay.hidden = false;
    input.value = "";
    render("");
    // Pequeno delay para evitar que o próprio keypress dispare input
    setTimeout(() => input.focus(), 20);
  }
  function close() {
    overlay.hidden = true;
    // Devolve foco ao elemento que disparou a abertura (se ainda existir)
    if (triggerEl && typeof triggerEl.focus === "function" && document.body.contains(triggerEl)) {
      try { triggerEl.focus(); } catch (_) {}
    }
  }
  function render(q) {
    selected = 0;
    current = searchIndex(index, q).slice(0, 30);
    if (!current.length) {
      results.innerHTML = q
        ? `<li class="cmdk-empty">Nada encontrado para "${esc(q)}".</li>`
        : `<li class="cmdk-hint">Digite para buscar em abas, KPIs, queries, URLs, issues, reuniões…</li>`;
      return;
    }
    results.innerHTML = current.map((it, i) => `
      <li class="cmdk-item ${i === 0 ? "active" : ""}" data-idx="${i}" role="option">
        <span class="cmdk-kind">${esc(it.kind)}</span>
        <span class="cmdk-title">${esc(it.title)}</span>
        ${it.subtitle ? `<span class="cmdk-sub">${esc(it.subtitle)}</span>` : ""}
      </li>
    `).join("");
  }
  function activate(idx) {
    const it = current[idx];
    if (!it) return;
    close();
    if (it.action) it.action();
  }
  function moveSel(delta) {
    if (!current.length) return;
    selected = (selected + delta + current.length) % current.length;
    results.querySelectorAll(".cmdk-item").forEach((el, i) => {
      el.classList.toggle("active", i === selected);
    });
    const active = results.querySelector(".cmdk-item.active");
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  btn?.addEventListener("click", (e) => open(e.currentTarget));

  document.addEventListener("keydown", (e) => {
    // Cmd/Ctrl+K abre — funciona mesmo com foco em input (pra permitir o atalho ao sair de um input)
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (overlay.hidden) open();
      else close();
      return;
    }
    if (overlay.hidden) return;
    // Dentro do modal — Esc/Enter/Setas/Tab (focus trap)
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); moveSel(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveSel(-1); }
    else if (e.key === "Enter") { e.preventDefault(); activate(selected); }
    else if (e.key === "Tab") {
      // Focus trap simples: ciclamos apenas input + primeiro item da lista
      e.preventDefault();
      if (document.activeElement === input && current.length) {
        const firstItem = results.querySelector(".cmdk-item.active") || results.querySelector(".cmdk-item");
        if (firstItem) firstItem.focus();
      } else {
        input.focus();
      }
    }
  });

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  input.addEventListener("input", () => render(input.value.trim().toLowerCase()));
  results.addEventListener("click", (e) => {
    const li = e.target.closest(".cmdk-item");
    if (!li) return;
    activate(Number(li.dataset.idx));
  });
}

function buildSearchIndex(data) {
  const idx = [];
  const tabs = [
    ["visao", "Visão Semanal", "KPIs GSC, branded/non-branded, alertas da semana"],
    ["northstar", "North Star Q2", "% cliques orgânicos absorvidos por aviva.com.br"],
    ["migracao", "Migração 301", "Auditoria de redirects e incidentes"],
    ["conteudo", "Conteúdo programático", "Pipeline, velocity, backlog, KW gaps"],
    ["offpage", "Off-page", "Backlinks, âncoras, framework BL-021"],
    ["tecnico", "Técnico", "CWV, Site Audit, crawler"],
    ["sprint", "Sprint", "Capacity, tasks, briefings"],
    ["okrs", "OKRs Q2", "O1 a O4 — KRs trimestrais"],
    ["competidores", "Competidores", "Benchmarks diretos e indiretos"],
    ["calendario", "Calendário", "Próximos eventos e gates"],
    ["reunioes", "Reuniões", "Atas, compromissos, timeline"],
    ["alertas", "Alertas", "Ações prioritárias desta sprint"],
  ];
  tabs.forEach(([id, title, sub]) => {
    idx.push({ kind: "Aba", title, subtitle: sub, key: `${title} ${sub}`.toLowerCase(), action: () => window.activateTab?.(id) });
  });

  (data.kpis_gsc || []).forEach((k) => {
    idx.push({ kind: "KPI", title: k.label, subtitle: `${k.value} (${k.delta || ""})`, key: `${k.label}`.toLowerCase(), action: () => window.activateTab?.("visao") });
  });

  [...(data.gsc_detail?.branded_top5 || []), ...(data.gsc_detail?.nonbranded_top5 || [])].forEach((q) => {
    idx.push({
      kind: "Query GSC", title: q.query || q.keyword,
      subtitle: `${fmtNum(q.clicks)} cliques · pos ${q.position}`,
      key: (q.query || q.keyword || "").toLowerCase(),
      action: () => window.activateTab?.("visao"),
    });
  });

  (data.tecnico?.site_audit_issues || []).forEach((iss) => {
    const slug = slugifyIssue(iss.issue);
    idx.push({
      kind: "Issue técnica", title: iss.issue,
      subtitle: `${fmtNum(iss.count)} ocorrências · ${iss.priority}`,
      key: `${iss.issue}`.toLowerCase(),
      action: () => { window.location.href = `/drill/?tipo=issue&id=${encodeURIComponent(slug)}&from=tecnico`; },
    });
  });

  (data.conteudo?.kw_gaps_top || []).forEach((k) => {
    idx.push({
      kind: "KW gap", title: k.kw,
      subtitle: `${fmtNum(k.impressions_week)} imp · pos ${k.position} · ${k.cluster || "-"}`,
      key: `${k.kw} ${k.cluster}`.toLowerCase(),
      action: () => window.activateTab?.("conteudo"),
    });
  });

  (data.conteudo?.top_score_tasks || []).forEach((t) => {
    idx.push({
      kind: "Task backlog", title: t.titulo || t.id,
      subtitle: `${t.kr} · sev ${t.sev} · score ${t.score}`,
      key: `${t.titulo} ${t.id} ${t.kr}`.toLowerCase(),
      action: () => window.activateTab?.("conteudo"),
    });
  });

  (data.offpage?.top_domains || []).forEach((d) => {
    idx.push({
      kind: "Domínio BL", title: d.domain,
      subtitle: `${fmtNum(d.backlinks)} links · DR ${d.dr} · ${d.tier || ""}`,
      key: (d.domain || "").toLowerCase(),
      action: () => window.activateTab?.("offpage"),
    });
  });

  (data.alertas || []).forEach((a) => {
    idx.push({
      kind: "Alerta", title: a.texto,
      subtitle: a.severidade,
      key: `${a.texto}`.toLowerCase(),
      action: () => window.activateTab?.("alertas"),
    });
  });

  (data.meetings?.items || []).forEach((m) => {
    idx.push({
      kind: "Compromisso", title: m.title || m.titulo,
      subtitle: `${m.owner || ""} · prazo ${m.due || "—"}`,
      key: `${m.title} ${m.titulo} ${m.owner}`.toLowerCase(),
      action: () => window.activateTab?.("reunioes"),
    });
  });

  return idx;
}

function searchIndex(idx, q) {
  if (!q) return idx.slice(0, 12);
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const it of idx) {
    let score = 0;
    for (const t of terms) {
      if (it.key.includes(t)) score += 2;
      else if (it.title.toLowerCase().includes(t)) score += 1;
    }
    if (score > 0) scored.push({ score, it });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.it);
}

// ========================== Didática "O que é / Por que / Como" ==========================
// Dicionário Aviva-specific: match exato no label do KPI.
const DIDATIC = {
  "Cliques": {
    o_que_e: "Cliques orgânicos capturados pelo Google Search Console na janela de 7 dias (aviva + 2 legados consolidados).",
    por_que: "É o resultado final do SEO. Baseline 2026-04-17: 7% no aviva.com.br. Meta 2026-06-30 (KR1.2): ≥70% dos cliques no canônico.",
    como_usar: "Queda >15% WoW sem redeploy = investigar no drill-down da KPI, conferir alertas e incidentes de migração 301.",
  },
  "Impressões": {
    o_que_e: "Quantas vezes URLs Aviva apareceram em resultados do Google (SERP) na janela semanal.",
    por_que: "Impressões mostram alcance potencial. Crescem antes dos cliques em estratégias programáticas bem executadas (O3).",
    como_usar: "Crescimento de impressões + CTR estável = expansão de visibilidade; crescimento sem cliques = verificar posição média ou cluster canibalizado.",
  },
  "CTR": {
    o_que_e: "Click-through-rate médio ponderado: cliques ÷ impressões, GSC consolidado 7 dias.",
    por_que: "CTR abaixo da mediana do cluster indica título/meta fracos ou snippet roubado por concorrente. Fix rápido.",
    como_usar: "Abra o anexo Conteúdo · CTR-lift (drill-down Conteúdo) para a lista priorizada e briefing automático.",
  },
  "Posição": {
    o_que_e: "Posição média ponderada por impressões. Valor menor = melhor (1,0 é topo).",
    por_que: "Movimento 12→8 duplica cliques sem esforço de link; é o quick-win padrão das sprints Ivoire.",
    como_usar: "Conferir anexo Striking-distance (posições 8–20 com volume) e priorizar no sprint ativo.",
  },
  "North Star": {
    o_que_e: "% de cliques orgânicos que o aviva.com.br absorve vs o total (aviva + riohotquente + costadosauipe).",
    por_que: "Indicador único da migração de autoridade Q2 2026. KR1.2 requer ≥70% até 2026-06-30.",
    como_usar: "Ganhos virão de 301 limpos + canônico indexável + conteúdo programático. Ver abas Migração e Conteúdo.",
  },
  "aviva.com.br share": {
    o_que_e: "Share de cliques no domínio canônico dentro do consolidado dos 3 properties GSC.",
    por_que: "Proxy do North Star — meta KR1.2 ≥70% até 2026-06-30.",
    como_usar: "Baseline 2026-04-17: 7%. Todo incremento vem de redirects OK + conteúdo novo no canônico.",
  },
  "Legados share": {
    o_que_e: "% de cliques que ainda caem em riohotquente.com.br e costadosauipe.com.br.",
    por_que: "Tem que cair — é o espelho inverso do North Star. 93% em 2026-04-17.",
    como_usar: "Queda natural com 301 de qualidade. Monitor semanal na aba Migração 301.",
  },
  "Broken pendentes": {
    o_que_e: "Redirects quebrados (loops, 404 em destino, chains longos) no mapa legado → aviva.",
    por_que: "Cada broken redirect mata autoridade que o North Star precisa. Sev 5 — BL-001 é urgência dura.",
    como_usar: "Abra o drill-down Migração 301 e priorize por inbound traffic GSC.",
  },
  "Redirects mapeados": {
    o_que_e: "Total de URLs legadas com mapeamento 1:1 para aviva.com.br definido na migração.",
    por_que: "Cobertura de mapeamento = cobertura da migração. Sem map, cai em 404 ou homepage — perda de equity.",
    como_usar: "Gap de cobertura = pauta de sprint. Drill-down 301-audit mostra URLs sem mapeamento.",
  },
  "Backlinks totais": {
    o_que_e: "Total de links externos ativos apontando para aviva.com.br (Ahrefs CSV manual semanal).",
    por_que: "Estoque de autoridade. Zero consumo API Ahrefs — apenas ingestão de CSV (Regra 11).",
    como_usar: "Abra drill-down Off-page backlinks para lista completa de backlinks ativos com DR e tier.",
  },
  "Ref. domains": {
    o_que_e: "Quantidade de domínios únicos que linkam para aviva.com.br (importa mais que volume bruto).",
    por_que: "Diversidade de fonte é sinal editorial para Google. 1 link de 100 domínios ≫ 100 links de 1 domínio.",
    como_usar: "Cruze com anchor-profile no drill-down Off-page para avaliar risco de over-anchor.",
  },
  "Tier-1 (DR≥50)": {
    o_que_e: "Backlinks de domínios com Domain Rating ≥50 (alta autoridade editorial).",
    por_que: "Tier-1 carrega mais equity e resiste a atualizações de algoritmo.",
    como_usar: "Perfil tier-1 < 15% do total = prioridade de outreach PR/Imprensa. Ver briefing Off-page.",
  },
  "LCP p75": {
    o_que_e: "Largest Contentful Paint no percentil 75 — tempo até o maior elemento renderizar, mobile.",
    por_que: "Core Web Vital direto no ranking. Meta Google: < 2,5s. Aviva referência: < 1,5s.",
    como_usar: "LCP > 2,5s = investigar hero image, LCP resource, font-display. Abrir drill-down por issue técnica.",
  },
  "INP p75": {
    o_que_e: "Interaction to Next Paint p75 — responsividade em ms, mobile.",
    por_que: "Substituiu FID em 2024. Meta < 200ms; alvo Aviva < 150ms.",
    como_usar: "INP alto = JS bloqueante no main thread. Ver aba Técnico e drill-down das issues.",
  },
  "CLS p75": {
    o_que_e: "Cumulative Layout Shift — estabilidade visual (quanto o layout 'pula' durante o load).",
    por_que: "Meta Google: < 0,1. Vital para engajamento e Core Web Vital.",
    como_usar: "Lazy-load sem dimensão reservada é o vilão #1. Checar imagens e ads.",
  },
  "Site Audit issues": {
    o_que_e: "Total de issues técnicas detectadas pelo Ahrefs Site Audit (erros + warnings).",
    por_que: "Backlog técnico. Prioridade Alta (404/4xx/5xx/broken) impacta imediato.",
    como_usar: "Clique em qualquer linha da tabela Top 15 Issues → abre drill-down com todas as URLs afetadas + recomendacao_ivoire numerada.",
  },
  "Issues alta prio": {
    o_que_e: "Subconjunto do Site Audit classificado como 'alta' pela matriz Ivoire (sev ≥ 4): 4xx, 5xx, broken redirects, conteúdo quebrado.",
    por_que: "É a fila imediata de correção técnica. Cada item pode sangrar autoridade para o North Star.",
    como_usar: "Abra o drill-down da linha correspondente — vem com recomendacao_ivoire numerada (plays específicos).",
  },
  "Novos 7d": {
    o_que_e: "Backlinks conquistados nos últimos 7 dias segundo o CSV manual Ahrefs.",
    por_que: "Velocity de link-building; confirma que pautas de PR/conteúdo estão gerando menções.",
    como_usar: "Cruze com calendário de imprensa e pautas programáticas — se cair <5/sem, ativar briefing de outreach.",
  },
  "Páginas auditadas": {
    o_que_e: "Número de URLs rastreadas pelo crawler próprio (Scrapy + Playwright) na rodada atual.",
    por_que: "Cobertura do crawler valida que a tela de Técnico reflete o site inteiro, não amostra.",
    como_usar: "Diferença grande vs rodada anterior = mudança de estrutura (sitemap, redirects em massa). Investigar.",
  },
  "Perf score avg": {
    o_que_e: "Score médio do Lighthouse Performance das páginas auditadas (0–100).",
    por_que: "≥ 90 é o alvo Aviva. Abaixo de 70 é bloqueante para Core Web Vitals.",
    como_usar: "Queda súbita = deploy ruim. Cruze com status HTTP + LCP/INP/CLS na mesma aba.",
  },
  "Response p75": {
    o_que_e: "Tempo de resposta do servidor (TTFB) no percentil 75, em ms.",
    por_que: "TTFB alto mata LCP por definição. Meta Aviva < 500ms; crítico > 1500ms.",
    como_usar: "Se > 1s persistente, escalar para Dev Aviva avaliar cache de edge / CDN / BFF.",
  },
  "Capacity usada": {
    o_que_e: "% de capacity da sprint atual já alocada em tasks comprometidas.",
    por_que: "> 100% = sobrecarga, risco de não entregar. 70–95% = saudável.",
    como_usar: "Mid-review D8 reavalia; se >110%, orchestrator sugere desescopo ou swap de task.",
  },
  "Domínios legados": {
    o_que_e: "Quantidade de domínios ainda migrando para aviva.com.br (riohotquente.com.br + costadosauipe.com.br).",
    por_que: "2 em operação; meta é zerar (100% do tráfego no canônico) até 2026-06-30.",
    como_usar: "Redirects 301 dos 2 legados monitorados na aba Migração 301.",
  },
  "% cumprimento": {
    o_que_e: "Percentual de avanço de um KR específico versus sua meta trimestral.",
    por_que: "Semáforo do OKR. <30% no meio do trimestre = amarelo; <20% no último terço = vermelho.",
    como_usar: "Clique na linha do KR para ver tasks associadas + velocity necessária para fechar.",
  },
};

function attachDidacticHelp() {
  document.querySelectorAll(".ivoire-kpi-card").forEach((card) => {
    const label = card.querySelector(".label");
    if (!label) return;
    const key = label.textContent.trim();
    const help = DIDATIC[key];
    if (!help) return;
    if (card.querySelector(".kpi-help")) return; // idempotente
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kpi-help";
    btn.setAttribute("aria-label", `Ajuda sobre ${key}`);
    btn.textContent = "ⓘ";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePopover(btn, key, help);
    });
    label.appendChild(btn);
  });
}

function togglePopover(anchor, titleText, help) {
  const existing = document.getElementById("kpi-popover");
  if (existing && existing.dataset.owner === titleText) {
    existing.remove();
    return;
  }
  if (existing) existing.remove();
  const pop = document.createElement("div");
  pop.id = "kpi-popover";
  pop.className = "kpi-popover";
  pop.dataset.owner = titleText;
  pop.innerHTML = `
    <div class="kpi-pop-head">
      <strong>${esc(titleText)}</strong>
      <button type="button" class="kpi-pop-close" aria-label="Fechar">×</button>
    </div>
    <dl>
      <dt>O que é</dt><dd>${esc(help.o_que_e)}</dd>
      <dt>Por que importa</dt><dd>${esc(help.por_que)}</dd>
      <dt>Como usar</dt><dd>${esc(help.como_usar)}</dd>
    </dl>
  `;
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const top = r.bottom + window.scrollY + 8;
  const left = Math.min(r.left + window.scrollX, window.innerWidth - 340);
  pop.style.top = `${top}px`;
  pop.style.left = `${Math.max(8, left)}px`;
  pop.querySelector(".kpi-pop-close").addEventListener("click", () => pop.remove());
  // Clique fora fecha
  setTimeout(() => {
    document.addEventListener("click", function onOutside(ev) {
      if (!pop.contains(ev.target) && ev.target !== anchor) {
        pop.remove();
        document.removeEventListener("click", onOutside);
      }
    });
  }, 0);
}

// ========================== Intros didáticas nas tabelas ==========================
const TABLE_INTROS = {
  "tc-issues-tbody":
    "Site Audit Ahrefs — issues agrupadas por tipo. Clique em qualquer linha para abrir o drill-down com todas as URLs afetadas, severidade Ivoire e passos numerados de correção.",
  "op-top-tbody":
    "Top 10 domínios que mais linkam para aviva.com.br. Tier-1 = DR ≥ 50 (alta autoridade editorial). Priorize relacionamento dos Tier-1 com PR/Imprensa.",
  "op-anchors-tbody":
    "Perfil de âncoras — risco de over-anchor quando uma âncora concentra >30% e é exata. Diversificar via outreach temático.",
  "op-gains-tbody":
    "Backlinks conquistados nos últimos 7 dias. Cruze com cronograma editorial e menções à marca na aba Reuniões.",
  "kwgaps-tbody":
    "KW gaps — queries com volume e posição subótima. Cada linha com cluster preenchido já vira pauta priorizada no briefing de conteúdo semanal.",
  "bl-top-tbody":
    "Top 5 tasks do backlog por score (severidade × log10(impressões+10) × peso do cluster). Score é transparente, sem ROI.",
  "mig-incidents":
    "Incidentes recentes da migração 301 — cada um impacta equity. Priorize pela severidade e confirme fechamento no mid-review D8.",
  "mig-kws":
    "Keywords estratégicas monitoradas (volume anual > 40k). Monitor semanal pela GSC das 3 properties.",
};

function attachTableIntros() {
  Object.entries(TABLE_INTROS).forEach(([id, text]) => {
    const tb = document.getElementById(id);
    if (!tb) return;
    const section = tb.closest(".ivoire-section");
    if (!section) return;
    if (section.querySelector(".table-intro")) return;
    const h2 = section.querySelector("h2");
    if (!h2) return;
    const p = document.createElement("p");
    p.className = "table-intro";
    p.textContent = text;
    h2.insertAdjacentElement("afterend", p);
  });
}

// ========================== Drill-down CSV links ==========================
// Adiciona um badge "Ver todos" nas 7 tabelas de anexo que têm CSV
// completo publicado em /anexos/latest/*.csv.
function attachDrillLinks() {
  const links = [
    { tbody: "tc-issues-tbody", tipo: "issue", idFromRow: true, from: "tecnico",
      label: "Abrir drill-down por issue", slugCol: 0 },
    { tbody: "kwgaps-tbody", href: "/drill/?tipo=conteudo&id=striking&from=conteudo",
      label: "Ver todos striking-distance + CTR-lift" },
    { tbody: "op-top-tbody", href: "/drill/?tipo=offpage&id=backlinks&from=offpage",
      label: "Ver todos os backlinks ativos" },
    { tbody: "op-anchors-tbody", href: "/drill/?tipo=offpage&id=anchors&from=offpage",
      label: "Ver perfil completo de âncoras" },
    { tbody: "op-gains-tbody", href: "/drill/?tipo=offpage&id=backlinks&from=offpage",
      label: "Ver todos os backlinks ativos" },
    { tbody: "mig-incidents", href: "/drill/?tipo=migracao&id=301&from=migracao",
      label: "Ver auditoria completa 301" },
    { tbody: "mig-kws", href: "/drill/?tipo=migracao&id=301&from=migracao",
      label: "Ver auditoria completa 301" },
  ];

  links.forEach(cfg => {
    const tb = document.getElementById(cfg.tbody);
    if (!tb) return;
    const section = tb.closest(".ivoire-section");
    if (!section) return;
    // Badge de atalho no header da seção
    const h2 = section.querySelector("h2");
    if (h2 && !h2.querySelector(".drill-link-badge")) {
      const href = cfg.href || buildIssueDrillHref(tb);
      if (href) {
        const a = document.createElement("a");
        a.className = "drill-link-badge";
        a.href = href;
        a.textContent = "Ver todos →";
        a.title = cfg.label;
        h2.appendChild(a);
      }
    }
    // Linha clicável (apenas para tabela de issues, onde cada linha abre um slug diferente)
    if (cfg.idFromRow && cfg.tipo === "issue") {
      tb.classList.add("rows-clickable");
      tb.addEventListener("click", (e) => {
        const tr = e.target.closest("tr");
        if (!tr || !tr.parentElement) return;
        if (e.target.closest("a")) return;
        // Preferência: data-slug persistido no render; fallback: reconstruir do texto
        let slug = tr.dataset.slug;
        if (!slug) {
          const firstCell = tr.cells[0];
          if (!firstCell) return;
          slug = slugifyIssue(firstCell.textContent);
        }
        if (!slug) return;
        const url = `/drill/?tipo=issue&id=${encodeURIComponent(slug)}&from=${cfg.from}`;
        window.location.href = url;
      });
    }
  });
}

function slugifyIssue(text) {
  // Range unicode explícito (U+0300 a U+036F = combining diacritical marks).
  // Normaliza espaços repetidos antes do slug para evitar hífens duplos.
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function buildIssueDrillHref(tbody) {
  const firstRow = tbody.querySelector("tr");
  if (!firstRow) return "/drill/?tipo=issue&id=4xx-page&from=tecnico";
  const slug = firstRow.dataset.slug ||
               slugifyIssue((firstRow.cells[0]?.textContent) || "");
  return `/drill/?tipo=issue&id=${encodeURIComponent(slug || "4xx-page")}&from=tecnico`;
}

function setupPrint() {
  const btn = document.getElementById("btn-print");
  if (btn) btn.addEventListener("click", () => window.print());
}

async function loadAnnotations() {
  const today = new Date().toISOString().slice(0, 10);
  const container = document.getElementById("annotations-list");
  if (!container) return;
  try {
    const res = await fetch("data/annotations/" + today + ".json", {cache: "no-store"});
    if (!res.ok) throw new Error("sem anotações para " + today);
    const list = await res.json();
    container.innerHTML = "";
    list.forEach(a => {
      const el = document.createElement("div");
      el.className = "annotation";
      el.innerHTML = `
        <div class="ann-meta"><strong>${esc(a.author)}</strong> · <time>${esc(a.ts)}</time> · aba <em>${esc(a.tab)}</em></div>
        <div class="ann-body">${esc(a.text)}</div>
      `;
      container.appendChild(el);
    });
    if (!list.length) container.innerHTML = '<p class="empty">Sem anotações hoje.</p>';
  } catch {
    container.innerHTML = '<p class="empty">Sem anotações hoje.</p>';
  }
}

// ========================== utils ==========================
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function fmtNum(n) {
  if (n == null || n === "—") return "—";
  return Number(n).toLocaleString("pt-BR");
}
function fmtPct(v, decimals = 1) {
  if (v == null) return "—";
  return Number(v).toFixed(decimals).replace(".", ",") + "%";
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
  } catch { return iso; }
}
function byId(id) { return document.getElementById(id); }
function setText(id, v) { const e = byId(id); if (e) e.textContent = v ?? "—"; }

// ========================== tabs ==========================
function setupTabs() {
  const tabs = document.querySelectorAll(".ivoire-tabs .tab");
  const panels = document.querySelectorAll(".tab-panel");
  tabs.forEach(t => t.addEventListener("click", () => activate(t.dataset.tab)));
  window.activateTab = activate;

  function activate(name) {
    tabs.forEach(x => x.classList.toggle("active", x.dataset.tab === name));
    panels.forEach(p => p.classList.toggle("active", p.id === "panel-" + name));
    history.replaceState(null, "", "#" + name);
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  // Abrir na hash
  const hash = (location.hash || "").replace("#", "");
  if (hash && document.getElementById("panel-" + hash)) activate(hash);
}

function setupTabLinks() {
  document.querySelectorAll("[data-tab-link]").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      window.activateTab(a.dataset.tabLink);
    });
  });
}

// ========================== header ==========================
function renderHeader(data) {
  setText("hdr-sprint", data.meta?.sprint_id || "—");
  setText("hdr-updated", fmtDateTime(data.meta?.generated_at));
  renderHeaderWidgets(data);
}

function renderHeaderWidgets(data) {
  // North Star
  const ns = data.north_star || {};
  const cur = Number(ns.current_pct ?? 0);
  const target = Number(ns.target_pct ?? 70);
  setText("hdr-ns-cur", `${cur.toFixed(1).replace(".", ",")}%`);
  setText("hdr-ns-meta", `≥${target}% até ${ns.target_date || "2026-06-30"}`);
  const fill = byId("hdr-ns-fill");
  if (fill) {
    const pct = Math.max(0, Math.min(100, (cur / target) * 100));
    fill.style.width = `${pct}%`;
  }
  const nsBtn = byId("hdr-northstar");
  if (nsBtn) nsBtn.addEventListener("click", () => window.activateTab?.("northstar"));

  // Health Score — prioriza snapshot.meta.health_score, senão deriva
  const meta = data.meta || {};
  const derived = deriveHealthScore(data);
  const score = Number(meta.health_score ?? derived);
  setText("hdr-health-val", Math.round(score));
  const dot = byId("hdr-health-dot");
  const healthBtn = byId("hdr-health");
  if (dot) {
    dot.className = "w-health-dot " + (score >= 80 ? "verde" : score >= 60 ? "amarelo" : "vermelho");
  }
  if (healthBtn) {
    healthBtn.addEventListener("click", () => window.activateTab?.("okrs"));
    healthBtn.title = `Health Score ${Math.round(score)}/100 — ` +
      (score >= 80 ? "verde · projeto saudável" : score >= 60 ? "amarelo · monitorar" : "vermelho · ação imediata");
  }
}

function deriveHealthScore(data) {
  // Componentes: alertas vermelhos, capacity da sprint, migracao (broken 301),
  // Core Web Vitals (LCP/INP/CLS) e volume de issues Ahrefs alta prioridade.
  // Campos mapeados contra dashboard/data/snapshot.json real (2026-04-22).
  let s = 100;
  const reds = (data.alertas || []).filter(a => a.severidade === "vermelho").length;
  s -= reds * 6;
  const cap = Number(data.sprint?.capacity_used_pct || 0);
  if (cap > 100) s -= Math.min(10, (cap - 100) * 0.5);
  const broken = Number(data.migracao?.broken_redirects || 0);
  if (broken > 0) s -= Math.min(12, broken * 0.6);
  const lcp = Number(data.tecnico?.lcp_p75 || 0);
  if (lcp > 2500) s -= 10;
  else if (lcp > 1500) s -= 4;
  const inp = Number(data.tecnico?.inp_p75 || 0);
  if (inp > 200) s -= 6;
  const cls = Number(data.tecnico?.cls_p75 || 0);
  if (cls > 0.1) s -= 6;
  const issuesAlta = (data.tecnico?.site_audit_issues || [])
    .filter(i => String(i.priority || "").toLowerCase() === "alta")
    .reduce((sum, i) => sum + Number(i.count || 1), 0);
  if (issuesAlta > 1000) s -= 12;
  else if (issuesAlta > 100) s -= 6;
  return Math.max(0, Math.min(100, Math.round(s)));
}

// ========================== Visão Semanal ==========================
function renderVisao(data) {
  const m = data.meta || {};
  setText("sprint-id", m.sprint_id);
  setText("sprint-window", m.sprint_window);
  setText("generated-at", fmtDateTime(m.generated_at));
  setText("version", m.version);
  const w = m.gsc_window || {};
  setText("gsc-window", w.start ? `${w.start} a ${w.end}` : "—");

  // KPIs
  const kpiGrid = byId("kpi-grid");
  kpiGrid.innerHTML = "";
  (data.kpis_gsc || []).forEach((kpi, idx) => {
    const card = document.createElement("div");
    card.className = "ivoire-kpi-card clickable";
    card.innerHTML = `
      <span class="label">${esc(kpi.label)}</span>
      <span class="value">${esc(kpi.value)}</span>
      <span class="delta ${kpi.direction || "flat"}">${esc(kpi.delta)}</span>
    `;
    card.addEventListener("click", () => openKpiDrill(data, idx));
    kpiGrid.appendChild(card);
  });

  // Branded / Non-branded
  renderKwTable("branded-tbody", data.gsc_detail?.branded_top5 || []);
  renderKwTable("nonbranded-tbody", data.gsc_detail?.nonbranded_top5 || []);

  // Winners / Losers  (placeholder: usa branded+nonbranded, ordena por delta se existir)
  // No snapshot.json atual, os top5 nao trazem delta por query. Mostramos instead top impressions crescendo
  const allKws = [
    ...(data.gsc_detail?.branded_top5 || []),
    ...(data.gsc_detail?.nonbranded_top5 || []),
  ];
  const byClicks = [...allKws].sort((a,b) => (b.clicks||0) - (a.clicks||0));
  renderBulletList("winners-list", byClicks.slice(0, 3).map(k =>
    `${esc(k.query)} — ${fmtNum(k.clicks)} cliques (pos ${k.position})`
  ));
  renderBulletList("losers-list", byClicks.slice(-3).reverse().map(k =>
    `${esc(k.query)} — ${fmtNum(k.clicks)} cliques (pos ${k.position})`
  ));

  // North Star mini
  const ns = data.north_star || {};
  setText("ns-label", ns.label);
  setText("ns-current", fmtPct(ns.current_pct, 1));
  setText("ns-target", "≥ " + ns.target_pct + "%");
  setText("ns-target-date", ns.target_date);
  setText("ns-baseline", ns.baseline_date);
  setText("ns-delta", fmtPct(ns.delta_to_target_pts, 1) + " restantes");
  const pctBar = Math.max(1, Math.round((ns.current_pct / ns.target_pct) * 100));
  const bar = byId("ns-bar"); if (bar) bar.style.width = pctBar + "%";

  // Migração
  setText("aviva-pct", fmtPct(data.migracao?.aviva_share_pct, 1));
  setText("legacy-pct", fmtPct(data.migracao?.legacy_share_pct, 1));
  setText("redirects-total", fmtNum(data.migracao?.redirects_total));
  setText("broken-redirects", fmtNum(data.migracao?.broken_redirects));
}

function renderKwTable(tbodyId, rows) {
  const tb = byId(tbodyId);
  if (!tb) return;
  tb.innerHTML = "";
  if (!rows.length) {
    tb.innerHTML = `<tr><td colspan="5" class="empty">Sem dados GSC disponíveis.</td></tr>`;
    return;
  }
  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="kw">${esc(r.query)}</td>
      <td class="num">${fmtNum(r.clicks)}</td>
      <td class="num">${fmtNum(r.impressions)}</td>
      <td class="num">${fmtPct(r.ctr_pct, 2)}</td>
      <td class="num">${Number(r.position).toFixed(1).replace(".",",")}</td>
    `;
    tb.appendChild(tr);
  });
}

function renderBulletList(ulId, items) {
  const ul = byId(ulId);
  if (!ul) return;
  ul.innerHTML = "";
  (items || []).forEach(txt => {
    const li = document.createElement("li");
    li.innerHTML = esc(txt);
    ul.appendChild(li);
  });
}

// ========================== North Star ==========================
function renderNorthStar(data) {
  const ns = data.north_star || {};
  const proj = ns.projection || {};
  setText("ns-gauge-val", fmtPct(ns.current_pct, 1));
  const w = data.meta?.gsc_window;
  setText("ns-gauge-window", w ? `janela ${w.start} a ${w.end}` : "—");
  setText("ns-h-baseline", ns.baseline_pct + "% em " + ns.baseline_date);
  setText("ns-h-target", ns.target_pct + "% em " + ns.target_date);
  setText("ns-h-gap", fmtPct(ns.delta_to_target_pts, 1) + " pp");
  setText("ns-h-pace", (proj.avg_weekly_delta_pp ?? 0).toFixed(2).replace(".",",") + " pp/semana");
  setText("ns-h-eta", proj.weeks_to_target_linear == null ? "sem ritmo positivo" : proj.weeks_to_target_linear + " semanas");
  setText("ns-h-proj", fmtPct(proj.linear_pct_2026_06_30 ?? ns.current_pct, 1));

  // Gauge
  byId("ns-gauge").innerHTML = renderGaugeSVG(ns.current_pct, ns.target_pct);

  // Timeseries
  byId("ns-timeseries").innerHTML = renderTimeseriesSVG(ns.timeseries || [], ns.target_pct, proj);

  // Storytelling
  const story = ns.storytelling || {};
  setText("ns-story-what", story.what_is);
  renderBulletList("ns-story-why", story.why_chosen);
  renderBulletList("ns-story-how", story.how_tracked);
  renderBulletList("ns-story-advances", story.recent_advances);
  renderBulletList("ns-story-next", story.next_activities);
  renderBulletList("ns-story-risks", story.risks);

  // Cenários
  const paceRealista = proj.avg_weekly_delta_pp ?? 0;
  const weeksRemain = ns.weeks_to_target ?? 0;
  const scP = ns.current_pct + Math.max(0, paceRealista * weeksRemain * 0.5);
  const scR = proj.linear_pct_2026_06_30 ?? ns.current_pct;
  const scO = Math.min(ns.target_pct + 5, ns.current_pct + Math.max(0, paceRealista * weeksRemain * 1.3));
  setText("sc-pess", fmtPct(scP, 1));
  setText("sc-real", fmtPct(scR, 1));
  setText("sc-otim", fmtPct(scO, 1));
}

function renderGaugeSVG(current, target) {
  const pct = Math.max(0, Math.min(100, (current / target) * 100));
  const R = 120, cx = 140, cy = 140;
  const start = Math.PI;  // 180deg
  const end = 2 * Math.PI;  // 360deg (semi-circulo superior)
  // Arco preenchido proporcional
  const fillAngle = start + (end - start) * (pct / 100);
  const x1 = cx + R * Math.cos(start);
  const y1 = cy + R * Math.sin(start);
  const x2 = cx + R * Math.cos(fillAngle);
  const y2 = cy + R * Math.sin(fillAngle);
  const largeArc = (fillAngle - start) > Math.PI ? 1 : 0;
  const bgEndX = cx + R * Math.cos(end);
  const bgEndY = cy + R * Math.sin(end);
  const needleAngle = start + (end - start) * (pct / 100);
  const nx = cx + (R - 20) * Math.cos(needleAngle);
  const ny = cy + (R - 20) * Math.sin(needleAngle);
  return `
    <svg viewBox="0 0 280 160" class="gauge-svg" aria-label="Gauge North Star">
      <path d="M ${x1} ${y1} A ${R} ${R} 0 1 1 ${bgEndX} ${bgEndY}"
            fill="none" stroke="#222" stroke-width="22" />
      <path d="M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}"
            fill="none" stroke="#FFFF02" stroke-width="22" stroke-linecap="round" />
      <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}"
            stroke="#FFFF02" stroke-width="4" stroke-linecap="round" />
      <circle cx="${cx}" cy="${cy}" r="8" fill="#282828" stroke="#FFFF02" stroke-width="3" />
      <text x="${cx - R - 8}" y="${cy + 20}" fill="#999" font-size="11" font-family="Montserrat">0%</text>
      <text x="${cx + R - 28}" y="${cy + 20}" fill="#999" font-size="11" font-family="Montserrat">${target}%</text>
    </svg>
  `;
}

function renderTimeseriesSVG(points, target, proj) {
  if (!points.length) return '<p class="empty">Sem histórico disponível para série temporal.</p>';
  const W = 900, H = 280, padL = 50, padR = 20, padT = 20, padB = 40;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxY = Math.max(target + 5, ...points.map(p => p.aviva_share_pct || 0));
  const xs = points.map((_, i) => padL + (i * innerW / Math.max(1, points.length - 1)));
  const ys = points.map(p => padT + innerH * (1 - (p.aviva_share_pct || 0) / maxY));
  const pathD = xs.map((x, i) => (i ? "L" : "M") + x + " " + ys[i]).join(" ");

  // Projecao: do ultimo ponto ate 2026-06-30 — assumimos sprint_end deltas
  const projPct = proj.linear_pct_2026_06_30;
  const yTarget = padT + innerH * (1 - target / maxY);
  // Linha projecao: do ultimo ponto ate extremidade direita (extrapolando mais 6 semanas)
  let projPath = "";
  if (projPct != null && points.length) {
    const lastX = xs[xs.length - 1];
    const lastY = ys[ys.length - 1];
    const endX = W - padR;
    const endY = padT + innerH * (1 - projPct / maxY);
    projPath = `<path d="M ${lastX} ${lastY} L ${endX} ${endY}"
                       stroke="#FFFF02" stroke-width="2" stroke-dasharray="6 4" fill="none"/>`;
  }

  // Eixos yticks (0, 20%, 40%, 60%, target)
  const yticks = [0, 20, 40, 60, target];
  const yticksSVG = yticks.map(v => {
    const y = padT + innerH * (1 - v / maxY);
    return `<g>
      <line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#eee" stroke-width="1"/>
      <text x="${padL-6}" y="${y+3}" fill="#999" font-size="10" text-anchor="end">${v}%</text>
    </g>`;
  }).join("");

  // X ticks (datas cada 2 pontos)
  const xticksSVG = points.map((p, i) => {
    if (i % 2 !== 0 && i !== points.length - 1) return "";
    return `<text x="${xs[i]}" y="${H - 12}" fill="#999" font-size="10" text-anchor="middle"
                 transform="rotate(-30 ${xs[i]} ${H-12})">${p.week_end.slice(5)}</text>`;
  }).join("");

  // Points dots
  const dots = xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="3" fill="#282828"/>`).join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" class="ts-svg" aria-label="Série temporal North Star">
      ${yticksSVG}
      <line x1="${padL}" y1="${yTarget}" x2="${W-padR}" y2="${yTarget}"
            stroke="#4CAF50" stroke-width="2" stroke-dasharray="4 4"/>
      <text x="${W-padR-8}" y="${yTarget-5}" fill="#4CAF50" font-size="11" text-anchor="end" font-weight="700">Meta ${target}%</text>
      <path d="${pathD}" stroke="#FFFF02" stroke-width="3" fill="none"/>
      ${projPath}
      ${dots}
      ${xticksSVG}
    </svg>
  `;
}

// ========================== Migração ==========================
function renderMigracao(data) {
  const m = data.migracao || {};
  setText("m-rtotal", fmtNum(m.redirects_total));
  setText("m-broken", fmtNum(m.broken_redirects));
  setText("m-aviva", fmtPct(m.aviva_share_pct, 1));
  setText("m-legacy", fmtPct(m.legacy_share_pct, 1));
  const deltaPts = (m.aviva_share_pct || 0) - (m.baseline_pct || 7);
  setText("m-aviva-delta", `${deltaPts >= 0 ? "+" : ""}${deltaPts.toFixed(1).replace(".",",")}pp vs baseline`);

  // Bar chart status
  const bars = byId("redirects-bars");
  bars.innerHTML = "";
  const total = (m.redirects_status || []).reduce((s, r) => s + r.count, 0) || 1;
  const colors = {"200":"#4CAF50","301":"#FFC107","404":"#E53935","5xx":"#9C27B0"};
  (m.redirects_status || []).forEach(r => {
    const w = (r.count / total) * 100;
    bars.insertAdjacentHTML("beforeend", `
      <div class="bar-row">
        <span class="bar-label">${esc(r.status)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${w}%;background:${colors[r.status]||"#888"}"></span></span>
        <span class="bar-count">${fmtNum(r.count)}</span>
      </div>
    `);
  });

  // Incidents
  const tb = byId("mig-incidents");
  tb.innerHTML = "";
  (m.recent_incidents || []).forEach(i => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${esc(i.date)}</td><td>${esc(i.desc)}</td><td><span class="badge amarelo">${esc(i.status)}</span></td>`;
    tb.appendChild(tr);
  });

  // Keywords estratégicas
  const kwtb = byId("mig-kws");
  kwtb.innerHTML = "";
  (m.keywords_strategic || []).forEach(k => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>${esc(k.kw)}</strong></td><td class="num">${fmtNum(k.volume_anual)}</td><td><code>${esc(k.property)}</code></td><td><span class="badge verde">${esc(k.status_monitor)}</span></td>`;
    kwtb.appendChild(tr);
  });
}

// ========================== Conteúdo ==========================
function renderConteudo(data) {
  const c = data.conteudo || {};
  const pg = byId("pipeline-grid");
  if (pg) {
    pg.innerHTML = "";
    (c.pipeline || []).forEach(p => {
      pg.insertAdjacentHTML("beforeend", `
        <div class="pipe-stage">
          <div class="ps-label">${esc(p.stage)}</div>
          <div class="ps-value">${fmtNum(p.count)}</div>
        </div>
      `);
    });
  }

  const v = c.velocity_goal || {};
  const pctQ = v.target_quarter ? Math.round(v.published_quarter / v.target_quarter * 100) : 0;
  const vel = byId("velocity-card");
  if (vel) vel.innerHTML = `
    <div class="vel-row"><span>Meta trimestral (KR3.1)</span><strong>${fmtNum(v.target_quarter)} páginas até ${esc(v.sla_quarter)}</strong></div>
    <div class="vel-row"><span>Meta por sprint</span><strong>${fmtNum(v.target_per_sprint)} páginas / 15 dias</strong></div>
    <div class="vel-row"><span>Publicadas no trimestre</span><strong>${fmtNum(v.published_quarter)}</strong></div>
    <div class="vel-track"><span class="vel-fill" style="width:${pctQ}%"></span><span class="vel-pct">${pctQ}%</span></div>
  `;

  // Backlog by cluster
  const clTb = byId("bl-cluster-tbody");
  if (clTb) {
    clTb.innerHTML = "";
    (c.backlog_by_cluster || []).forEach(r => {
      clTb.insertAdjacentHTML("beforeend",
        `<tr><td><strong>${esc(r.cluster)}</strong></td><td class="num">${fmtNum(r.count)}</td></tr>`);
    });
  }

  // Backlog by KR
  const krTb = byId("bl-kr-tbody");
  if (krTb) {
    krTb.innerHTML = "";
    (c.backlog_by_kr || []).forEach(r => {
      krTb.insertAdjacentHTML("beforeend",
        `<tr><td class="kr-id">${esc(r.kr)}</td><td class="num">${fmtNum(r.count)}</td></tr>`);
    });
  }

  // Top 5 priority tasks
  const tpTb = byId("bl-top-tbody");
  if (tpTb) {
    tpTb.innerHTML = "";
    (c.top_score_tasks || []).forEach(t => {
      const sev = parseInt(t.sev || "0");
      const sevClass = sev >= 5 ? "sev-5" : sev === 4 ? "sev-4" : "sev-3";
      tpTb.insertAdjacentHTML("beforeend",
        `<tr><td class="kr-id">${esc(t.id)}</td><td>${esc(t.titulo)}</td>
         <td>${esc(t.kr)}</td><td class="num ${sevClass}">${esc(t.sev)}</td>
         <td class="num">${esc(t.score)}</td><td>${esc(t.sla)}</td></tr>`);
    });
  }
  setText("bl-total", fmtNum(c.backlog_total_items));
  setText("bl-score", c.backlog_score_total);

  // KW gaps
  const tb = byId("kwgaps-tbody");
  if (tb) {
    tb.innerHTML = "";
    (c.kw_gaps_top || []).forEach(k => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${esc(k.kw)}</strong></td>
        <td class="num">${k.impressions_week == null ? "—" : fmtNum(k.impressions_week)}</td>
        <td class="num">${k.position == null ? "—" : Number(k.position).toFixed(1).replace(".",",")}</td>
        <td><em>${esc(k.cluster || "-")}</em></td>
        <td>${esc(k.acao || "—")}</td>
      `;
      tb.appendChild(tr);
    });
  }
}

// ========================== Off-page ==========================
function renderOffpage(data) {
  const o = data.offpage || {};
  setText("op-srcdate", o.source_date || "—");
  setText("op-bl", fmtNum(o.backlinks_total));
  const ratio = o.backlinks_total ? Math.round((o.dofollow_backlinks || 0) / o.backlinks_total * 100) : 0;
  setText("op-bl-follow", `${ratio}% dofollow`);
  setText("op-rd", fmtNum(o.refdomains_total));
  setText("op-avgdr", `DR avg ${o.avg_dr ?? "—"}`);
  setText("op-new", fmtNum(o.new_7d));
  setText("op-tier1", fmtNum(o.tier1_count));
  const tier1pct = o.backlinks_total ? Math.round((o.tier1_count || 0) / o.backlinks_total * 100) : 0;
  setText("op-tier1-pct", `${tier1pct}% do perfil`);

  // DR distribution
  const bars = byId("op-dr-bars");
  if (bars) {
    bars.innerHTML = "";
    const dr = o.dr_distribution || {};
    const total = Object.values(dr).reduce((s, v) => s + v, 0) || 1;
    const colors = {"0-20": "#E53935", "21-40": "#FF9800", "41-60": "#FFC107", "61-80": "#4CAF50", "81-100": "#2E7D32"};
    Object.entries(dr).forEach(([range, count]) => {
      const w = (count / total) * 100;
      bars.insertAdjacentHTML("beforeend", `
        <div class="bar-row">
          <span class="bar-label">DR ${esc(range)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${w}%;background:${colors[range] || "#888"}"></span></span>
          <span class="bar-count">${fmtNum(count)}</span>
        </div>
      `);
    });
  }

  // Composição (dofollow/nofollow, text/image, tiers)
  const totalBL = o.backlinks_total || 1;
  const setFill = (id, val, tot) => {
    const el = byId(id);
    if (el) el.style.width = Math.max(2, (val / tot * 100)) + "%";
  };
  setFill("op-dof-fill", o.dofollow_backlinks || 0, totalBL);
  setFill("op-nof-fill", o.nofollow_backlinks || 0, totalBL);
  setText("op-dof-c", fmtNum(o.dofollow_backlinks));
  setText("op-nof-c", fmtNum(o.nofollow_backlinks));
  setFill("op-txt-fill", o.text_links || 0, totalBL);
  setFill("op-img-fill", o.image_links || 0, totalBL);
  setText("op-txt-c", fmtNum(o.text_links));
  setText("op-img-c", fmtNum(o.image_links));
  setFill("op-t1-fill", o.tier1_count || 0, totalBL);
  setFill("op-t2-fill", o.tier2_count || 0, totalBL);
  setFill("op-t3-fill", o.tier3_count || 0, totalBL);
  setText("op-t1-c", fmtNum(o.tier1_count));
  setText("op-t2-c", fmtNum(o.tier2_count));
  setText("op-t3-c", fmtNum(o.tier3_count));

  // Top linking domains
  const topTb = byId("op-top-tbody");
  if (topTb) {
    topTb.innerHTML = "";
    (o.top_linking_domains || []).forEach(d => {
      const tier = d.dr >= 50 ? "verde" : d.dr >= 25 ? "amarelo" : "vermelho";
      const tierL = d.dr >= 50 ? "Tier-1" : d.dr >= 25 ? "Tier-2" : "Tier-3";
      topTb.insertAdjacentHTML("beforeend",
        `<tr><td><code>${esc(d.domain)}</code></td><td class="num">${fmtNum(d.backlinks)}</td>
         <td class="num">${d.dr}</td><td><span class="badge ${tier}">${tierL}</span></td></tr>`);
    });
  }

  // Top anchors
  const anTb = byId("op-anchors-tbody");
  if (anTb) {
    anTb.innerHTML = "";
    (o.anchor_top10 || []).forEach(a => {
      anTb.insertAdjacentHTML("beforeend",
        `<tr><td>"${esc(a.anchor)}"</td><td class="num">${fmtNum(a.count)}</td></tr>`);
    });
  }

  // Recent gains
  const gnTb = byId("op-gains-tbody");
  if (gnTb) {
    gnTb.innerHTML = "";
    (o.recent_gains || []).forEach(g => {
      gnTb.insertAdjacentHTML("beforeend",
        `<tr><td><code>${esc(g.domain)}</code></td><td class="num">${g.dr}</td>
         <td>${esc(g.date)}</td><td>${esc(g.anchor)}</td></tr>`);
    });
    if (!(o.recent_gains || []).length) {
      gnTb.innerHTML = `<tr><td colspan="4" class="empty">Sem ganhos nos últimos 7 dias.</td></tr>`;
    }
  }

  // Framework summary
  setText("bl-t1-quality", fmtNum(o.tier1_count));
  setText("bl-dof-ratio", ratio + "% dofollow");
}

// ========================== Técnico ==========================
function renderTecnico(data) {
  const t = data.tecnico || {};
  setText("tc-lcp", t.lcp_p75 == null ? "—" : fmtNum(t.lcp_p75));
  setText("tc-inp", t.inp_p75 == null ? "—" : fmtNum(t.inp_p75));
  setText("tc-cls", t.cls_p75 == null ? "—" : String(t.cls_p75).replace(".",","));
  setText("tc-score", t.score_avg == null ? "—" : fmtNum(t.score_avg));
  setText("tc-samples-delta", t.samples ? `${t.samples} URLs testadas` : "aguardando rodada semanal");
  setText("tc-srcdir", "/reports/" + (t.source_date || "—") + "/");
  setText("tc-crawlerdate", t.crawler_source_date || "—");
  setText("tc-ahrefsdate", t.ahrefs_source_date || "—");
  setText("tc-pages", fmtNum(t.pages_audited));
  setText("tc-rt", t.response_ms_p75 ? fmtNum(t.response_ms_p75) : "—");
  const rtOK = t.response_ms_p75 && t.response_ms_p75 <= 3000;
  const rtEl = byId("tc-rt-status");
  if (rtEl) {
    rtEl.textContent = t.response_ms_p75 ? (rtOK ? "ms · dentro do threshold" : "ms · acima de 3000ms (atenção)") : "—";
    rtEl.className = "delta " + (rtOK ? "up" : "down");
  }
  setText("tc-issues-total", fmtNum(t.top_issues_count));
  const alta = (t.site_audit_issues || []).filter(i => i.priority === "alta")
                                           .reduce((s, i) => s + (i.count || 0), 0);
  setText("tc-issues-alta", fmtNum(alta));

  // Status HTTP bars
  const bars = byId("tc-status-bars");
  if (bars) {
    bars.innerHTML = "";
    const dist = t.status_distribution || {};
    const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1;
    const color = (s) => {
      if (s === "200") return "#4CAF50";
      if (s.startsWith("3")) return "#FFC107";
      if (s.startsWith("4")) return "#E53935";
      if (s.startsWith("5")) return "#9C27B0";
      return "#888";
    };
    Object.entries(dist).sort().forEach(([st, c]) => {
      const w = (c / total) * 100;
      bars.insertAdjacentHTML("beforeend", `
        <div class="bar-row">
          <span class="bar-label">HTTP ${esc(st)}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${w}%;background:${color(st)}"></span></span>
          <span class="bar-count">${fmtNum(c)}</span>
        </div>
      `);
    });
  }

  // Issues table — persistimos o slug no data-slug do <tr> para que o
  // handler de clique não precise reconstruir a partir do textContent
  // (evita erros por espaços/quebras extras).
  const tb = byId("tc-issues-tbody");
  if (tb) {
    tb.innerHTML = "";
    (t.site_audit_issues || []).forEach(iss => {
      const cls = iss.priority === "alta" ? "vermelho" : iss.priority === "media" ? "amarelo" : "verde";
      const slug = slugifyIssue(iss.issue);
      tb.insertAdjacentHTML("beforeend",
        `<tr data-slug="${esc(slug)}" data-issue="${esc(iss.issue)}">
           <td>${esc(iss.issue)}</td>
           <td class="num">${fmtNum(iss.count)}</td>
           <td><span class="badge ${cls}">${esc(iss.priority)}</span></td>
           <td><code>${esc(iss.file)}</code></td>
         </tr>`);
    });
    if (!(t.site_audit_issues || []).length) {
      tb.innerHTML = `<tr><td colspan="4" class="empty">Nenhum issue crítico detectado.</td></tr>`;
    }
  }
}

// ========================== Sprint ==========================
// ========================== Owners grid (Camada F) ==========================
// Agrupa sprint_tasks[].responsavel nos 6 buckets canônicos.
const OWNER_BUCKETS = [
  { key: "dev-aviva", label: "Dev Aviva", icon: "🛠", match: /(dev|tech|técnico|tecnico).*aviva|aviva.*(dev|tech|técnico|tecnico)/i },
  { key: "ivoire-seo", label: "Ivoire SEO / Análise", icon: "📊", match: /analista.*ivoire|ivoire.*(analista|seo|dados)|orchestrator/i },
  { key: "ivoire-conteudo", label: "Ivoire Conteúdo", icon: "✍", match: /redator|redação|redacao|conte(ú|u)do.*ivoire|ivoire.*conte(ú|u)do/i },
  { key: "ivoire-pr", label: "Ivoire PR / Imprensa", icon: "📣", match: /pr.*ivoire|ivoire.*pr|imprensa.*ivoire|ivoire.*imprensa|assessoria/i },
  { key: "aviva-digital", label: "Aviva Digital / Criação", icon: "🎨", match: /cria(ç|c)ão.*aviva|aviva.*cria(ç|c)ão|aviva.*digital|digital.*aviva|imprensa.*aviva|social.*aviva/i },
  { key: "compartilhado", label: "Compartilhado / Cliente", icon: "🤝", match: /beto|aviva.*\+|cliente|follow(\s|-)?up|aviva$/i },
];

function bucketizeOwner(resp) {
  const s = String(resp || "").toLowerCase();
  for (const b of OWNER_BUCKETS) {
    if (b.match.test(s)) return b.key;
  }
  return "outros";
}

function renderOwnersGrid(tasks) {
  const grid = byId("owners-grid");
  if (!grid) return;
  const groups = {};
  OWNER_BUCKETS.forEach(b => groups[b.key] = []);
  groups.outros = [];

  tasks.forEach(t => {
    const k = bucketizeOwner(t.responsavel);
    (groups[k] || groups.outros).push(t);
  });

  const buckets = [...OWNER_BUCKETS];
  if (groups.outros.length) buckets.push({ key: "outros", label: "Outros", icon: "·" });

  grid.innerHTML = buckets.map(b => {
    const items = groups[b.key] || [];
    const lateCount = items.filter(t => isTaskLate(t)).length;
    if (!items.length) return "";
    const itemsHtml = items.slice(0, 6).map(t => {
      const sevClass = t.sev >= 5 ? "sev-5" : t.sev === 4 ? "sev-4" : "sev-3";
      const late = isTaskLate(t) ? ' <span class="owner-late-mark" title="SLA vencido">⏰</span>' : "";
      const status = t.status ? ` · <em>${esc(t.status)}</em>` : "";
      return `<li>
        <span class="owner-task-sev ${sevClass}">${esc(t.sev)}</span>
        <span class="owner-task-title">${esc(t.titulo)}${late}</span>
        <span class="owner-task-meta">${esc(t.kr)} · SLA ${esc(t.sla)}${status}</span>
      </li>`;
    }).join("");
    const more = items.length > 6 ? `<li class="owner-more">+${items.length - 6} outras tasks</li>` : "";
    const lateBadge = lateCount ? `<span class="owner-late">${lateCount} atrasada(s)</span>` : "";
    return `<div class="owner-card" data-bucket="${b.key}">
      <div class="owner-head">
        <span class="owner-icon">${b.icon}</span>
        <strong class="owner-label">${esc(b.label)}</strong>
        <span class="owner-count">${items.length}</span>
        ${lateBadge}
      </div>
      <ul class="owner-tasks">${itemsHtml}${more}</ul>
    </div>`;
  }).join("");
}

function isTaskLate(t) {
  if (!t.sla) return false;
  const done = /concluíd|concluid|done|fechad|encerrad/i.test(t.status || "");
  if (done) return false;
  const d = new Date(t.sla + "T23:59:59");
  return !Number.isNaN(d.getTime()) && d < new Date();
}

function renderSprint(data) {
  const s = data.sprint || {};
  setText("sp-id", s.id);
  setText("sp-window", (s.start || "—") + " a " + (s.end || "—"));
  setText("sp-next-gate", (s.next_gate?.mid_review || "—") + " mid-review · " + (s.next_gate?.close || "—") + " close");
  setText("sp-cap", (s.capacity_used_pct || 0) + "%");
  setText("sp-cap-status", s.capacity_status || "—");
  setText("sp-days", s.dias_uteis || "—");
  setText("sp-briefs", fmtNum(s.briefings_emitidos));
  setText("sp-dec", fmtNum(s.decisions_count));

  // Capacity table
  const cap = byId("sp-cap-tbody");
  cap.innerHTML = "";
  (s.capacity_rows || []).forEach(r => {
    const tr = document.createElement("tr");
    const cls = r.capacity_pct > 100 ? "vermelho" : r.capacity_pct >= 90 ? "amarelo" : "verde";
    tr.innerHTML = `<td>${esc(r.papel)}</td><td class="num">${r.capacity_pct}%</td><td><span class="badge ${cls}">${r.capacity_pct > 100 ? "sobrecarga" : r.capacity_pct >= 90 ? "atenção" : "ok"}</span></td>`;
    cap.appendChild(tr);
  });

  // Tarefas por responsável (grupos canônicos)
  renderOwnersGrid(data.sprint_tasks || []);

  // Tasks table (all tasks da sprint)
  const tb = byId("tasks-tbody");
  tb.innerHTML = "";
  (data.sprint_tasks || []).forEach(t => {
    const tr = document.createElement("tr");
    const sevClass = t.sev >= 5 ? "sev-5" : t.sev === 4 ? "sev-4" : "sev-3";
    tr.innerHTML = `
      <td class="kr-id">${esc(t.id)}</td>
      <td>${esc(t.titulo)}</td>
      <td>${esc(t.kr)}</td>
      <td class="num ${sevClass}">${t.sev}</td>
      <td>${esc(t.responsavel)}</td>
      <td>${esc(t.sla)}</td>
      <td>${esc(t.status)}</td>
    `;
    tb.appendChild(tr);
  });

  // Briefings
  const bt = byId("sp-briefs-tbody");
  bt.innerHTML = "";
  (s.briefings_detail || []).forEach(b => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${esc(b.date)}</td><td><strong>${esc(b.team)}</strong></td><td>${esc(b.slug)}</td>`;
    bt.appendChild(tr);
  });
}

// ========================== OKRs ==========================
function renderOkrs(data) {
  const tb = byId("kr-tbody");
  tb.innerHTML = "";
  (data.krs || []).forEach(kr => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="kr-id">${esc(kr.id)}</td>
      <td>${esc(kr.objetivo)}</td>
      <td>${esc(kr.descricao)}</td>
      <td class="num">${fmtNum(kr.tasks_ativas)}</td>
      <td><span class="badge ${esc(kr.status)}">${esc(kr.status)}</span></td>
      <td class="narr">${esc(kr.narrativa || "")}</td>
    `;
    tb.appendChild(tr);
  });
}

// ========================== Competidores ==========================
function renderCompetidores(data) {
  const tb = byId("comp-tbody");
  if (!tb) return;
  tb.innerHTML = "";
  (data.competidores || []).forEach(c => {
    const pClass = c.prioridade === "critica" ? "vermelho" :
                   c.prioridade === "alta" ? "amarelo" :
                   c.prioridade === "media" ? "amarelo" : "verde";
    const sClass = c.status === "alerta" ? "vermelho" :
                   c.status === "atencao" ? "amarelo" :
                   c.status === "migracao ativa" ? "amarelo" : "verde";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${esc(c.name)}</strong></td>
      <td><code>${esc(c.domain)}</code></td>
      <td class="num">${esc(c.dr_est)}</td>
      <td>${esc(c.traffic_cluster)}</td>
      <td>${esc(c.gap)}</td>
      <td>${esc(c.oportunidade)}</td>
      <td><span class="badge ${sClass}">${esc(c.status)}</span></td>
      <td><span class="badge ${pClass}">${esc(c.prioridade)}</span></td>
    `;
    tb.appendChild(tr);
  });
}

// ========================== Calendário ==========================
function renderCalendario(data) {
  const tb = byId("cal-tbody");
  tb.innerHTML = "";
  (data.calendario || []).forEach(e => {
    const tr = document.createElement("tr");
    const prioClass = e.priority === "critica" ? "vermelho" :
                      e.priority === "alta" ? "amarelo" : "verde";
    tr.innerHTML = `
      <td><code>${esc(e.date)}</code></td>
      <td>${esc(e.event)}</td>
      <td><em>${esc(e.type)}</em></td>
      <td><span class="badge ${prioClass}">${esc(e.priority)}</span></td>
    `;
    tb.appendChild(tr);
  });
}

// ========================== Reuniões ==========================
function renderReunioes(data) {
  const m = data.meetings || {};
  setText("meet-total", fmtNum(m.total_meetings));
  const st = m.stats || {};
  setText("meet-items-total", fmtNum(st.total));
  setText("meet-items-open", fmtNum(st.abertos));
  setText("meet-items-open-days", (st.abertos || 0) + " aguardando validação");
  setText("meet-compl", fmtPct(st.cumprimento_pct, 1));
  const tabMeetBadge = byId("tab-meet-badge");
  if (tabMeetBadge) {
    tabMeetBadge.textContent = st.abertos || "0";
    tabMeetBadge.style.display = (st.abertos > 0) ? "inline-block" : "none";
    tabMeetBadge.style.background = "var(--ivoire-priority-mid)";
    tabMeetBadge.style.color = "var(--ivoire-black)";
  }

  // Latest meeting card
  const latest = m.latest_meeting;
  const latestEl = byId("latest-meet-card");
  if (latestEl && latest) {
    latestEl.innerHTML = `
      <h3>${esc(latest.title)} · <time>${esc(latest.date)}</time></h3>
      <p><strong>Duração:</strong> ${esc(latest.duration_marker || "—")} ·
         <strong>Ivoire:</strong> ${(latest.participants_ivoire || []).map(esc).join(", ") || "—"} ·
         <strong>Aviva:</strong> ${(latest.participants_aviva || []).map(esc).join(", ") || "—"}</p>
      <p class="story" style="margin-top:.5rem;"><em>${esc(latest.summary || "")}</em></p>
      <h4 style="margin-top:1rem;font-size:.875rem;">Decisões-chave</h4>
      <ul class="bullet-list">${(latest.decisions || []).slice(0,5).map(d=>"<li>"+esc(d)+"</li>").join("")||"<li class=\"empty\">—</li>"}</ul>
    `;
  } else if (latestEl) {
    latestEl.innerHTML = '<p class="empty">Nenhuma reunião processada.</p>';
  }

  // Action items table
  const itTb = byId("meet-items-tbody");
  if (itTb) {
    itTb.innerHTML = "";
    (m.action_items || []).forEach(it => {
      const days = it.days_since_meeting == null ? "—" : it.days_since_meeting + "d";
      const statusClass = it.status === "concluido" ? "verde" :
                          it.status === "em_execucao" ? "amarelo" :
                          (it.days_since_meeting || 0) > 14 ? "vermelho" : "amarelo";
      const tipoShort = it.tipo === "task_ivoire" ? "Ivoire" :
                        it.tipo === "task_cliente" ? "Cliente" : "Misto";
      itTb.insertAdjacentHTML("beforeend",
        `<tr><td><strong>${esc(it.responsavel_normalizado)}</strong></td>
         <td>${esc(it.titulo_curto)}<div style="font-size:.75rem;color:#888;">${esc((it.descricao||"").slice(0,120))}</div></td>
         <td class="kr-id">${esc(it.kr_linkado_inferido)}</td>
         <td><em>${esc(tipoShort)}</em></td>
         <td><span class="badge ${statusClass}">${esc(it.status)}</span></td>
         <td class="num">${days}</td>
         <td><code>${esc((it.meeting_date || ""))}</code></td></tr>`);
    });
    if (!(m.action_items || []).length) {
      itTb.innerHTML = `<tr><td colspan="7" class="empty">Nenhum action item extraído.</td></tr>`;
    }
  }

  // Timeline
  const tl = byId("meet-timeline-tbody");
  if (tl) {
    tl.innerHTML = "";
    (m.meetings || []).forEach(mt => {
      const parts = (mt.participants_ivoire || []).length + " Ivoire · " +
                    (mt.participants_aviva || []).length + " Aviva";
      tl.insertAdjacentHTML("beforeend",
        `<tr><td><code>${esc(mt.date)}</code></td><td><strong>${esc(mt.title)}</strong></td>
         <td>${esc(mt.duration_marker || "—")}</td><td>${esc(parts)}</td>
         <td class="num">${fmtNum(mt.action_items_count)}</td></tr>`);
    });
  }
}

// ========================== Alertas ==========================
function renderAlertas(data) {
  const el = byId("alerts-list");
  if (!el) return;
  el.innerHTML = "";
  const alerts = data.alertas || [];
  alerts.forEach(a => {
    const sev = a.severidade || "amarelo";
    const cat = a.categoria || "";
    const div = document.createElement("div");
    div.className = "alert-card sev-" + sev;
    div.innerHTML = `
      <span class="alert-sev badge ${sev}">${sev}</span>
      <span class="alert-cat">${esc(cat)}</span>
      <span class="alert-txt">${esc(a.texto)}</span>
    `;
    el.appendChild(div);
  });
  if (!alerts.length) {
    el.innerHTML = '<p class="empty">Nenhum alerta aberto nesta sprint.</p>';
  }
  // Badge do tab: apenas vermelhos contam
  const urgent = alerts.filter(a => a.severidade === "vermelho").length;
  setText("tab-alert-badge", urgent || "0");
  const tabBadge = byId("tab-alert-badge");
  if (tabBadge) tabBadge.style.display = urgent ? "inline-block" : "none";
}

// ========================== Drill-down ==========================
function setupDrillDown(data) {
  byId("drill-close").addEventListener("click", () => {
    byId("drill-panel").classList.remove("open");
    byId("drill-panel").setAttribute("aria-hidden", "true");
  });
}

function openKpiDrill(data, kpiIdx) {
  const labels = ["Cliques", "Impressões", "CTR", "Posição"];
  const label = labels[kpiIdx] || "KPI";
  const c = data.gsc_detail?.consolidated || {};
  const byP = data.gsc_detail?.by_property || {};
  const w = data.meta?.gsc_window;
  const wp = data.meta?.gsc_window_prev;

  let rows = "";
  Object.entries(byP).forEach(([origin, m]) => {
    rows += `<tr><td>${esc(origin)}</td><td class="num">${fmtNum(m.clicks)}</td><td class="num">${fmtNum(m.impressions)}</td><td class="num">${fmtPct(m.ctr_pct, 2)}</td><td class="num">${Number(m.avg_position).toFixed(1)}</td></tr>`;
  });

  const body = byId("drill-body");
  body.innerHTML = `
    <p><strong>Janela:</strong> ${esc(w?.start)} a ${esc(w?.end)}<br>
       <strong>Comparação:</strong> ${esc(wp?.start)} a ${esc(wp?.end)}</p>
    <p><strong>Fonte:</strong> Google Search Console API (searchanalytics.query), 3 properties consolidadas, cache TTL 6h.</p>

    <h4>Breakdown por property</h4>
    <table class="ivoire-table small">
      <thead><tr><th>Origin</th><th class="num">Cliques</th><th class="num">Impressões</th><th class="num">CTR</th><th class="num">Pos.</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">Sem dados.</td></tr>'}</tbody>
    </table>

    <h4>Agregados da janela</h4>
    <ul class="bullet-list">
      <li>Cliques: <strong>${fmtNum(c.clicks)}</strong> (Δ ${c.delta_clicks_pct}% WoW)</li>
      <li>Impressões: <strong>${fmtNum(c.impressions)}</strong> (Δ ${c.delta_impressions_pct}% WoW)</li>
      <li>CTR médio: <strong>${fmtPct(c.ctr_pct, 2)}</strong> (Δ ${c.delta_ctr_pp}pp WoW)</li>
      <li>Posição média: <strong>${Number(c.avg_position).toFixed(1)}</strong> (Δ ${c.delta_position} WoW)</li>
    </ul>

    <p class="data-source">Limites conhecidos: GSC descarta queries <10 impressões por segurança de privacidade; portanto valores absolutos do painel podem ser ligeiramente menores que totais internos.</p>
  `;
  byId("drill-title").textContent = label + " — drill-down";
  byId("drill-panel").classList.add("open");
  byId("drill-panel").setAttribute("aria-hidden", "false");
}
