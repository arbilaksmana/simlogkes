# SIMLOGKES Prototype

Prototype referensi PRD_FINAL_SIMLOGKES_AI_AGENT.md — HTML/CSS/JS vanilla, tanpa build step.

<!-- codex-active-context:start -->
## Active Context

- Last updated: 2026-10-14
- Goal: Prototype fungsional penuh (13 halaman) dari desain pen.dev + PRD
- Status: Selesai & terverifikasi — live data penuh, RBAC, state machine + FEFO; responsive 3 breakpoint; audit PRD lolos: dashboard §10 lengkap (Disetujui/Ditolak KPI + stat strip Stok Fisik/Tersedia/Dialokasikan/Pickup Terlambat kini live), note distribusi = issuedCumulative unit
- Next steps: (opsional) QR tracking nyata, upload file nyata, cetak/unduh laporan nyata — kini link/UI prototipe
- Verification: Playwright 3 viewport (1440/820/390) — overflow NONE di 14 halaman; peta scale(0.475)@390px; filter Kategori=Vaksin→1 baris, Status=Di bawah min→0+empty-state; 0 JS error
<!-- codex-active-context:end -->

## Struktur

- `app/*.html` — halaman (shell statis dari ekspor pen, tbody/KPI diisi `app.js`)
- `app/assets/store.js` — seed + state machine + localStorage (`simlogkes_v2`), demo date 13 Okt 2025
- `app/assets/app.js` — renderer per halaman, guard RBAC, dialog, event delegation
- `design/` — referensi statis dari pen.dev (html-css export)
- Login: pilih role (Administrator/Farmasi/Gudang/Faskes) — nav & akses URL dibatasi per role

## Konvensi

- KPI/chips/angka bertanda `data-live="kunci"` diisi renderer; jangan biarkan angka statis kontradiktif
- Tabel: renderer `R["<page>.html"]` wajib cocok dengan thead (jumlah & urutan kolom)
- Tanggal selalu format lokal (bukan `toISOString()`) — hindari offset WIB
- Reset data demo: jalankan `SIM.actions.reset()` di console
