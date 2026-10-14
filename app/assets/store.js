/* SIMLOGKES store — single source of truth prototype (localStorage).
 * PRD: state machine SUBMITTED→PROGRAM_APPROVED→FARMACY_APPROVED→STOCK_ALLOCATED→PICKUP_SCHEDULED→ITEM_COLLECTED→COMPLETED
 * Rules: RULE-STOCK-001/002 (allocasi tanpa kurangi fisik; allocated terkunci),
 *        RULE-BATCH-001 (FEFO), RULE-SCHEDULE-001/002 (H-3, kuota 6 kab/kota unik, tanggal penuh disembunyikan).
 */
(function () {
  const KEY = "simlogkes_v2";
  const TODAY = new Date(2025, 9, 13); // tanaman tanggal demo tetap deterministik

  const ROLES = {
    "Petugas Faskes":     { nav: ["dashboard", "permohonan", "distribusi"], user: "Andi Pratama",  facility: "RSUD Cianjur" },
    "Petugas Program":    { nav: ["dashboard", "permohonan", "persetujuan", "analitik"], user: "dr. Sari Wulandari", facility: "Dinkes Provinsi" },
    "Petugas Farmasi":    { nav: ["dashboard", "persetujuan", "persediaan", "batch-expired", "analitik"], user: "Yusuf Hidayat", facility: "Dinkes Provinsi" },
    "Petugas Gudang":     { nav: ["dashboard", "persediaan", "distribusi", "gudang", "batch-expired"], user: "Budi Santoso", facility: "Gudang Bandung" },
    "Administrator":      { nav: ["dashboard", "permohonan", "persetujuan", "persediaan", "distribusi", "gudang", "batch-expired", "analitik", "laporan"], user: "dr. Rina", facility: "Dinkes Provinsi" },
    "Kepala Bidang":      { nav: ["dashboard", "persetujuan", "analitik", "laporan"], user: "dr. Hendra Gunawan", facility: "Dinkes Provinsi" }
  };

  const KABKOTA = ["Kab. Bogor", "Kota Sukabumi", "Kab. Sukabumi", "Kota Depok", "Kab. Cianjur",
    "Kab. Bandung", "Kota Bandung", "Kota Cimahi", "Kab. Bandung Barat", "Kab. Garut",
    "Kab. Tasikmalaya", "Kota Tasikmalaya", "Kab. Ciamis", "Kota Banjar", "Kab. Pangandaran",
    "Kab. Purwakarta", "Kab. Subang", "Kab. Karawang", "Kab. Bekasi", "Kota Bekasi",
    "Kab. Kuningan", "Kab. Cirebon", "Kota Cirebon", "Kab. Majalengka", "Kab. Sumedang", "Kab. Indramayu"];

  function seed() {
    const meds = [
      { id: "M1", code: "OBT-001", name: "Paracetamol 500mg", sediaan: "Tablet", unit: "box", minStock: 400 },
      { id: "M2", code: "OBT-002", name: "Amoxicillin 500mg", sediaan: "Kapsul", unit: "box", minStock: 300 },
      { id: "M3", code: "OBT-003", name: "Infus NaCl 0,9%", sediaan: "Intravena", unit: "pcs", minStock: 800 },
      { id: "M4", code: "VAK-001", name: "Vaksin DPT", sediaan: "Vaksin", unit: "vial", minStock: 200 },
      { id: "M5", code: "ALK-001", name: "Ventilator MV-200", sediaan: "Alat Kesehatan", unit: "unit", minStock: 4 },
      { id: "M6", code: "OBT-004", name: "Metformin 850mg", sediaan: "Tablet", unit: "box", minStock: 250 }
    ];
    const facs = [
      { id: "F1", name: "RSUD Cianjur", kabkota: "Kab. Cianjur", type: "RSUD" },
      { id: "F2", name: "RSUD Majalengka", kabkota: "Kab. Majalengka", type: "RSUD" },
      { id: "F3", name: "Puskesmas Cibeureum", kabkota: "Kota Tasikmalaya", type: "Puskesmas" },
      { id: "F4", name: "RSUD Kota Cirebon", kabkota: "Kota Cirebon", type: "RSUD" },
      { id: "F5", name: "Puskesmas Cimahi Utara", kabkota: "Kota Cimahi", type: "Puskesmas" },
      { id: "F6", name: "RSUD Al Ihsan", kabkota: "Kab. Bandung", type: "RSUD" },
      { id: "F7", name: "Puskesmas Karawaci", kabkota: "Kota Bekasi", type: "Puskesmas" },
      { id: "F8", name: "RSUD Tasikmalaya", kabkota: "Kab. Tasikmalaya", type: "RSUD" }
    ];
    let b = 0;
    const B = (med, code, expiry, qty, recv) => ({ id: "B" + (++b), medicineId: med, code, expiry, qty, receivedAt: recv, location: "Gudang Bandung" });
    const batches = [
      B("M1", "B-2025-0412", "2026-01-12", 3200, "2025-09-30"),
      B("M1", "B-2025-0388", "2025-11-02", 900, "2025-08-14"),
      B("M1", "B-2025-0501", "2027-03-01", 5400, "2025-10-06"),
      B("M2", "B-2025-0455", "2026-06-20", 2800, "2025-09-12"),
      B("M2", "B-2025-0470", "2025-12-15", 1200, "2025-09-28"),
      B("M3", "B-2025-0390", "2027-01-05", 6800, "2025-08-20"),
      B("M3", "B-2025-0421", "2026-02-11", 4100, "2025-09-05"),
      B("M4", "B-2025-012", "2025-11-12", 1240, "2025-07-18"),
      B("M4", "B-2025-030", "2026-04-30", 2100, "2025-09-22"),
      B("M5", "B-2025-006", "2029-01-01", 12, "2025-06-10"),
      B("M6", "B-2025-0488", "2026-08-09", 3600, "2025-10-01"),
      B("M6", "B-2025-0489", "2025-10-28", 700, "2025-10-01")
    ];
    let r = 0;
    const R = (fac, prog, items, status, extra) => Object.assign({
      id: "PRM-2025-" + String(100 + (++r)).padStart(3, "0"),
      facilityId: fac, program: prog, items, status,
      createdAt: "2025-10-" + String(6 + (r % 7)).padStart(2, "0") + "T" + String(8 + (r % 8)).padStart(2, "0") + ":30:00",
      histori: [], pickupDate: null, distributionId: null
    }, extra || {});
    const requests = [
      R("F1", "Program TB-RO", [{ medicineId: "M1", qty: 120 }, { medicineId: "M2", qty: 60 }], "SUBMITTED"),
      R("F3", "Program Stunting", [{ medicineId: "M4", qty: 80 }], "SUBMITTED"),
      R("F4", "Program IGD", [{ medicineId: "M3", qty: 300 }], "PROGRAM_APPROVED",
        { histori: [{ ts: "2025-10-11T09:15:00", user: "dr. Sari Wulandari", stage: "PROGRAM", action: "APPROVE", note: "Kebutuhan sesuai surveilans IGD." }] }),
      R("F6", "Program Diabetes", [{ medicineId: "M6", qty: 150 }], "PROGRAM_APPROVED",
        { histori: [{ ts: "2025-10-11T10:02:00", user: "dr. Sari Wulandari", stage: "PROGRAM", action: "APPROVE", note: "OK" }] }),
      R("F2", "Program Imunisasi", [{ medicineId: "M4", qty: 200 }], "FARMACY_APPROVED",
        { items: [{ medicineId: "M4", qty: 200, realisasi: 180 }],
          histori: [
            { ts: "2025-10-10T08:40:00", user: "dr. Sari Wulandari", stage: "PROGRAM", action: "APPROVE", note: "Sesuai target bulan ini." },
            { ts: "2025-10-11T13:20:00", user: "Yusuf Hidayat", stage: "FARMACY", action: "APPROVE", note: "Realisasi 180 vial (stok FEFO B-2025-012)." }] }),
      R("F5", "Program Hypertensi", [{ medicineId: "M1", qty: 90 }], "FARMACY_APPROVED",
        { items: [{ medicineId: "M1", qty: 90, realisasi: 90 }],
          histori: [
            { ts: "2025-10-10T09:00:00", user: "dr. Sari Wulandari", stage: "PROGRAM", action: "APPROVE", note: "OK" },
            { ts: "2025-10-11T14:05:00", user: "Yusuf Hidayat", stage: "FARMACY", action: "APPROVE", note: "Realisasi penuh." }] }),
      R("F7", "Program TB-RO", [{ medicineId: "M1", qty: 60 }, { medicineId: "M6", qty: 40 }], "STOCK_ALLOCATED",
        { items: [{ medicineId: "M1", qty: 60, realisasi: 60 }, { medicineId: "M6", qty: 40, realisasi: 40 }],
          histori: [
            { ts: "2025-10-09T08:30:00", user: "dr. Sari Wulandari", stage: "PROGRAM", action: "APPROVE", note: "OK" },
            { ts: "2025-10-09T11:10:00", user: "Yusuf Hidayat", stage: "FARMACY", action: "APPROVE", note: "Realisasi penuh." },
            { ts: "2025-10-10T08:00:00", user: "Sistem", stage: "ALOKASI", action: "ALLOCATE", note: "Stok dikunci (allocated)." }] }),
      R("F8", "Program Stunting", [{ medicineId: "M4", qty: 100 }], "PICKUP_SCHEDULED",
        { items: [{ medicineId: "M4", qty: 100, realisasi: 100 }], pickupDate: "2025-10-16",
          histori: [
            { ts: "2025-10-08T09:00:00", user: "dr. Sari Wulandari", stage: "PROGRAM", action: "APPROVE", note: "OK" },
            { ts: "2025-10-08T13:00:00", user: "Yusuf Hidayat", stage: "FARMACY", action: "APPROVE", note: "Realisasi penuh." },
            { ts: "2025-10-09T08:00:00", user: "Sistem", stage: "ALOKASI", action: "ALLOCATE", note: "Stok dikunci." },
            { ts: "2025-10-10T10:00:00", user: "Andi Pratama", stage: "JADWAL", action: "SCHEDULE", note: "Pickup 16 Okt 2025." }] }),
      R("F2", "Program Imunisasi Lanjutan", [{ medicineId: "M4", qty: 50 }], "ITEM_COLLECTED",
        { items: [{ medicineId: "M4", qty: 50, realisasi: 50 }], pickupDate: "2025-10-13", distributionId: "DIST-2025-018",
          histori: [
            { ts: "2025-10-07T08:00:00", user: "dr. Sari Wulandari", stage: "PROGRAM", action: "APPROVE", note: "OK" },
            { ts: "2025-10-07T10:30:00", user: "Yusuf Hidayat", stage: "FARMACY", action: "APPROVE", note: "Realisasi penuh." },
            { ts: "2025-10-08T08:00:00", user: "Sistem", stage: "ALOKASI", action: "ALLOCATE", note: "Stok dikunci." },
            { ts: "2025-10-13T09:12:00", user: "Budi Santoso", stage: "PICKUP", action: "COLLECT", note: "Barang diambil, menunggu serah terima final." }] }),
      R("F4", "Program IGD", [{ medicineId: "M3", qty: 150 }], "COMPLETED",
        { items: [{ medicineId: "M3", qty: 150, realisasi: 150 }], pickupDate: "2025-10-12", distributionId: "DIST-2025-017",
          histori: [
            { ts: "2025-10-06T08:00:00", user: "dr. Sari Wulandari", stage: "PROGRAM", action: "APPROVE", note: "OK" },
            { ts: "2025-10-06T11:00:00", user: "Yusuf Hidayat", stage: "FARMACY", action: "APPROVE", note: "Realisasi penuh." },
            { ts: "2025-10-07T08:00:00", user: "Sistem", stage: "ALOKASI", action: "ALLOCATE", note: "Stok dikunci." },
            { ts: "2025-10-12T08:30:00", user: "Budi Santoso", stage: "PICKUP", action: "COLLECT", note: "Diambil sesuai jadwal." },
            { ts: "2025-10-12T09:12:00", user: "Budi Santoso", stage: "SERAH TERIMA", action: "COMPLETE", note: "Bukti serah terima QR DIST-2025-017." }] }),
      R("F5", "Program TB-RO", [{ medicineId: "M2", qty: 30 }], "REJECTED",
        { histori: [
          { ts: "2025-10-09T09:00:00", user: "dr. Sari Wulandari", stage: "PROGRAM", action: "REJECT", note: "Stok program TB sudah dialokasikan untuk kuartal ini." }] })
    ];
    return {
      seq: { req: 112, dist: 19, ret: 4, disp: 3, act: 6 },
      session: null,
      issuedCumulative: 1842,
      facilities: facs, medicines: meds, batches, requests,
      schedules: [{ date: "2025-10-16", reqIds: ["PRM-2025-108"], kabkota: ["Kab. Tasikmalaya"] }],
      returns: [
        { id: "RET-2025-003", distributionId: "DIST-2025-017", facilityId: "F4", items: [{ medicineId: "M3", qty: 12 }], reason: "Kemasan rusak saat transport", disposition: "restock", user: "Budi Santoso", ts: "2025-10-09T14:20:00" }
      ],
      disposals: [
        { id: "DSP-2025-002", batchId: "B-2025-0388", medicineId: "M1", qty: 120, reason: "Kedaluwarsa", doc: "berita-acara-DSP-002.pdf", user: "Budi Santoso", ts: "2025-10-05T10:00:00" }
      ],
      activities: [
        { ts: "2025-10-13T09:45:00", type: "green", title: "Permohonan disetujui", sub: "RSUD Majalengka" },
        { ts: "2025-10-13T09:12:00", type: "blue", title: "Pickup selesai", sub: "Kota Cirebon · serah terima tercatat" },
        { ts: "2025-10-13T09:30:00", type: "yellow", title: "Batch masuk", sub: "Gudang Bandung · B-2025-0412" },
        { ts: "2025-10-13T08:47:00", type: "green", title: "Slot pickup dibuat", sub: "15 Okt · Kab. Bogor" },
        { ts: "2025-10-13T08:02:00", type: "red", title: "Peringatan kadaluarsa", sub: "Vaksin DPT · batch B-2025-012" }
      ]
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    const s = seed();
    save(s);
    return s;
  }
  function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }
  function reset() { localStorage.removeItem(KEY); return load(); }

  function hist(st, req, stage, action, user, note) {
    req.histori.push({ ts: nowISO(), user, stage, action, note: note || "" });
    const LBL = { APPROVE: "Permohonan disetujui", REJECT: "Permohonan ditolak", SCHEDULE: "Pickup dijadwalkan", COLLECT: "Barang diambil gudang", COMPLETE: "Pickup selesai", ALLOCATE: "Stok dialokasikan" };
    pushAct(st, action === "REJECT" ? "red" : action === "COMPLETE" ? "blue" : "green",
      LBL[action] || "Permohonan diperbarui",
      facName(st, req.facilityId) + " · " + req.id);
  }
  function pushAct(st, type, title, sub) {
    st.activities.unshift({ ts: nowISO(), type, title, sub });
    st.activities = st.activities.slice(0, 12);
  }
  function nowISO() {
    // demo clock: tanggal TODAY, jam nyata — histori konsisten 13 Okt 2025
    const n = new Date(), p = x => String(x).padStart(2, "0");
    return `${TODAY.getFullYear()}-${p(TODAY.getMonth() + 1)}-${p(TODAY.getDate())}T${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
  }
  function facName(st, id) { const f = st.facilities.find(x => x.id === id); return f ? f.name : id; }

  /* ===== stock model ===== */
  // allocated = realisasi permohonan aktif (FARMACY_APPROVED..ITEM_COLLECTED) — RULE-STOCK-002
  function allocatedByMed(st) {
    const map = {};
    for (const r of st.requests) {
      if (["FARMACY_APPROVED", "STOCK_ALLOCATED", "PICKUP_SCHEDULED", "ITEM_COLLECTED"].includes(r.status)) {
        for (const it of r.items) {
          const q = it.realisasi != null ? it.realisasi : 0;
          if (q > 0) map[it.medicineId] = (map[it.medicineId] || 0) + q;
        }
      }
    }
    return map;
  }
  function onHandByMed(st) {
    const map = {};
    for (const b of st.batches) map[b.medicineId] = (map[b.medicineId] || 0) + b.qty;
    return map;
  }
  function stockSummary(st) {
    const onHand = onHandByMed(st), alloc = allocatedByMed(st);
    let total = 0, allocated = 0;
    for (const m of st.medicines) { total += onHand[m.id] || 0; allocated += alloc[m.id] || 0; }
    return { total, allocated, available: total - allocated, issued: st.issuedCumulative };
  }
  // FEFO ordering — RULE-BATCH-001: expiry terdekat, lalu masuk terdahulu, lalu kode terkecil
  function fefoBatches(st, medicineId) {
    return st.batches.filter(b => b.medicineId === medicineId && b.qty > 0)
      .sort((a, b) => a.expiry.localeCompare(b.expiry) || a.receivedAt.localeCompare(b.receivedAt) || a.code.localeCompare(b.code));
  }
  function pickingPlan(st, items) { // [{medicineId, qty}] -> [{batchId, code, expiry, take}]
    const plan = [];
    for (const it of items) {
      let need = it.realisasi || 0;
      for (const b of fefoBatches(st, it.medicineId)) {
        if (need <= 0) break;
        const take = Math.min(need, b.qty);
        plan.push({ batchId: b.id, code: b.code, expiry: b.expiry, take });
        need -= take;
      }
      if (need > 0) plan.push({ batchId: null, code: "STOK KURANG", expiry: "-", take: need });
    }
    return plan;
  }

  /* ===== schedule quota — RULE-SCHEDULE-001/002 ===== */
  function quotaOf(st, dateStr) {
    const sch = st.schedules.find(s => s.date === dateStr);
    return sch ? { used: new Set(sch.kabkota).size, kabkota: sch.kabkota } : { used: 0, kabkota: [] };
  }
  function dateISO(d) {
    const p = x => String(x).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function availablePickupDates(st) {
    const out = [];
    for (let i = 3; i <= 21; i++) { // minimal H-3
      const d = new Date(TODAY); d.setDate(d.getDate() + i);
      const ds = dateISO(d), q = quotaOf(st, ds);
      if (q.used < 6) out.push(ds); // tanggal penuh tidak muncul — RULE-SCHEDULE-001
    }
    return out;
  }

  /* ===== actions ===== */
  const A = {
    login(role) {
      const st = load();
      const cfg = ROLES[role];
      st.session = { role, name: cfg.user, facility: cfg.facility };
      save(st);
      return st.session;
    },
    logout() { const st = load(); st.session = null; save(st); },
    reset() { return reset(); },
    roles() { return Object.keys(ROLES); },
    navFor(role) { return (ROLES[role] || {}).nav || []; },

    createRequest({ facilityId, program, items, note, user }) {
      const st = load();
      const req = {
        id: "PRM-2025-" + String(st.seq.req++).padStart(3, "0"),
        facilityId, program, items, status: "SUBMITTED",
        createdAt: nowISO(), histori: [], pickupDate: null, distributionId: null
      };
      req.histori.push({ ts: nowISO(), user, stage: "SUBMIT", action: "SUBMIT", note: note || "" });
      st.requests.unshift(req);
      pushAct(st, "yellow", "Permohonan baru", facName(st, facilityId) + " · " + req.id);
      save(st);
      return req;
    },
    approveProgram(id, user, note) {
      const st = load();
      const r = st.requests.find(x => x.id === id);
      if (!r || r.status !== "SUBMITTED") return null;
      r.status = "PROGRAM_APPROVED";
      hist(st, r, "PROGRAM", "APPROVE", user, note);
      save(st); return r;
    },
    reject(id, stage, user, note) {
      const st = load();
      const r = st.requests.find(x => x.id === id);
      if (!r || ["COMPLETED", "REJECTED"].includes(r.status)) return null;
      r.status = "REJECTED";
      hist(st, r, stage, "REJECT", user, note);
      save(st); return r;
    },
    // Approval farmasi + realisasi; alokasi mengunci stok — RULE-STOCK-001/002
    approveFarmasi(id, user, note, realisasi) {
      const st = load();
      const r = st.requests.find(x => x.id === id);
      if (!r || r.status !== "PROGRAM_APPROVED") return null;
      realisasi = realisasi || {};
      r.items = r.items.map(it => ({ ...it, realisasi: Math.min(realisasi[it.medicineId] != null ? realisasi[it.medicineId] : it.qty, it.qty) }));
      // validasi ketersediaan fisik
      const onHand = onHandByMed(st), alloc = allocatedByMed(st);
      for (const it of r.items) {
        const need = it.realisasi || 0;
        if (need > (onHand[it.medicineId] || 0) - (alloc[it.medicineId] || 0)) {
          return { error: `Stok tersedia tidak cukup untuk ${medName(st, it.medicineId)}` };
        }
      }
      r.status = "FARMACY_APPROVED";
      hist(st, r, "FARMACY", "APPROVE", user, note);
      // alokasi otomatis setelah approval farmasi
      r.status = "STOCK_ALLOCATED";
      hist(st, r, "ALOKASI", "ALLOCATE", "Sistem", "Stok dikunci (allocated).");
      save(st); return r;
    },
    schedulePickup(id, dateStr, user) {
      const st = load();
      const r = st.requests.find(x => x.id === id);
      if (!r || r.status !== "STOCK_ALLOCATED") return { error: "Status belum STOCK_ALLOCATED" };
      if (!availablePickupDates(st).includes(dateStr)) return { error: "Tanggal tidak tersedia (H-3 atau kuota penuh)" };
      const fac = st.facilities.find(f => f.id === r.facilityId);
      let sch = st.schedules.find(s => s.date === dateStr);
      if (!sch) { sch = { date: dateStr, reqIds: [], kabkota: [] }; st.schedules.push(sch); }
      if (!sch.kabkota.includes(fac.kabkota)) {
        if (new Set(sch.kabkota).size >= 6) return { error: "Kuota 6 kab/kota per hari sudah penuh" };
        sch.kabkota.push(fac.kabkota);
      }
      sch.reqIds.push(r.id);
      r.status = "PICKUP_SCHEDULED";
      r.pickupDate = dateStr;
      hist(st, r, "JADWAL", "SCHEDULE", user, "Pickup " + dateStr + ".");
      save(st); return r;
    },
    collect(id, user) {
      const st = load();
      const r = st.requests.find(x => x.id === id);
      if (!r || r.status !== "PICKUP_SCHEDULED") return null;
      r.status = "ITEM_COLLECTED";
      r.distributionId = "DIST-2025-" + String(st.seq.dist++).padStart(3, "0");
      hist(st, r, "PICKUP", "COLLECT", user, "Barang diambil, menunggu serah terima final.");
      save(st); return r;
    },
    // COMPLETED: fisik berkurang (batch FEFO dikonsumsi), issued bertambah — RULE-DISTRIBUTION-001
    complete(id, user) {
      const st = load();
      const r = st.requests.find(x => x.id === id);
      if (!r || r.status !== "ITEM_COLLECTED") return null;
      const plan = pickingPlan(st, r.items);
      for (const p of plan) {
        const b = st.batches.find(x => x.id === p.batchId);
        if (b) b.qty = Math.max(0, b.qty - p.take);
      }
      st.issuedCumulative += r.items.reduce((s, it) => s + (it.realisasi || 0), 0);
      r.status = "COMPLETED";
      hist(st, r, "SERAH TERIMA", "COMPLETE", user, "Bukti serah terima QR " + r.distributionId + ".");
      save(st); return { req: r, plan };
    },
    // Retur = transaksi retur, BUKAN penerimaan baru (PRD 7.6)
    createReturn({ distributionId, facilityId, items, reason, disposition, user }) {
      const st = load();
      const ret = { id: "RET-2025-" + String(st.seq.ret++).padStart(3, "0"), distributionId, facilityId, items, reason, disposition, user, ts: nowISO() };
      st.returns.unshift(ret);
      pushAct(st, "yellow", "Retur dicatat", distributionId + " · " + ret.id);
      save(st); return ret;
    },
    createDisposal({ batchId, medicineId, qty, reason, doc, user }) {
      const st = load();
      const b = st.batches.find(x => x.id === batchId);
      if (!b || b.qty < qty) return { error: "Jumlah melebihi stok batch" };
      b.qty -= qty;
      const d = { id: "DSP-2025-" + String(st.seq.disp++).padStart(3, "0"), batchId, medicineId, qty, reason, doc, user, ts: nowISO() };
      st.disposals.unshift(d);
      pushAct(st, "red", "Pemusnahan dicatat", medName(st, medicineId) + " · " + d.id);
      save(st); return d;
    },
    receiveBatch({ medicineId, code, expiry, qty, location, user }) {
      const st = load();
      const b = { id: "B" + Date.now(), medicineId, code, expiry, qty, receivedAt: nowISO().slice(0, 10), location: location || "Gudang Bandung" };
      st.batches.push(b);
      pushAct(st, "yellow", "Batch masuk", (location || "Gudang Bandung") + " · " + code);
      save(st); return b;
    }
  };

  function medName(st, id) { const m = st.medicines.find(x => x.id === id); return m ? m.name : id; }

  /* ===== public API ===== */
  window.SIM = {
    ROLES, KABKOTA, TODAY,
    load, save, reset, nowISO,
    state: load,
    actions: A,
    stockSummary, allocatedByMed, onHandByMed, fefoBatches, pickingPlan,
    quotaOf, availablePickupDates,
    medName: (id) => medName(load(), id),
    facName: (id) => facName(load(), id),
    facility: (id) => load().facilities.find(f => f.id === id),
    medicine: (id) => load().medicines.find(m => m.id === id)
  };
})();
