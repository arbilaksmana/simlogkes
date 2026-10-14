# PRD FINAL

# SIMLOGKES

## Sistem Informasi Manajemen Logistik Kesehatan Terintegrasi

## 1. Identitas Produk

**Nama Produk:** SIMLOGKES\
**Kepemilikan Sistem:** Dinas Kesehatan Provinsi Jawa Barat\
**Jenis Sistem:** Sistem Informasi Manajemen Logistik Kesehatan
Terintegrasi

SIMLOGKES merupakan revitalisasi dan penggabungan sistem E-Logistik dan
SIMPONI menjadi satu platform terpadu untuk mengelola siklus logistik
kesehatan mulai dari registrasi fasilitas kesehatan, permohonan,
persetujuan, alokasi stok, pengambilan, distribusi, retur, pemusnahan,
hingga pelaporan.

------------------------------------------------------------------------

# 2. Tujuan Produk

SIMLOGKES bertujuan untuk:

1.  Menghilangkan ketergantungan pengembangan sistem terhadap vendor
    eksternal.
2.  Menyatukan proses bisnis E-Logistik dan SIMPONI dalam satu platform.
3.  Menyediakan satu sumber data utama untuk logistik kesehatan.
4.  Meningkatkan akurasi stok antara sistem dan kondisi fisik gudang.
5.  Mempercepat proses permohonan, approval, distribusi, dan pelaporan.
6.  Mendukung pengambilan keputusan melalui dashboard monitoring.

------------------------------------------------------------------------

# 3. Prinsip Utama Sistem

## 3.1 Single Source of Truth

Seluruh data logistik menggunakan satu basis data utama.

SIMLOGKES menjadi sumber kebenaran untuk:

-   master sediaan
-   stok
-   batch
-   distribusi
-   permohonan
-   laporan

------------------------------------------------------------------------

## 3.2 Integrated Workflow

Seluruh proses menggunakan satu alur:

    Registrasi
    ↓
    Permohonan
    ↓
    Approval Program
    ↓
    Approval Farmasi
    ↓
    Alokasi Stok
    ↓
    Penjadwalan Pengambilan
    ↓
    Serah Terima
    ↓
    Pelaporan

------------------------------------------------------------------------

# 4. Keputusan Bisnis Final

## 4.1 Pengelolaan Stok

SIMLOGKES menggunakan konsep **Allocated Stock Management**.

Barang yang telah disetujui tetapi belum diambil tidak langsung
mengurangi stok fisik.

Model stok:

    Total Stock

    Allocated Stock

    Available Stock

    Issued Stock

Formula:

    Available Stock =
    Total Stock - Allocated Stock - Issued Stock

------------------------------------------------------------------------

## 4.2 Penyelesaian Distribusi

Permohonan hanya dianggap selesai apabila:

1.  Barang telah diambil oleh pihak pemohon.
2.  Bukti serah terima telah tersedia.
3.  Transaksi distribusi selesai.

Status selesai tidak ditentukan hanya berdasarkan approval.

------------------------------------------------------------------------

## 4.3 Pengelolaan Batch

SIMLOGKES menggunakan aturan:

    FEFO (First Expired First Out)

Prioritas batch:

1.  Tanggal kedaluwarsa paling dekat.
2.  Jika tanggal kedaluwarsa sama, gunakan batch yang masuk lebih
    dahulu.
3.  Jika masih sama, gunakan nomor batch terkecil.

------------------------------------------------------------------------

## 4.4 Jadwal Pengambilan

Aturan jadwal:

-   Berlaku untuk seluruh Provinsi Jawa Barat.
-   Pengajuan pengambilan minimal H-3.
-   Kapasitas maksimal 6 kabupaten/kota per hari.
-   Perhitungan kuota berdasarkan kabupaten/kota unik.
-   Program dalam satu kabupaten/kota tidak menambah kuota.

------------------------------------------------------------------------

# 5. Aktor Sistem

  Aktor             Fungsi
  ----------------- -----------------------------------------------------
  Petugas Faskes    Membuat permohonan dan melakukan pengambilan
  Petugas Program   Melakukan verifikasi kebutuhan program
  Petugas Farmasi   Validasi stok dan persetujuan distribusi
  Petugas Gudang    Mengelola penerimaan, distribusi, retur, pemusnahan
  Administrator     Mengelola user, role, dan master data
  Kepala Bidang     Monitoring dan persetujuan tertentu

------------------------------------------------------------------------

# 6. State Machine Permohonan

    SUBMITTED

    ↓

    PROGRAM_APPROVED

    ↓

    FARMACY_APPROVED

    ↓

    STOCK_ALLOCATED

    ↓

    PICKUP_SCHEDULED

    ↓

    ITEM_COLLECTED

    ↓

    COMPLETED

## Definisi Status

### SUBMITTED

Permohonan telah dikirim oleh fasilitas kesehatan.

### PROGRAM_APPROVED

Permohonan disetujui berdasarkan kebutuhan program.

### FARMACY_APPROVED

Farmasi menentukan jumlah realisasi.

### STOCK_ALLOCATED

Sistem mengunci stok agar tidak digunakan transaksi lain.

### PICKUP_SCHEDULED

Pemohon mendapatkan jadwal pengambilan.

### ITEM_COLLECTED

Barang telah diambil.

### COMPLETED

Serah terima selesai.

------------------------------------------------------------------------

# 7. Modul Sistem

## 7.1 Registrasi Fasilitas Kesehatan

Fitur:

-   registrasi akun
-   verifikasi dokumen
-   pengelolaan profil fasilitas kesehatan

------------------------------------------------------------------------

## 7.2 Permohonan Logistik

Fitur:

-   membuat permohonan
-   memilih sediaan
-   melihat ketersediaan stok
-   upload dokumen pendukung
-   tracking status

------------------------------------------------------------------------

## 7.3 Approval

Tahapan:

1.  Approval Program
2.  Approval Farmasi

Setiap approval wajib memiliki:

-   pengguna approval
-   waktu approval
-   catatan
-   histori perubahan

------------------------------------------------------------------------

## 7.4 Inventory Management

Sistem mengelola:

-   stok tersedia
-   stok dialokasikan
-   stok keluar
-   stok batch
-   lokasi penyimpanan

------------------------------------------------------------------------

## 7.5 Distribusi

Fitur:

-   picking barang
-   pencatatan barang keluar
-   bukti serah terima
-   QR Code tracking

------------------------------------------------------------------------

## 7.6 Retur

Aturan:

Retur harus dicatat sebagai transaksi retur.

Retur tidak boleh dianggap sebagai penerimaan baru.

------------------------------------------------------------------------

## 7.7 Pemusnahan

Mendukung:

-   pencatatan barang
-   alasan pemusnahan
-   dokumen pendukung
-   histori

------------------------------------------------------------------------

# 8. Business Rules

## RULE-STOCK-001

Approval farmasi tidak mengurangi stok fisik.

------------------------------------------------------------------------

## RULE-STOCK-002

Barang allocated tidak dapat digunakan transaksi lain.

------------------------------------------------------------------------

## RULE-DISTRIBUTION-001

Status COMPLETED hanya terjadi setelah barang diambil dan serah terima
selesai.

------------------------------------------------------------------------

## RULE-BATCH-001

Seluruh transaksi distribusi wajib mengikuti FEFO.

------------------------------------------------------------------------

## RULE-SCHEDULE-001

Tanggal penuh tidak boleh muncul sebagai pilihan pengguna.

------------------------------------------------------------------------

## RULE-SCHEDULE-002

Kuota dihitung berdasarkan kabupaten/kota unik.

------------------------------------------------------------------------

# 9. Entitas Utama

    User

    Facility

    Medicine

    Batch

    Inventory

    Request

    Approval

    Allocation

    PickupSchedule

    Distribution

    Return

    Disposal

    Report

------------------------------------------------------------------------

# 10. Dashboard Monitoring

Dashboard menampilkan:

-   jumlah permohonan
-   jumlah disetujui
-   jumlah ditolak
-   jumlah terjadwal
-   stok tersedia
-   stok mendekati kedaluwarsa
-   distribusi berjalan
-   histori transaksi

------------------------------------------------------------------------

# 11. Laporan

Sistem menyediakan:

-   laporan stok
-   laporan distribusi
-   laporan penerimaan
-   laporan retur
-   laporan pemusnahan
-   laporan kedaluwarsa
-   laporan permohonan

Seluruh laporan dapat:

-   dilihat
-   diunduh
-   dicetak

------------------------------------------------------------------------

# 12. Kebutuhan Non Fungsional

## Keamanan

-   Role based access control.
-   Audit trail transaksi.
-   Backup database.
-   Validasi dokumen upload.

## Performa

-   Pagination data besar.
-   Optimasi query.
-   Dashboard berbasis agregasi.

## Maintainability

-   Sistem dikembangkan internal.
-   Dokumentasi database tersedia.
-   Struktur kode modular.

------------------------------------------------------------------------

# 13. Target Keberhasilan

SIMLOGKES dianggap berhasil apabila:

1.  Tidak terdapat ketergantungan operasional terhadap vendor eksternal.
2.  Data stok sistem sesuai dengan stok fisik.
3.  Proses permohonan hingga distribusi dapat dilacak.
4.  Laporan dapat dihasilkan tanpa pengolahan manual.
5.  Obat mendekati kedaluwarsa dapat dimonitor lebih awal.

------------------------------------------------------------------------

# 14. Nama Sistem Final

Nama resmi sistem:

# SIMLOGKES

Sistem Informasi Manajemen Logistik Kesehatan Terintegrasi

Pemilik:

Dinas Kesehatan Provinsi Jawa Barat
