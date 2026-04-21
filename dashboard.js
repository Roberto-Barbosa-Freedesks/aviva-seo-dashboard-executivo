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

  setupTabs();
  renderHeader(data);
  renderVisao(data);
  renderNorthStar(data);
  renderMigracao(data);
  renderConteudo(data);
  renderOffpage(data);
  renderTecnico(data);
  renderSprint(data);
  renderOkrs(data);
  renderCompetidores(data);
  renderCalendario(data);
  renderReunioes(data);
  renderAlertas(data);
  setupDrillDown(data);
  setupTabLinks();
  setupPrint();
  await loadAnnotations();
})();

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

  // Issues table
  const tb = byId("tc-issues-tbody");
  if (tb) {
    tb.innerHTML = "";
    (t.site_audit_issues || []).forEach(iss => {
      const cls = iss.priority === "alta" ? "vermelho" : iss.priority === "media" ? "amarelo" : "verde";
      tb.insertAdjacentHTML("beforeend",
        `<tr><td>${esc(iss.issue)}</td><td class="num">${fmtNum(iss.count)}</td>
         <td><span class="badge ${cls}">${esc(iss.priority)}</span></td>
         <td><code>${esc(iss.file)}</code></td></tr>`);
    });
    if (!(t.site_audit_issues || []).length) {
      tb.innerHTML = `<tr><td colspan="4" class="empty">Nenhum issue crítico detectado.</td></tr>`;
    }
  }
}

// ========================== Sprint ==========================
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
