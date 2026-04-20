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
  pg.innerHTML = "";
  (c.pipeline || []).forEach(p => {
    pg.insertAdjacentHTML("beforeend", `
      <div class="pipe-stage">
        <div class="ps-label">${esc(p.stage)}</div>
        <div class="ps-value">${fmtNum(p.count)}</div>
      </div>
    `);
  });

  const v = c.velocity_goal || {};
  const pctQ = v.target_quarter ? Math.round(v.published_quarter / v.target_quarter * 100) : 0;
  byId("velocity-card").innerHTML = `
    <div class="vel-row"><span>Meta trimestral (KR3.1)</span><strong>${fmtNum(v.target_quarter)} páginas até ${esc(v.sla_quarter)}</strong></div>
    <div class="vel-row"><span>Meta por sprint</span><strong>${fmtNum(v.target_per_sprint)} páginas / 15 dias</strong></div>
    <div class="vel-row"><span>Publicadas no trimestre</span><strong>${fmtNum(v.published_quarter)}</strong></div>
    <div class="vel-track"><span class="vel-fill" style="width:${pctQ}%"></span><span class="vel-pct">${pctQ}%</span></div>
  `;

  const tb = byId("kwgaps-tbody");
  tb.innerHTML = "";
  (c.kw_gaps_top || []).forEach(k => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${esc(k.kw)}</strong></td>
      <td class="num">${k.impressions_week == null ? "—" : fmtNum(k.impressions_week)}</td>
      <td class="num">${k.position == null ? "—" : Number(k.position).toFixed(1).replace(".",",")}</td>
      <td>Candidata a página programática</td>
    `;
    tb.appendChild(tr);
  });
}

// ========================== Off-page ==========================
function renderOffpage(data) {
  const o = data.offpage || {};
  setText("op-bl", fmtNum(o.backlinks_total));
  setText("op-rd", fmtNum(o.refdomains_total));
  setText("op-new", fmtNum(o.new_7d));
  setText("op-toxic", fmtNum(o.toxic_risk_count));
}

// ========================== Técnico ==========================
function renderTecnico(data) {
  const t = data.tecnico || {};
  setText("tc-lcp", t.lcp_p75 == null ? "—" : fmtNum(t.lcp_p75));
  setText("tc-inp", t.inp_p75 == null ? "—" : fmtNum(t.inp_p75));
  setText("tc-cls", t.cls_p75 == null ? "—" : String(t.cls_p75).replace(".",","));
  setText("tc-score", t.score_avg == null ? "—" : fmtNum(t.score_avg));
  setText("tc-date", t.source_date || "—");
  setText("tc-srcdir", "/reports/" + (t.source_date || "—") + "/");
  setText("tc-samples", fmtNum(t.samples || 0));
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
  tb.innerHTML = "";
  (data.competidores || []).forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${esc(c.name)}</strong></td>
      <td><code>${esc(c.domain)}</code></td>
      <td>${esc(c.share_of_voice_note)}</td>
      <td>${esc(c.dr_diff_note)}</td>
      <td><span class="badge amarelo">${esc(c.status)}</span></td>
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

// ========================== Alertas ==========================
function renderAlertas(data) {
  const ul = byId("alerts-list");
  ul.innerHTML = "";
  const alerts = data.alertas || [];
  alerts.forEach(a => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${esc(a.texto)}</span>`;
    ul.appendChild(li);
  });
  if (!alerts.length) {
    ul.innerHTML = '<li class="empty">Nenhum alerta aberto nesta sprint.</li>';
  }
  setText("tab-alert-badge", alerts.length || "0");
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
