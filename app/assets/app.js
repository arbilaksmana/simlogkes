/* SIMLOGKES app — RBAC shell + per-page render. Vanilla JS, no framework. */
(function () {
  const { state, actions, stockSummary, pickingPlan, availablePickupDates, quotaOf, medName, facName, facility, medicine, ROLES, TODAY } = window.SIM;

  const PAGE = location.pathname.split("/").pop() || "index.html";
  const PUBLIC = ["login.html", "index.html", "registrasi.html", "permohonan-tolak-modal.html"];
  const st0 = state();
  let st = st0;

  function render() { st = state(); (R[PAGE] || (() => {}))(); }

  /* ===== helpers ===== */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const fmtN = n => (n || 0).toLocaleString("id-ID");
  const fmtD = iso => iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
  const fmtDT = iso => new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const STATUS = {
    SUBMITTED: ["Diajukan", "yellow"], PROGRAM_APPROVED: ["Disetujui Program", "blue"],
    FARMACY_APPROVED: ["Disetujui Farmasi", "blue"], STOCK_ALLOCATED: ["Stok Dialokasikan", ""],
    PICKUP_SCHEDULED: ["Pickup Dijadwalkan", "blue"], ITEM_COLLECTED: ["Barang Diambil", "yellow"],
    COMPLETED: ["Selesai", "green"], REJECTED: ["Ditolak", "red"]
  };
  const badge = s => { const [t, c] = STATUS[s] || [s, ""]; return `<span class="badge ${c}">${t}</span>`; };
  const med = id => medicine(id) || { name: id, unit: "", sediaan: "" };

  function toast(msg, ok) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.className = "toast show" + (ok === false ? " err" : "");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* dialog with fields: [{label, type, value, opts, attr}] */
  function diag(title, fields, onOk) {
    $$(".dlg").forEach(d => d.remove());
    const d = document.createElement("dialog");
    d.className = "dlg";
    d.innerHTML = `<form method="dialog" style="min-width:340px">
      <h3 style="margin:0 0 12px;font-size:15px">${esc(title)}</h3>
      ${fields.map((f, i) => f.type === "select"
        ? `<label style="display:block;font-size:12px;margin:10px 0 4px">${esc(f.label)}</label>
           <select data-i="${i}" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font:inherit">${(f.opts || []).map(o => `<option ${o === f.value ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
        : `<label style="display:block;font-size:12px;margin:10px 0 4px">${esc(f.label)}</label>
           <input data-i="${i}" type="${f.type || "text"}" value="${esc(f.value == null ? "" : f.value)}" ${f.attr || ""} style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font:inherit">`).join("")}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button type="button" class="btn btn-ghost" data-x>Batal</button>
        <button type="button" class="btn btn-primary" data-ok>Simpan</button>
      </div></form>`;
    document.body.appendChild(d);
    d.showModal();
    d.querySelector("[data-x]").onclick = () => d.close();
    d.querySelector("[data-ok]").onclick = () => {
      const vals = {};
      $$(".dlg [data-i]").forEach(el => { const f = fields[+el.dataset.i]; vals[f.label] = f.type === "number" ? +el.value : el.value; });
      d.close(); onOk(vals);
    };
  }

  /* ===== session + RBAC shell ===== */
  function guard() {
    if (PUBLIC.includes(PAGE)) return false;
    if (!st.session) { location.replace("login.html"); return true; }
    const allowed = ROLES[st.session.role].nav;
    const base = PAGE.replace(".html", "");
    const pageOk = allowed.includes(base) ||
      (base === "persetujuan-riwayat" && allowed.includes("persetujuan")) ||
      (base === "retur" && allowed.includes("distribusi")) ||
      (base === "pemusnahan" && allowed.includes("batch-expired"));
    if (!pageOk) { location.replace("dashboard.html"); return true; }
    $$(".nav-item").forEach(a => {
      const href = a.getAttribute("href");
      const nbase = href.replace(".html", "");
      const ok = allowed.includes(nbase) ||
        (nbase === "persetujuan-riwayat" && allowed.includes("persetujuan")) ||
        (nbase === "retur" && allowed.includes("distribusi")) ||
        (nbase === "pemusnahan" && allowed.includes("batch-expired"));
      if (!ok) a.style.display = "none";
      if (href === PAGE) a.classList.add("active");
      else a.classList.remove("active");
    });
    const u = $(".side-user");
    if (u) u.innerHTML = `<div class="avatar">${st.session.name.split(" ").map(w => w[0]).slice(0, 2).join("")}</div>
      <div class="who"><b>${esc(st.session.name)}</b><span>${esc(st.session.role)}</span></div>
      <a href="#" data-action="logout" title="Keluar" style="color:inherit"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></a>`;
    const sub = $(".topbar .sub");
    if (sub && !sub.dataset.live) sub.textContent = sub.textContent.split("·")[0] + "· " + esc(st.session.role) + " · " + esc(st.session.facility);
    return false;
  }

  /* ===== event delegation ===== */
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const a = el.dataset.action, id = el.dataset.id;
    const me = st.session ? st.session.name : "Sistem";
    if (a === "logout") { e.preventDefault(); actions.logout(); location.href = "login.html"; }
    if (a === "reset") { e.preventDefault(); actions.reset(); location.reload(); }
    if (a === "approve-program") { e.preventDefault(); const r = actions.approveProgram(id, me, "Disetujui via prototype"); r ? toast("Permohonan disetujui (Program)") : toast("Status bukan SUBMITTED", false); render(); }
    if (a === "approve-farmasi") {
      e.preventDefault();
      const req = st.requests.find(x => x.id === id);
      if (!req) return;
      const fields = req.items.map(it => ({
        label: med(it.medicineId).name + " (diminta " + fmtN(it.qty) + " " + med(it.medicineId).unit + ")",
        type: "number", value: it.qty, attr: `min="0" max="${it.qty}" required`
      }));
      diag("Setujui + Realisasi " + id, fields, v => {
        const map = {};
        req.items.forEach(it => {
          const val = v[med(it.medicineId).name + " (diminta " + fmtN(it.qty) + " " + med(it.medicineId).unit + ")"];
          map[it.medicineId] = val != null ? val : it.qty;
        });
        const res = actions.approveFarmasi(id, me, "Realisasi disesuaikan farmasi", map);
        res && res.error ? toast(res.error, false) : toast("Disetujui farmasi — stok dialokasikan");
        render();
      });
    }
    if (a === "reject") {
      e.preventDefault();
      diag("Tolak Permohonan " + id, [{ label: "Catatan penolakan", type: "text", attr: "required placeholder=\"Alasan penolakan…\"" }], v => {
        actions.reject(id, st.session.role.includes("Farmasi") ? "FARMACY" : "PROGRAM", me, v["Catatan penolakan"]);
        toast("Permohonan ditolak"); render();
      });
    }
    if (a === "schedule") {
      e.preventDefault();
      const dates = availablePickupDates(st);
      diag("Jadwalkan Pickup " + id, [{ label: "Tanggal pickup (H-3, kuota 6 kab/kota/hari)", type: "select", opts: dates.map(d => fmtD(d) + " · sisa kuota " + (6 - quotaOf(st, d).used)) }], () => {});
      // simpler: bind select index
      const dlg = $(".dlg");
      dlg.querySelector("[data-ok]").onclick = () => {
        const sel = dlg.querySelector("select");
        const ds = dates[sel.selectedIndex];
        dlg.close();
        const r = actions.schedulePickup(id, ds, me);
        r && r.error ? toast(r.error, false) : toast("Pickup dijadwalkan " + fmtD(ds));
        render();
      };
    }
    if (a === "collect") { e.preventDefault(); actions.collect(id, me) ? toast("Barang diambil — menunggu serah terima") : toast("Status belum PICKUP_SCHEDULED", false); render(); }
    if (a === "complete") { e.preventDefault(); actions.complete(id, me) ? toast("Serah terima selesai — stok fisik dikurangi (FEFO)") : toast("Status belum ITEM_COLLECTED", false); render(); }
    if (a === "receive-batch") {
      e.preventDefault();
      diag("Penerimaan Batch Baru", [
        { label: "Item", type: "select", opts: st.medicines.map(m => m.name) },
        { label: "Kode batch", type: "text", value: "B-2025-" + String(600 + Math.floor(Math.random() * 399)), attr: "required" },
        { label: "Kedaluarsa", type: "date", value: "2026-06-01", attr: "required" },
        { label: "Jumlah", type: "number", value: 500, attr: "min=\"1\" required" }
      ], v => {
        const m = st.medicines.find(x => x.name === v["Item"]);
        actions.receiveBatch({ medicineId: m.id, code: v["Kode batch"], expiry: v["Kedaluarsa"], qty: v["Jumlah"], user: me });
        toast("Batch dicatat"); render();
      });
    }
    if (a === "new-return") {
      e.preventDefault();
      const done = st.requests.filter(r => r.distributionId);
      diag("Catat Retur", [
        { label: "Distribusi asal", type: "select", opts: done.map(r => r.distributionId + " · " + facName(st, r.facilityId)) },
        { label: "Item", type: "select", opts: st.medicines.map(m => m.name) },
        { label: "Qty", type: "number", value: 10, attr: "min=\"1\" required" },
        { label: "Alasan", type: "text", attr: "required placeholder=\"Kemasan rusak…\"" },
        { label: "Disposisi", type: "select", opts: ["restock", "musnahkan"] }
      ], v => {
        const r = done.find(x => v["Distribusi asal"].startsWith(x.distributionId));
        const m = st.medicines.find(x => x.name === v["Item"]);
        actions.createReturn({ distributionId: r.distributionId, facilityId: r.facilityId, items: [{ medicineId: m.id, qty: v["Qty"] }], reason: v["Alasan"], disposition: v["Disposisi"], user: me });
        toast("Retur dicatat"); render();
      });
    }
    if (a === "new-disposal") {
      e.preventDefault();
      const bts = st.batches.filter(b => b.qty > 0);
      diag("Usul Pemusnahan", [
        { label: "Batch", type: "select", opts: bts.map(b => b.code + " · " + med(b.medicineId).name + " · sisa " + b.qty) },
        { label: "Qty dimusnahkan", type: "number", value: 50, attr: "min=\"1\" required" },
        { label: "Alasan", type: "select", opts: ["Kedaluwarsa", "Rusak fisik", "Kontaminasi"] },
        { label: "Dokumen (nama berita acara)", type: "text", value: "berita-acara.pdf" }
      ], v => {
        const code = v["Batch"].split(" · ")[0];
        const b = bts.find(x => x.code === code);
        const r = actions.createDisposal({ batchId: b.id, medicineId: b.medicineId, qty: v["Qty dimusnahkan"], reason: v["Alasan"], doc: v["Dokumen (nama berita acara)"], user: me });
        r && r.error ? toast(r.error, false) : toast("Pemusnahan dicatat — stok batch berkurang");
        render();
      });
    }
  });

  document.addEventListener("submit", e => {
    const f = e.target;
    if (f.id === "form-permohonan") {
      e.preventDefault();
      const items = $$("#item-rows tr").map(tr => ({
        medicineId: tr.dataset.med,
        qty: +($("input[type=number]", tr) || {}).value || 0
      })).filter(it => it.qty > 0);
      if (!items.length) return toast("Isi minimal 1 item", false);
      actions.createRequest({
        facilityId: $("#fasilitas").value, program: $("#program").value,
        items, note: $("#keterangan") ? $("#keterangan").value : "", user: st.session.name
      });
      toast("Permohonan terkirim — status Diajukan");
      location.href = "permohonan.html";
    }
  });

  /* ===== per-page renderers ===== */
  const R = {};
  R["dashboard.html"] = () => {
    const s = stockSummary(st);
    const set = (lbl, val) => $$(".kpi").forEach(k => { if ($(".lbl", k) && $(".lbl", k).textContent.includes(lbl)) { const v = $(".val", k); if (v) v.textContent = val; } });
    set("Total Stok", fmtN(s.total));
    set("Dialokasikan", fmtN(s.allocated));
    set("Pickup", fmtN(st.requests.filter(r => r.status === "PICKUP_SCHEDULED").length));
    set("Menunggu", fmtN(st.requests.filter(r => r.status === "SUBMITTED").length));
    const aktif = ["FARMACY_APPROVED", "STOCK_ALLOCATED", "PICKUP_SCHEDULED", "ITEM_COLLECTED", "COMPLETED"];
    set("Disetujui", fmtN(st.requests.filter(r => aktif.includes(r.status)).length));
    set("Ditolak", fmtN(st.requests.filter(r => r.status === "REJECTED").length));
    const stat = (lbl, val, unit) => $$(".stat").forEach(k => { const l = $(".lbl", k); if (l && l.textContent === lbl) { const v = $(".val", k); if (v) v.innerHTML = fmtN(val) + (unit ? ` <small>${unit}</small>` : ""); } });
    stat("Stok Fisik", s.total, "unit");
    stat("Stok Tersedia", s.available, "unit");
    stat("Stok Dialokasikan", s.allocated, "unit");
    stat("Pickup Terlambat", st.requests.filter(r => r.status === "PICKUP_SCHEDULED" && r.pickupDate < "2025-10-13").length, "wilayah");
    const list = $(".rowlist");
    if (list) list.innerHTML = st.activities.slice(0, 5).map(a =>
      `<div class="rowitem"><span class="dot ${a.type}"></span><div class="body"><b>${esc(a.title)}</b><span>${esc(a.sub)}</span></div><span class="muted small num">${fmtDT(a.ts)}</span></div>`).join("");
  };

  R["permohonan.html"] = () => {
    const tb = $("tbody"); if (!tb) return;
    const fp = $("#f-program"), fs = $("#f-status");
    if (fp && !fp.dataset.built) {
      fp.dataset.built = "1";
      fp.innerHTML = `<option value="">Semua Program</option>` + [...new Set(st.requests.map(r => r.program))].map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
    }
    if (fs && !fs.dataset.built) {
      fs.dataset.built = "1";
      fs.innerHTML = `<option value="">Semua Status</option>` + Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("");
    }
    const draw = () => {
      const rows = st.requests.filter(r =>
        (!fp || !fp.value || r.program === fp.value) &&
        (!fs || !fs.value || r.status === fs.value));
      const status = st.requests.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
      const live = {
        "chip-semua": st.requests.length,
        "chip-menunggu": (status.SUBMITTED || 0),
        "chip-disetujui": (status.PROGRAM_APPROVED || 0) + (status.FARMACY_APPROVED || 0) + (status.STOCK_ALLOCATED || 0),
        "chip-ditolak": (status.REJECTED || 0),
        "chip-terjadwal": (status.PICKUP_SCHEDULED || 0) + (status.ITEM_COLLECTED || 0) + (status.COMPLETED || 0)
      };
      for (const [k, v] of Object.entries(live)) $$(`[data-live="${k}"]`).forEach(el => el.textContent = v);
      const cnt = $(".tfoot span");
      if (cnt) cnt.textContent = `Menampilkan ${rows.length} dari ${st.requests.length} permohonan`;
      tb.innerHTML = rows.map(r => {
        const f = facility(r.facilityId) || {};
        const total = r.items.reduce((a, i) => a + i.qty, 0);
        return `<tr>
          <td><b>${esc(r.id)}</b></td><td>${esc(f.name || r.facilityId)}<div class="muted small">${esc(f.kabkota || "")}</div></td>
          <td>${esc(r.program)}</td>
          <td>${fmtD(r.createdAt)}</td>
          <td>${r.items.map(it => `${esc(med(it.medicineId).name)} <b class="num">${fmtN(it.qty)}</b>`).join("<br>")}</td>
          <td class="num"><b>${fmtN(total)}</b></td>
          <td>${badge(r.status)}</td></tr>`;
      }).join("") || `<tr><td colspan="7" class="muted">Tidak ada data.</td></tr>`;
    };
    [fp, fs].forEach(el => el && el.addEventListener("change", draw));
    draw();
  };

  R["permohonan-baru.html"] = () => {
    // fasilitas dari store (value = facilityId), stok tersedia live, tanggal min H-3
    const fas = $("#fasilitas");
    if (fas) fas.innerHTML = st.facilities.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join("");
    $$("#item-rows tr").forEach(tr => {
      const onHand = st.batches.filter(b => b.medicineId === tr.dataset.med).reduce((a, b) => a + b.qty, 0);
      const alloc = st.requests.filter(r => ["FARMACY_APPROVED", "STOCK_ALLOCATED", "PICKUP_SCHEDULED", "ITEM_COLLECTED"].includes(r.status))
        .flatMap(r => r.items).filter(i => i.medicineId === tr.dataset.med)
        .reduce((a, i) => a + (i.realisasi || 0), 0);
      const cell = $$("td", tr)[1];
      if (cell) cell.textContent = fmtN(onHand - alloc);
    });
    const tgl = $("#tanggal");
    if (tgl) { const d = availablePickupDates(st)[0]; if (d) tgl.min = d; }
  };

  R["persetujuan.html"] = () => {
    const tbs = $$("tbody");
    const qProg = st.requests.filter(r => r.status === "SUBMITTED");
    const qFarm = st.requests.filter(r => r.status === "PROGRAM_APPROVED");
    const rowP = r => {
      const f = facility(r.facilityId) || {};
      return `<tr><td><b>${esc(r.id)}</b></td><td>${esc(f.name || "")}<div class="muted small">${esc(f.kabkota || "")}</div></td>
        <td>${esc(r.program)}</td><td>${fmtD(r.createdAt)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-primary" data-action="approve-program" data-id="${r.id}">Setujui</button>
          <button class="btn btn-ghost" data-action="reject" data-id="${r.id}">Tolak</button>
        </td></tr>`;
    };
    const rowF = r => {
      const f = facility(r.facilityId) || {};
      const dim = r.items.map(it => `${esc(med(it.medicineId).name)}<br><b class="num">${fmtN(it.qty)}</b> ${esc(med(it.medicineId).unit)}`).join("<hr style=\"border:none;border-top:1px solid var(--border);margin:6px 0\">");
      return `<tr><td><b>${esc(r.id)}</b></td><td>${esc(f.name || "")}<div class="muted small">${esc(f.kabkota || "")}</div></td>
        <td>${dim}</td>
        <td><span class="muted small">default = diminta<br>(atur saat approval)</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn-primary" data-action="approve-farmasi" data-id="${r.id}">Setujui</button>
          <button class="btn btn-ghost" data-action="reject" data-id="${r.id}">Tolak</button>
        </td></tr>`;
    };
    if (tbs[0]) tbs[0].innerHTML = qProg.map(rowP).join("") || `<tr><td colspan="5" class="muted">Tidak ada antrean.</td></tr>`;
    if (tbs[1]) tbs[1].innerHTML = qFarm.map(rowF).join("") || `<tr><td colspan="5" class="muted">Tidak ada antrean.</td></tr>`;
    const aktif = st.requests.filter(r => ["STOCK_ALLOCATED", "PICKUP_SCHEDULED", "ITEM_COLLECTED", "COMPLETED"].includes(r.status)).length;
    const ditolak = st.requests.filter(r => r.status === "REJECTED").length;
    const live = {
      "apv-program": qProg.length, "apv-farmasi": qFarm.length,
      "apv-aktif": fmtN(aktif), "apv-ditolak": fmtN(ditolak),
      "apv-foot1": `${qProg.length} permohonan dalam antrean · tahap 1 dari 2 approval.`,
      "apv-foot2": `${qFarm.length} permohonan dalam antrean · realisasi tidak boleh melebihi jumlah diminta.`
    };
    for (const [k, v] of Object.entries(live)) $$(`[data-live="${k}"]`).forEach(el => el.textContent = v);
  };

  R["persetujuan-riwayat.html"] = () => {
    const tb = $("tbody"); if (!tb) return;
    const rows = [];
    for (const r of st.requests) for (const h of r.histori)
      if (h.action !== "SUBMIT") rows.push({ r, h });
    rows.sort((a, b) => b.h.ts.localeCompare(a.h.ts));
    tb.innerHTML = rows.map(({ r, h }) => `<tr>
      <td><b>${esc(r.id)}</b></td><td>${esc(h.stage)}</td>
      <td>${esc(h.user)}</td><td>${fmtDT(h.ts)}</td><td>${esc(h.note || "-")}</td>
      <td><span class="badge ${h.action === "REJECT" ? "red" : "green"}">${esc(h.action)}</span></td></tr>`).join("")
      || `<tr><td colspan="6" class="muted">Belum ada riwayat.</td></tr>`;
  };

  R["distribusi.html"] = () => {
    const tb = $("tbody"); if (!tb) return;
    const rows = st.requests.filter(r => ["STOCK_ALLOCATED", "PICKUP_SCHEDULED", "ITEM_COLLECTED", "COMPLETED"].includes(r.status));
    const act = {
      STOCK_ALLOCATED: rows.filter(r => r.status === "STOCK_ALLOCATED").length,
      KIRIM: rows.filter(r => r.status === "PICKUP_SCHEDULED").length,
      COLLECTED: rows.filter(r => r.status === "ITEM_COLLECTED").length,
      DONE: rows.filter(r => r.status === "COMPLETED").length
    };
    const live = {
      "dist-berjalan": act.STOCK_ALLOCATED + act.KIRIM + act.COLLECTED,
      "dist-siap": act.STOCK_ALLOCATED, "dist-kirim": act.KIRIM,
      "dist-selesai": fmtN(act.DONE), "dist-selesai-n": fmtN(st.issuedCumulative),
      "dist-collected": act.COLLECTED,
      "dist-terlambat": rows.filter(r => r.status === "ITEM_COLLECTED" && r.pickupDate < "2025-10-13").length,
      "chip-semua": rows.length, "chip-siap": act.STOCK_ALLOCATED,
      "chip-kirim": act.KIRIM, "chip-selesai": act.DONE
    };
    for (const [k, v] of Object.entries(live)) $$(`[data-live="${k}"]`).forEach(el => el.textContent = v);
    const cnt = $(".tfoot span");
    if (cnt) cnt.textContent = `Menampilkan ${rows.length} dari ${rows.length} distribusi`;
    tb.innerHTML = rows.map(r => {
      const f = facility(r.facilityId) || {};
      const plan = pickingPlan(st, r.items);
      const dist = r.distributionId || "—";
      const act = r.status === "STOCK_ALLOCATED" ? `<button class="btn btn-primary" data-action="schedule" data-id="${r.id}">Jadwalkan</button>`
        : r.status === "PICKUP_SCHEDULED" ? `<button class="btn btn-primary" data-action="collect" data-id="${r.id}">Tandai Diambil</button>`
        : r.status === "ITEM_COLLECTED" ? `<button class="btn btn-primary" data-action="complete" data-id="${r.id}">Serah Terima</button>`
        : `<span class="muted small">QR ${esc(dist)}</span>`;
      return `<tr><td><b>${esc(dist)}</b></td><td>${esc(r.id)}</td>
        <td>${esc(f.name || "")}<div class="muted small">${esc(f.kabkota || "")}</div></td>
        <td>${r.items.map(it => `${esc(med(it.medicineId).name)} <b class="num">${fmtN(it.realisasi || it.qty)}</b>`).join("<br>")}</td>
        <td class="small">${plan.map(p => `${esc(p.code)}<span class="muted"> · ${fmtN(p.take)}</span>`).join("<br>")}</td>
        <td>${r.pickupDate ? fmtD(r.pickupDate) : "—"}</td><td>${badge(r.status)}</td><td>${act}</td></tr>`;
    }).join("") || `<tr><td colspan="8" class="muted">Belum ada distribusi.</td></tr>`;
  };

  R["persediaan.html"] = () => {
    const tb = $("tbody"); if (!tb) return;
    const build = (id, opts) => { const el = $(id); if (!el || el.dataset.built) return el; el.dataset.built = "1"; el.innerHTML = `<option value="">${el.querySelector("option").textContent}</option>` + opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join(""); el.addEventListener("change", render); return el; };
    const fk = build("#p-kategori", [...new Set(st.medicines.map(m => m.sediaan))]);
    const fl = build("#p-lokasi", [...new Set(st.batches.map(b => b.location))]);
    const fs = $("#p-status"); if (fs && !fs.dataset.built) { fs.dataset.built = "1"; fs.addEventListener("change", render); }
    const fp = $("#p-program");
    if (fp && !fp.dataset.built) {
      fp.dataset.built = "1";
      fp.innerHTML = `<option value="">Semua program</option>` + [...new Set(st.requests.map(r => r.program))].map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
      fp.addEventListener("change", render);
    }
    const progMeds = new Set(st.requests.filter(r => !fp || !fp.value || r.program === fp.value).flatMap(r => r.items.map(i => i.medicineId)));
    const alloc = {};
    st.requests.filter(r => ["FARMACY_APPROVED", "STOCK_ALLOCATED", "PICKUP_SCHEDULED", "ITEM_COLLECTED"].includes(r.status))
      .flatMap(r => r.items).forEach(i => alloc[i.medicineId] = (alloc[i.medicineId] || 0) + (i.realisasi || 0));
    const meds = st.medicines.filter(m => (!fp || !fp.value || progMeds.has(m.id)) && (!fk || !fk.value || m.sediaan === fk.value));
    tb.innerHTML = meds.map(m => {
      const bts = st.batches.filter(b => b.medicineId === m.id).sort((a, b) => a.expiry.localeCompare(b.expiry));
      const fisik = bts.reduce((a, b) => a + b.qty, 0), al = alloc[m.id] || 0;
      const fefo = bts[0];
      if (fs && fs.value === "Aman" && fisik - al <= m.minStock) return "";
      if (fs && fs.value === "Di bawah min" && fisik - al > m.minStock) return "";
      if (fl && fl.value && !(fefo && fefo.location === fl.value)) return "";
      return `<tr><td><b>${esc(m.name)}</b><div class="muted small">${esc(m.code)} · ${esc(m.sediaan)}</div></td>
        <td>${esc(fefo ? fefo.code : "-")}</td>
        <td>${fefo ? fmtD(fefo.expiry) : "-"}</td>
        <td>${esc(m.sediaan)}</td>
        <td class="num">${fmtN(fisik)}</td>
        <td class="num"><b>${fmtN(fisik - al)}</b></td>
        <td class="num">${fmtN(al)}</td>
        <td>${esc(fefo ? fefo.location : "-")}</td>
        <td>${fisik - al <= m.minStock ? '<span class="badge red">Di bawah min</span>' : '<span class="badge green">Aman</span>'}</td></tr>`;
    }).join("") || `<tr><td colspan="9" class="muted">Tidak ada obat yang cocok dengan filter.</td></tr>`;
    const totF = st.batches.reduce((a, b) => a + b.qty, 0);
    const day = 864e5;
    const nExp = st.batches.filter(b => (new Date(b.expiry) - TODAY) / day <= 30).length;
    const ss = stockSummary(st);
    const live = {
      "ps-fisik": fmtN(totF), "ps-tersedia": fmtN(ss.available),
      "ps-alloc": fmtN(ss.allocated), "ps-exp": nExp
    };
    for (const [k, v] of Object.entries(live)) $$(`[data-live="${k}"]`).forEach(el => el.textContent = v);
  };

  R["gudang.html"] = () => {
    const tbs = $$("tbody");
    if (tbs[0]) tbs[0].innerHTML = st.batches.slice().sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).map((b, i) => `<tr>
      <td><b>RCV-2025-${String(40 - i).padStart(3, "0")}</b></td><td>Pabrik Pusat</td>
      <td>${esc(med(b.medicineId).name)}</td><td class="num">${fmtN(b.qty)}</td>
      <td>${esc(b.code)}</td><td>${fmtD(b.receivedAt)}</td>
      <td><span class="badge green">QC OK</span></td></tr>`).join("");
    if (tbs[1]) {
      const rows = st.requests.filter(r => r.pickupDate);
      tbs[1].innerHTML = rows.map(r => {
        const plan = pickingPlan(st, r.items);
        return `<tr><td><b>${esc(r.distributionId || "—")}</b></td><td>${esc(r.id)}</td>
          <td>${r.items.map(it => esc(med(it.medicineId).name)).join(", ")}</td>
          <td class="num">${fmtN(r.items.reduce((a, i) => a + (i.realisasi || 0), 0))}</td>
          <td>${plan.map(p => esc(p.code)).join("<br>")}</td><td>${badge(r.status)}</td></tr>`;
      }).join("") || `<tr><td colspan="6" class="muted">Belum ada jadwal pickup.</td></tr>`;
    }
    const h2s = $$("h2").find(h => /Penerimaan/i.test(h.textContent));
    if (h2s && !$("#btn-receive")) {
      const b = document.createElement("button");
      b.className = "btn btn-primary"; b.id = "btn-receive";
      b.dataset.action = "receive-batch"; b.textContent = "+ Batch Baru";
      h2s.parentElement.appendChild(b);
    }
    const month = st.batches.filter(b => b.receivedAt.slice(0, 7) === "2025-10").length;
    const byLoc = {};
    st.batches.forEach(b => byLoc[b.location] = (byLoc[b.location] || 0) + 1);
    const locNote = Object.entries(byLoc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.replace("Gudang ", "")} ${v}`).join(" · ");
    const day = 864e5;
    const crit = st.batches.filter(b => (new Date(b.expiry) - TODAY) / day <= 60).length;
    const badRet = st.returns.filter(t => t.disposition !== "restock").length;
    const live = {
      "gd-terima": month, "gd-terima2": month, "gd-batch": st.batches.length, "gd-batch-note": locNote || "-",
      "gd-keluar": fmtN(st.issuedCumulative),
      "gd-inspeksi": crit + badRet, "gd-inspeksi-note": `${badRet} retur rusak · ${crit} batch ≤60 hari`
    };
    for (const [k, v] of Object.entries(live)) $$(`[data-live="${k}"]`).forEach(el => el.textContent = v);
  };

  R["batch-expired.html"] = () => {
    const tb = $("tbody"); if (!tb) return;
    const day = 864e5;
    const left = b => Math.round((new Date(b.expiry) - TODAY) / day);
    const sorted = st.batches.slice().sort((a, b) => a.expiry.localeCompare(b.expiry));
    const n30 = sorted.filter(b => left(b) <= 30 && left(b) >= 0).length;
    const n60 = sorted.filter(b => left(b) <= 60 && left(b) >= 0).length;
    const nExp = sorted.filter(b => left(b) < 0).length;
    const unit60 = sorted.filter(b => left(b) <= 60).reduce((a, b) => a + b.qty, 0);
    const cold = sorted.filter(b => (med(b.medicineId).sediaan || "").toLowerCase() === "vaksin" && left(b) <= 180);
    const live = {
      "be-30": n30, "be-exp": nExp,
      "be-unit": fmtN(unit60), "be-cold": cold.length,
      "be-cold-note": cold.length ? `${med(cold[0].medicineId).name} · ${cold[0].location}` : "Tidak ada",
      "chip-30": n30, "chip-60": n60, "chip-exp": nExp,
      "be-prio": Math.min(4, sorted.length)
    };
    for (const [k, v] of Object.entries(live)) $$(`[data-live="${k}"]`).forEach(el => el.textContent = v);
    $("#fefo-list").innerHTML = sorted.slice(0, 4).map((b, i) => {
      const l = left(b);
      const pill = l < 0 ? `<span class="pill red">Expired</span>`
        : l <= 60 ? `<span class="pill yellow">${fmtD(b.expiry)}</span>`
        : `<span class="pill green">${fmtD(b.expiry)}</span>`;
      return `<div class="rowitem">
        <div class="ic"><span class="badge blue">${i + 1}</span></div>
        <div class="body"><b>${esc(med(b.medicineId).name)}</b>
        <span>Batch <span class="mono">${esc(b.code)}</span> &middot; Kedaluwarsa ${fmtD(b.expiry)}${(med(b.medicineId).sediaan || "").toLowerCase() === "vaksin" ? " &middot; Cold chain" : ""}</span></div>
        ${pill}</div>`;
    }).join("");
    tb.innerHTML = sorted.map(b => {
      const l = left(b);
      const stat = l < 0 ? ["Kedaluwarsa", "red"] : l <= 60 ? ["Kritis ≤60 hari", "red"] : l <= 180 ? ["Peringatan ≤180 hari", "yellow"] : ["Aman", "green"];
      return `<tr><td><span class="mono">${esc(b.code)}</span></td><td>${esc(med(b.medicineId).name)}</td>
        <td>${esc(b.location)}</td><td class="num">${fmtN(b.qty)}</td>
        <td>${fmtD(b.expiry)}</td><td>${l < 0 ? Math.abs(l) + " hari lewat" : l + " hari"}</td>
        <td><span class="badge ${stat[1]}">${stat[0]}</span></td></tr>`;
    }).join("");
    const h2 = $$("h2").find(h => /Pemusnahan|Usul/i.test(h.textContent));
    if (h2 && !$("#btn-dispose")) {
      const b = document.createElement("button");
      b.className = "btn btn-primary"; b.id = "btn-dispose";
      b.dataset.action = "new-disposal"; b.textContent = "+ Usul Pemusnahan";
      h2.parentElement.appendChild(b);
    }
  };

  R["retur.html"] = () => {
    const tb = $("tbody"); if (!tb) return;
    tb.innerHTML = st.returns.map(t => `<tr>
      <td><b>${esc(t.id)}</b></td><td>${esc(t.distributionId)}</td>
      <td>${esc(facName(st, t.facilityId))}</td>
      <td>${t.items.map(i => esc(med(i.medicineId).name)).join(", ")}</td>
      <td class="num">${fmtN(t.items.reduce((a, i) => a + i.qty, 0))}</td>
      <td>${esc(t.reason)}</td>
      <td><span class="badge ${t.disposition === "restock" ? "green" : "red"}">${t.disposition}</span></td>
      <td>${fmtDT(t.ts)}</td></tr>`).join("")
      || `<tr><td colspan="8" class="muted">Belum ada retur.</td></tr>`;
    const h1 = $(".topbar h1");
    if (h1 && !$("#btn-retur")) {
      const b = document.createElement("button");
      b.className = "btn btn-primary"; b.id = "btn-retur";
      b.dataset.action = "new-return"; b.textContent = "+ Catat Retur";
      (h1.parentElement.parentElement.querySelector(".topbar-actions") || h1.parentElement).appendChild(b);
    }
  };

  R["pemusnahan.html"] = () => {
    const tb = $("tbody"); if (!tb) return;
    tb.innerHTML = st.disposals.map(d => `<tr>
      <td><b>${esc(d.id)}</b></td>
      <td>${esc((st.batches.find(b => b.id === d.batchId) || {}).code || d.batchId)}</td>
      <td>${esc(med(d.medicineId).name)}</td>
      <td class="num">${fmtN(d.qty)}</td><td>${esc(d.reason)}</td>
      <td>${fmtDT(d.ts)}</td>
      <td><a class="small" href="#" onclick="return false">${esc(d.doc)}</a></td>
      <td><span class="badge green">Selesai</span></td></tr>`).join("")
      || `<tr><td colspan="8" class="muted">Belum ada pemusnahan.</td></tr>`;
  };

  R["laporan.html"] = () => {
    const tb = $("tbody"); if (!tb) return;
    const done = st.requests.filter(r => r.status === "COMPLETED");
    tb.innerHTML = done.map(r => `<tr>
      <td><b>LPR-${esc(r.distributionId)}</b></td><td>Bukti Serah Terima</td>
      <td>${fmtD(r.pickupDate)}</td>
      <td>${esc(facility(r.facilityId).kabkota)}</td>
      <td>${esc(st.session ? st.session.name : "-")}</td>
      <td><span class="badge green">Final</span></td>
      <td><button class="btn btn-ghost" onclick="window.print()">Cetak</button></td></tr>`).join("")
      || `<tr><td colspan="7" class="muted">Belum ada laporan final.</td></tr>`;
  };

  R["analitik.html"] = () => {
    const tb = $("tbody"); if (!tb) return;
    const byKab = {};
    for (const r of st.requests) {
      const f = facility(r.facilityId); const k = f ? f.kabkota : "?";
      byKab[k] = byKab[k] || { n: 0, hrs: 0, done: 0 };
      byKab[k].n++;
      const ap = r.histori.find(h => h.action === "APPROVE");
      if (ap) { byKab[k].hrs += Math.max(1, (new Date(ap.ts) - new Date(r.createdAt)) / 36e5); }
      if (r.status === "COMPLETED") byKab[k].done++;
    }
    tb.innerHTML = Object.entries(byKab).map(([k, v]) => `<tr>
      <td>${esc(k)}</td><td class="num">${v.n}</td>
      <td class="num">${(v.hrs / Math.max(1, v.n)).toFixed(1)} jam</td>
      <td>${v.done}/${v.n} selesai</td></tr>`).join("");
  };

  R["login.html"] = () => {
    let role = "Administrator";
    const on = $(".role-opt.on");
    if (on) role = on.textContent.trim();
    $$(".role-opt").forEach(el => el.addEventListener("click", () => {
      $$(".role-opt").forEach(x => x.classList.remove("on"));
      el.classList.add("on");
      role = el.textContent.trim();
    }));
    const f = $("form");
    if (f) f.addEventListener("submit", e => {
      e.preventDefault();
      actions.login(role);
      location.href = "dashboard.html";
    });
  };

  /* ===== boot ===== */
  if (guard()) return;
  render();
})();
