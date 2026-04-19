// Dashboard Aviva SEO/GEO — bootstrap
// Consome data/snapshot.json + design-tokens.json.
// Sem frameworks externos: vanilla JS para manter build simples em GitHub Pages.

(async function () {
  const data = await fetch("data/snapshot.json").then(r => r.json());

  // Meta
  document.getElementById("sprint-id").textContent = data.meta.sprint_id;
  document.getElementById("sprint-window").textContent = data.meta.sprint_window;
  document.getElementById("generated-at").textContent = formatDateTime(data.meta.generated_at);
  document.getElementById("version").textContent = data.meta.version;

  // North Star
  document.getElementById("ns-label").textContent = data.north_star.label;
  document.getElementById("ns-current").textContent = data.north_star.current_pct + "%";
  document.getElementById("ns-target").textContent = "≥ " + data.north_star.target_pct + "%";
  document.getElementById("ns-target-date").textContent = data.north_star.target_date;
  document.getElementById("ns-baseline").textContent = data.north_star.baseline_date;
  document.getElementById("ns-delta").textContent = data.north_star.delta_to_target_pts + " pts";
  const pctToTarget = Math.max(
    1,
    Math.round((data.north_star.current_pct / data.north_star.target_pct) * 100)
  );
  document.getElementById("ns-bar").style.width = pctToTarget + "%";

  // Migração
  document.getElementById("aviva-pct").textContent = data.migracao.aviva_share_pct + "%";
  document.getElementById("legacy-pct").textContent = data.migracao.legacy_share_pct + "%";
  document.getElementById("redirects-total").textContent = data.migracao.redirects_total;
  document.getElementById("broken-redirects").textContent = data.migracao.broken_redirects;

  // KPIs GSC
  const kpiGrid = document.getElementById("kpi-grid");
  data.kpis_gsc.forEach(kpi => {
    const card = document.createElement("div");
    card.className = "ivoire-kpi-card";
    const directionClass = kpi.direction || "flat";
    card.innerHTML = `
      <span class="label">${kpi.label}</span>
      <span class="value">${kpi.value}</span>
      <span class="delta ${directionClass}">${kpi.delta}</span>
    `;
    kpiGrid.appendChild(card);
  });

  // KRs tabela
  const krTbody = document.getElementById("kr-tbody");
  data.krs.forEach(kr => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="kr-id">${kr.id}</td>
      <td>${escape(kr.objetivo)}</td>
      <td>${escape(kr.descricao)}</td>
      <td style="text-align:center; font-family: var(--ivoire-font-impact); font-size: 1.5rem; color: var(--ivoire-black);">${kr.tasks_ativas}</td>
      <td><span class="badge ${kr.status}">${kr.status}</span></td>
    `;
    krTbody.appendChild(tr);
  });

  // Alertas
  const alerts = document.getElementById("alerts-list");
  data.alertas.forEach(a => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escape(a.texto)}</span>`;
    alerts.appendChild(li);
  });

  // Tasks
  const tasksTbody = document.getElementById("tasks-tbody");
  data.sprint_tasks.forEach(task => {
    const tr = document.createElement("tr");
    const sevClass = task.sev >= 5 ? "sev-5" : task.sev === 4 ? "sev-4" : "sev-3";
    tr.innerHTML = `
      <td class="kr-id">${escape(task.id)}</td>
      <td>${escape(task.titulo)}</td>
      <td>${escape(task.kr)}</td>
      <td style="text-align:center;" class="${sevClass}">${task.sev}</td>
      <td>${escape(task.responsavel)}</td>
      <td>${escape(task.sla)}</td>
      <td>${escape(task.status)}</td>
    `;
    tasksTbody.appendChild(tr);
  });
})();

function escape(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return iso; }
}
