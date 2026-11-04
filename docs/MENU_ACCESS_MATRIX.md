# Sidebar Menu & Route Access Matrix

This document outlines the authoritative role-based access permissions for each menu item, group, and route in the **Zen Warehouse Management System (WHMS) & Backoffice** (`frontend\warehousemanagement`), synchronized with `src/components/layout/Sidebar.tsx` and `src/App.tsx`.

*Last Updated: 4 November 2026*

---

## 1. Role Reference (Role IDs 1 – 19)

| Role ID | System Role Code | Indonesian Role Title | WHM Access Status | Scope & Capabilities |
|:---:|:---|:---|:---:|:---|
| **1** | `admin_holding` | Admin Holding | ✅ Active | Holding Headquarters Administrator (Cross-outlet procurement & finance oversight) |
| **2** | `staff_holding` | Staff Holding | ✅ Active | Holding Operational Staff (Assists central inventory & receiving) |
| **3** | `laundry_admin` | Admin Laundry | ✅ Active | Laundry Hub Administrator (Linen & laundry cycle management) |
| **4** | `laundry_staff` | Staf Laundry | ✅ Active | Laundry Operational Staff (Laundry processing & tracking) |
| **5** | `finance` | Finance Holding | ✅ Active | Global / Holding Finance (Multi-outlet reports, transaction categories, cash flow, audit) |
| **6** | `outlet_admin` | Admin Cabang (Outlet) | ✅ Active | Branch Manager / Admin (Procurement, STO request/create, master data, outlet info, CRM, user approval) |
| **7** | `warehouse_staff`| Staf Gudang (Outlet) | ✅ Active | Branch Warehouse Staff (Stock Opname, Goods Receipt, STO Issue/Receipt, Internal Usage/Return, Production) |
| **8** | `SUPERUSER` | Superuser | ✅ Active | Full System Super Administrator (Unrestricted access to all modules, settings, and branches) |
| **9** | `UNASSIGNED` | Belum Ditugaskan | ❌ Blocked | Unapproved or unassigned user account (Login blocked from WHM) |
| **10** | `finance_outlet` | Finance Cabang | ✅ Active | Outlet Finance Officer (Branch procurement, STO invoicing/settlement, local cash transactions, CRM holding) |
| **11** | `therapist` | Terapis | ❌ Blocked | Spa / Reflexology Therapist (Internal App PWA only, blocked from WHM) |
| **12** | `operational_staff` | Staf Operasional | ❌ Blocked | General Operational Staff (Internal App PWA only, blocked from WHM) |
| **13** | `role_13` | Supervisor / Direksi | ✅ Active | Executive Supervisor / Board of Directors (Multi-outlet report viewing, Web Data & CMS administration) |
| **14** | `role_14` | Auditor Internal | ✅ Active | Multi-Outlet Auditor (All-outlet report access, read-only analytics) |
| **15** | `role_15` | Reserved | ❌ Blocked | Reserved for future organizational roles |
| **16** | `role_16` | HR / Evaluator TR | ✅ Active | HR & Evaluator Terapis (Akses Kategori, Variabel, dan Pembuatan Evaluasi TR) |
| **17** | `member` | Pelanggan / Tamu | ❌ Blocked | Public Web Member (Public static website only, strictly blocked from WHM) |
| **18** | `web_admin` | Web Admin | ✅ Active | Digital Media & Content Administrator (Full access to Web Data CMS, CRM chats, and WHM modules) |
| **19** | `reception` | Resepsionis Cabang | ✅ Active | Branch Receptionist / Front Office (CRM Inbox Outlet, live reservation chats for assigned branch) |

---

## 2. Multi-Outlet Scoping & Branch Selector Rules

1. **Multi-Outlet Privileged Roles (`[5, 8, 13, 14]`):**
   * Report and analysis pages display the **Outlet Dropdown Selector** allowing users to switch between `"ALL" / "SEMUA OUTLET"` or a specific branch (`kode_outlet` from `master_outlet` where `can_sto = true`).
   * A4 Printouts (`printReportA4`) automatically format the header with `"ALL OUTLET"` or the specific branch details (address, phone, email) based on the selection.
2. **Single-Outlet Scoped Roles (`[6, 7, 10, 19]`):**
   * Navigation, data queries, and mutations are **strictly locked** to the user's assigned branch (`user.kode_outlet`).
   * No branch dropdown selector is shown; data filtering is enforced automatically at the application and query level.
3. **Superuser & Web Admin Auto-Bypass (`[8, 18]`):**
   * In `Sidebar.tsx`:
     ```typescript
     if (user.user_role === 8 || user.user_role === 18) return true;
     ```
     Users with Role ID `8` or `18` automatically pass item-level sidebar role checks. Role 8 has full access to every system route, while Role 18 is dedicated to Web Data CMS, CRM Inbox, and operational interfaces.

---

## 3. Comprehensive Menu & Route Access Matrix

### 3.1. General & Dashboard
| Menu Item | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Dasbor Utama** | `/dashboard` | `Warehouse` | **3, 4, 5, 6, 7, 8, 10** (18) | Authenticated | Halaman beranda utama WHMS menampilkan metrik inventaris, ringkasan transaksi, dan indikator status stok. |
| **Manajemen Pengguna** | `/users` | `Users` | **6, 8** | `[6, 8]` | Manajemen akun staf. Role 8 (Superuser) dapat mengelola seluruh outlet & mengubah role apa pun. Role 6 (Admin Outlet) terbatas pada cabang sendiri untuk persetujuan akun operasional (Role 12). |

---

### 3.2. Inventaris & Stok (Inventory)
**Grup Akses Sidebar:** Finance (5), Outlet Admin (6), Warehouse Staff (7), SUPERUSER (8), Finance Outlet (10)
| Submenu | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Stock Opname** | `/inventory/stock-opname` | `ClipboardList` | **6, 7** | `[6, 7, 8]` | Pelaksanaan stock opname fisik gudang, pencatatan batch opname, dan penghitungan selisih. |
| **Penyusutan / Pemusnahan** | `/inventory/shrinkage` | `AlertTriangle` | **6, 7** | `[6, 7, 8]` | Pencatatan barang rusak, tumpah, kadaluarsa, atau hilang dengan pilihan kategori penyusutan standar. |
| **Laporan Nilai Stok** | `/inventory/report` | `TrendingUp` | **5, 6, 8, 10** | `[1, 5, 6, 8, 10]` | Laporan valuasi nominal rupiah persediaan stok. *(Catatan: Role 7 Staf Gudang dinonaktifkan dari menu ini).* |
| **Laporan Kuantitas Stok** | `/inventory/report-qty` | `Boxes` | **5, 6, 7, 8, 10** | `[1, 5, 6, 7, 8, 10]` | Laporan kuantitas fisik persediaan barang gudang (satuan dasar/base UOM), saldo awal, masuk, keluar, dan saldo akhir. |
| **Laporan Penyusutan** | `/inventory/report-shrinkage` | `AlertOctagon` | **5, 6, 7, 8, 10** | `[1, 5, 6, 7, 8, 10]` | Riwayat dan audit penyusutan/pemusnahan barang per kategori, tanggal, dan cabang. |
| **Laporan Selisih Opname** | `/inventory/report-opname-variance` | `Scale` | **5, 6, 7, 8, 10** | `[1, 5, 6, 7, 8, 10]` | Laporan audit selisih opname vs data sistem (mendukung toggle "Tampilkan Hanya yang Berselisih"). |
| **Laporan Pemakaian Internal** | `/inventory/report-internal-usage` | `LogOut` | **5, 6, 7, 8, 10** | `[1, 5, 6, 7, 8, 10]` | Laporan riwayat pemakaian barang operasional cabang (linen, minyak spa, amenities) lengkap dengan ekspor CSV. |
| **Laporan Retur Internal** | `/inventory/report-internal-return` | `Undo2` | **5, 6, 7, 8, 10** | `[1, 5, 6, 7, 8, 10]` | Laporan pengembalian barang operasional kembali ke gudang beserta kondisi barang (Baik/Rusak/Expired). |
| **Pemakaian Internal** | `/inventory/internal-usage` | `LogOut` | **6, 7, 10** | `[6, 7, 8, 10]` | Formulir dan daftar pengeluaran barang untuk kebutuhan operasional harian cabang (`USG-YYYYMMDD-XXXX`). |
| **Retur Internal** | `/inventory/internal-return` | `Undo2` | **6, 7, 10** | `[6, 7, 8, 10]` | Formulir dan daftar pengembalian barang sisa/batal pakai dari operasional kembali ke stok gudang (`RET-YYYYMMDD-XXXX`). |

---

### 3.3. Penerimaan Barang / Procurement (GR)
**Grup Akses Sidebar:** Finance (5), Outlet Admin (6), Warehouse Staff (7), SUPERUSER (8), Finance Outlet (10)
| Submenu | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Pesanan Pembelian (PO)** | `/procurement/purchase-orders` | `FileText` | **6, 10** | `[1, 6, 7, 8]` | Pembuatan dan daftar purchase order pengadaan barang ke supplier eksternal. |
| **Penerimaan Supplier (GR)** | `/procurement/goods-receipts` | `Package` | **7** | `[1, 2, 6, 7, 8]` | Penerimaan fisik barang dari supplier gudang dengan upload bukti foto surat jalan/barang. |
| **Faktur Pembelian (PO)** | `/procurement/invoicing-po` | `FileText` | **6, 10** | `[1, 6, 8, 10]` | Pencatatan faktur dan invoice pembelian dari supplier. |
| **Laporan PO Tertunda** | `/procurement/report-outstanding-po`| `AlertOctagon` | **5, 6, 8, 10** | `[1, 5, 6, 8, 10]` | Pemantauan pesanan pembelian yang belum tuntas dikirim atau diterima sebagian. |
| **Kinerja Pemasok** | `/procurement/report-supplier-performance`| `TrendingUp` | **5, 6, 8, 10** | `[1, 5, 6, 8, 10]` | Analisis ketepatan waktu pengiriman, kuantitas, dan kualitas pemenuhan supplier. |
| **Laporan Pesanan (PO)** | `/procurement/report-po` | `TrendingUp` | **5, 6, 8, 10** | `[1, 5, 6, 8, 10]` | Laporan rekapitulasi seluruh dokumen pesanan pembelian (PO) per outlet dan periode. |
| **Laporan Penerimaan Supplier**| `/procurement/report-gr` | `Activity` | **5, 6, 7, 8, 10** | `[1, 5, 6, 7, 8, 10]` | Laporan riwayat penerimaan barang dari supplier (GR) beserta foto bukti penerimaan. |

---

### 3.4. Pengeluaran Barang (Goods Issued / GI)
**Grup Akses Sidebar:** Admin Holding (1), Staff Holding (2), Outlet Admin (6), Warehouse Staff (7), SUPERUSER (8)
| Submenu | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Retur ke Supplier** | `/goods-issued/gi-return-sto` | `LogOut` | **8** | `[8]` | Pemrosesan pengembalian barang rusak/salah kirim kembali ke pihak supplier eksternal. |
| **Laporan Pengeluaran (GI)** | `/goods-issued/report-gi` | `Activity` | **8** | `[8]` | Laporan riwayat seluruh pengeluaran barang non-penjualan. |

---

### 3.5. Transfer Stok Antar-Cabang (STO)
**Grup Akses Sidebar:** Finance (5), Outlet Admin (6), Warehouse Staff (7), SUPERUSER (8), Finance Outlet (10)
| Submenu | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Request Kirim Barang** | `/sto/requests` | `ClipboardList` | **6, 10** | `[6, 8, 10]` | Pengajuan permintaan kirim barang dari cabang peminta ke cabang penyedia/gudang pusat tanpa menampilkan harga (`REQ-YYYYMMDD-XXXX`). |
| **Kirim Barang Ke Outlet (STO)**| `/sto` | `FileText` | **6, 10** | `[6, 8, 10]` | Inisiasi dokumen transfer stok barang antar-cabang dengan referensi opsional No. Request Barang. |
| **Kotak Persetujuan STO** | `/sto/approval` | `Users` | **6, 10** | `[6, 8, 10]` | Verifikasi dan otorisasi persetujuan dokumen pengiriman STO oleh admin outlet. |
| **Pengiriman STO (Issue)** | `/sto/issue` | `Truck` | **7** | `[7, 8]` | Eksekusi fisik pengeluaran barang oleh staf gudang pengirim (pemotongan stok otomatis via trigger database dan foto bukti). |
| **Penerimaan STO (Receipt)** | `/sto/receipt` | `Package` | **7** | `[7, 8]` | Penerimaan fisik barang di gudang tujuan (penambahan stok otomatis via trigger database dan perbandingan foto bukti). |
| **Faktur STO** | `/sto/invoicing` | `DollarSign` | **6, 10** | `[6, 8, 10]` | Pembuatan dan penagihan invoice inter-branch antar cabang pengirim dan penerima. |
| **Laporan Request Barang** | `/sto/report-requests` | `FileText` | **5, 6, 7, 8, 10** | `[5, 6, 7, 8, 10]` | Laporan perbandingan jumlah permintaan barang terhadap realisasi kirim dan terima STO. |
| **Ringkasan Laporan STO** | `/sto/report-summary` | `Activity` | **6, 10** | `[5, 6, 8, 10]` | Ringkasan statistik performa transfer stok, rute cabang, dan status pengiriman. |
| **Laporan STO Dalam Transit** | `/sto/report-transit` | `Truck` | **6, 7, 10** | `[5, 6, 7, 8, 10]` | Pemantauan stok barang yang sedang dalam perjalanan antar-cabang (`IN_TRANSIT`). |
| **Laporan Order STO** | `/sto/report-order` | `FileText` | **5, 6, 8, 10** | `[5, 6, 8, 10]` | Rekapitulasi dokumen pesanan STO terdaftar dalam sistem. |
| **Laporan Item Order STO** | `/sto/report-order-items` | `List` | **5, 6, 7, 8, 10** | `[5, 6, 7, 8, 10]` | Rincian detail item barang, kuantitas, dan spesifikasi per pesanan STO. |
| **Laporan Penerimaan STO** | `/sto/report-receipt` | `Wallet` | **5, 6, 8, 10** | `[5, 6, 8, 10]` | Rekapitulasi dokumen tanda terima pengiriman STO oleh cabang tujuan. |
| **Daftar Item Penerimaan STO** | `/sto/report-receipt-items` | `PackageCheck` | **5, 6, 7, 8, 10** | `[5, 6, 7, 8, 10]` | Detail audit kuantitas penerimaan barang per item dari pengiriman STO. |

---

### 3.6. Produksi (Production & Recipe)
**Grup Akses Sidebar:** Finance (5), Outlet Admin (6), Warehouse Staff (7), SUPERUSER (8), Finance Outlet (10)
| Submenu | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Manajemen Resep** | `/production/recipes` | `BookOpen` | **6, 10** | `[1, 6, 8]` | Penyusunan formula resep campuran minyak spa, lulur, dan bahan raw-material (BOM). |
| **Proses Produksi** | `/production/run` | `ClipboardList` | **7** | `[1, 7, 8]` | Pelaksanaan proses produksi batch, perhitungan HPP otomatis, penyesuaian stok bahan baku & barang jadi. |
| **Laporan Biaya & Hasil** | `/production/cost-yield` | `TrendingUp` | **5, 6, 8, 10** | `[1, 5, 6, 8, 10]` | Analisis biaya produksi, yield rendemen hasil, dan efisiensi formulasi bahan baku. |

---

### 3.7. Keuangan & Akuntansi (Finance & Cash/Bank)
**Grup Akses Sidebar:** Finance (5), Outlet Admin (6), Warehouse Staff (7), SUPERUSER (8), Finance Outlet (10)
| Submenu | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Daftar Rekening & Kas** | `/finance/accounts` | `DollarSign` | **6, 10** | `[1, 3, 6, 8]` | Pengelolaan bagan akun rekening bank dan kas kecil operasional cabang. |
| **Transaksi Kas & Bank** | `/finance/general-transactions` | `Receipt` | **6, 10** | `[1, 3, 6, 8]` | Pencatatan penerimaan (IN) dan pengeluaran (OUT) kas operasional cabang. |
| **Master Categori Transaksi** | `/finance/categories` | `Tag` | **5, 8** | `[5, 8]` | Master kategori keuangan kas/bank (**Kebijakan No-Delete**: hanya toggle aktif/nonaktif). |
| **Laporan Umur Hutang (AP)** | `/finance/report-ap-aging` | `Clock` | **5, 6, 8, 10** | `[1, 3, 6, 8]` | Pemantauan umur kewajiban hutang dagang supplier (0-30, 31-60, 61-90, 90+ hari). |
| **Laporan Arus Kas** | `/finance/report-cash-flow` | `Banknote` | **5, 6, 8, 10** | `[1, 5, 6, 8, 10]` | Laporan mutasi arus kas masuk dan keluar per periode dan akun keuangan. |
| **Laporan Faktur Pembelian** | `/finance/invoices-report` | `FileText` | **5, 6, 8, 10** | `[1, 3, 5, 6, 8]` | Laporan daftar faktur pembelian supplier dan status pelunasannya. |
| **Pembayaran Hutang Supplier**| `/finance/paydown` | `Truck` | **6, 10** | `[1, 3, 6, 10, 8]` | Eksekusi pembayaran dan pelunasan invoice tagihan kepada supplier eksternal. |
| **Pelunasan STO** | `/finance/sto-paydown` | `Boxes` | **6, 10** | `[6, 10, 8]` | Pembayaran klaim biaya pengiriman atau tagihan transfer barang antar-cabang. |
| **Penyelesaian STO** | `/finance/sto-settlement` | `Wallet` | **6, 10** | `[6, 10, 8]` | Konfirmasi penerimaan pembayaran STO dan pencatatan kas masuk via RPC database. |
| **Laporan Piutang STO** | `/finance/sto-ar-report` | `TrendingUp` | **6, 10** | `[6, 10, 8]` | Laporan saldo piutang dan hutang antar-cabang (inter-branch AR/AP balances). |

---

### 3.8. Modul Pembayaran & Binatu (Payment & Laundry)
| Submenu | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Proses Pembayaran** | `/payment` | `DollarSign` | **8** | `[1, 5, 8]` | Pemrosesan transaksi settlement pembayaran global. |
| **Laporan Pembayaran** | `/payment/report` | `FileText` | **8** | `[1, 5, 8]` | Rekapitulasi riwayat pembayaran global. |
| **Laundry Keluar** | `/laundry/out` | `Truck` | **8** | `[3, 4, 8]` | Pengiriman linen kotor dari cabang ke unit pencucian binatu/laundry. |
| **Laundry Masuk** | `/laundry/in` | `Package` | **8** | `[3, 4, 8]` | Penerimaan linen bersih kembali ke outlet setelah proses binatu. |

---

### 3.9. Master Data
**Grup Akses Sidebar:** Finance (5), Outlet Admin (6), Warehouse Staff (7), SUPERUSER (8), Finance Outlet (10)
| Submenu | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Info Outlet** | `/master/outlet-info` | `Store` | **6** | `[6, 8]` | Khusus Admin Cabang untuk mengelola profil operasional outlet, nomor telepon, WhatsApp, koordinat peta Google Maps, fasilitas, dan ketersediaan layanan cabang. Terkunci ke `user.kode_outlet`. |
| **Kategori Produk** | `/master-type` | `Layers` | **5, 6, 7, 8, 10** | `[1, 2, 3, 4, 5, 6, 7, 8]`| Master tipe dan klasifikasi barang gudang. |
| **Kategori Pemakaian** | `/master/issue-categories` | `Tags` | **5, 6, 8, 10** | `[5, 6, 8, 10]` | Pengelolaan 7 kategori pengeluaran operasional (**Kebijakan No-Delete**: hanya switch aktif/nonaktif). |
| **Kategori Penyusutan** | `/master/shrinkage-categories` | `AlertTriangle`| **5, 8** | `[5, 8]` | Pengelolaan kategori barang rusak/expired/pecah (**Kebijakan No-Delete**: hanya switch aktif/nonaktif). |
| **Master Produk** | `/product` | `Tag` | **6, 10** | `[1, 5, 6, 8]` | Manajemen katalog barang, toggle linen binatu (`is_laundry`), dan upload foto produk (tanpa kamera / file browse). |
| **Harga & Satuan** | `/price-unit` | `DollarSign` | **6, 10** | `[1, 5, 6, 8]` | Pengaturan satuan konversi (UOM base & purchase) serta harga beli dan jual format Rupiah. |
| **Pemasok (Supplier)** | `/supplier` | `Truck` | **6, 10** | `[1, 5, 6, 8]` | Pengelolaan data vendor dan pemasok pengadaan barang gudang. |

---

### 3.10. CRM (Customer Relationship Management & Web Chat)
**Grup Akses Sidebar:** Finance Holding (5), Outlet Admin (6), SUPERUSER (8), Finance Outlet (10), Supervisor / Direksi (13), Web Admin (18), Resepsionis Cabang (19)
| Submenu | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Inbox Outlet** | `/crm/inbox-outlet` | `MessageCircle`| **5, 6, 8, 13, 19** | `[5, 6, 8, 13, 19]` | Kotak masuk live chat khusus reservasi cabang (`category = 'RESERVASI'`). Role 5, 8, 13 memiliki hak multi-outlet (dropdown pemilihan cabang). Role 6 dan 19 terisolasi per `kode_outlet` kasir/resepsionis. Terhubung dengan alarm audio desktop kasir `tmrWebChat`. Role 18 (Web Admin) dinonaktifkan dari modul ini. |
| **Inbox (Holding)** | `/crm/inbox-holding` | `Headphones` | **10, 8, 18** | `[10, 8, 18]` | Meja layanan pesan bantuan pusat dan live chat customer service holding (`category = 'HOLDING'`). Mengabaikan obrolan reservasi cabang (`.neq('category', 'RESERVASI')`). |

---

### 3.11. Web Data (CMS Website Statis Publik)
**Grup Akses Sidebar:** Finance (5), SUPERUSER (8), Web Admin (18), Supervisor / Direksi (13)
| Submenu | Path / Route | Icon | Sidebar Allowed Roles | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Master Fasilitas** | `/web/facilities` | `Sparkles` | **5, 8, 18, 13** | `[5, 8, 18, 13]` | Manajemen master katalog fasilitas spa, upload foto ke storage bucket `web-facilities`, dan input bilingual (ID/EN). |
| **Galeri Foto** | `/web/gallery` | `Camera` | **5, 8, 18, 13** | `[5, 8, 18, 13]` | Manajemen foto galeri suasana spa publik, upload ke bucket `web-galleries`, urutan tampil, dan toggle aktif/nonaktif. |
| **Menu Layanan** | `/web/services` | `BookOpen` | **5, 8, 18, 13** | `[5, 8, 18, 13]` | Pengelolaan 3 kategori layanan utama (*Body Massage*, *Foot Reflexology*, *Addition*), manfaat, durasi, dan versi bahasa Inggris. *(Mematuhi Zero-Price Standard).* |
| **Berita & Promo** | `/web/news-promo` | `Megaphone` | **5, 8, 18, 13** | `[5, 8, 18, 13]` | Pengelolaan berita & promo berkala Zen, banner carousel, upload foto ke bucket `web-news-promo`, periode tanggal, link CTA, dan saklar aktif. |
| **User Testimoni** | `/web/testimonials` | `MessageSquareQuote`| **5, 8, 18, 13** | `[5, 8, 18, 13]` | Moderasi ulasan pengunjung web berbasis rating 5-Smile (😠 s/d 😄), peninjauan foto tamu, dan persetujuan tayang (`published = true`). |

---

### 3.12. POS Dashboard (Aktif di Sidebar)
*Catatan: Modul POS Dashboard diaktifkan dengan 3 submenu eksekutif (Live Report, Periodic Report, dan Master Target) untuk Role ID `5, 8, 13`. Keempat submenu legacy (Keuangan, Operasional, Bauran Produk, Jam Sibuk) dinonaktifkan sementara dari navigasi sidebar, namun definisi rutenya tetap dipelihara di `src/App.tsx` demi kompatibilitas.*

| Submenu | Path / Route | Icon | Sidebar Role IDs | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Live Report** | `/pos-dashboard/live` | `Activity` | **5, 8, 13** | `[5, 8, 13]` | Dasbor eksekutif performa POS real-time hari operasional berjalan (cut-off 06:00 WIB). Menyajikan Zen Garden Summary, omset kotor/bersih, rasio pembatalan/void, efisiensi room & terapis, panorama cabang, analisis pembayaran/promo, serta breakdown alasan penolakan. Dilengkapi countdown 30 detik & manual refresh (tanpa auto-scroll). |
| **Periodic Report** | `/pos-dashboard/periodic` | `CalendarRange` | **5, 8, 13** | `[5, 8, 13]` | Dasbor eksekutif performa POS historis berdasarkan rentang tanggal fleksibel (Tanggal Mulai s/d Selesai). Target penjualan otomatis diskalakan proporsional terhadap durasi periode ($N \times \text{Target Harian}$). Tanpa live shift & countdown timer. |
| **Master Target** | `/pos-dashboard/master-target` | `Target` | **5, 8, 13** | `[5, 8, 13]` | Manajemen target penjualan tahunan per outlet. Sistem otomatis melakukan auto-split menjadi target bulanan ($\div 12$) dan harian ($\div 365/366$) untuk benchmark dasbor. Default fallback Rp 5.000.000 / hari jika belum diset. |
| ~~Keuangan~~ *(Legacy)* | `/dashboard/financial` | `DollarSign` | Nonaktif | `[1, 5, 6, 8]` | Metrik pendapatan dan performa finansial POS kasir (nonaktif di sidebar). |
| ~~Operasional~~ *(Legacy)* | `/dashboard/operational` | `Activity` | Nonaktif | `[1, 5, 6, 8]` | Efisiensi operasional dan perputaran room/terapis cabang (nonaktif di sidebar). |
| ~~Bauran Produk~~ *(Legacy)* | `/dashboard/product-mix` | `Boxes` | Nonaktif | `[1, 5, 6, 8]` | Analisis bauran penjualan per kategori treatment (`BJ`, `BA`, `BP`, `BG`) (nonaktif di sidebar). |
| ~~Jam Sibuk~~ *(Legacy)* | `/dashboard/peak-hours` | `Clock` | Nonaktif | `[1, 5, 6, 8]` | Analisis sebaran jam transaksi terpadat harian (nonaktif di sidebar). |

---


### 3.13. HRD (Evaluasi Terapis)
**Grup Akses Sidebar:** Finance (5), Outlet Admin (6), SUPERUSER (8), Supervisor / Direksi (13), Auditor (14), HR / Evaluator TR (16), Resepsionis (19)

| Submenu | Path / Route | Icon | Sidebar Role IDs | Route Guard (`App.tsx`) | Deskripsi & Batasan Akses |
|:---|:---|:---:|:---:|:---:|:---|
| **Kategori Evaluasi TR** | `/hrd/tr-kategori` | `FolderTree` | **8, 16** | `[8, 16]` | Master kategori evaluasi performa terapis (misal: Sikap & Keramahan, Standar Grooming, Kualitas Pijat/Treatment, Kebersihan Area Kerja). Dilengkapi urutan dan saklar aktif/nonaktif. |
| **Variabel Evaluasi TR** | `/hrd/tr-variabel` | `ListChecks` | **8, 16** | `[8, 16]` | Master variabel indikator penilaian yang dikelompokkan per kategori master. Variabel aktif otomatis tampil saat evaluator mengisi form penilaian terapis. |
| **Buat Evaluasi TR** | `/hrd/tr-buat-evaluasi` | `UserCheck` | **8, 16** | `[8, 16]` | Formulir evaluasi terapis (departemen `TR` / `TB` aktif). Alur kerja: Filter Outlet $\rightarrow$ Pilih Terapis $\rightarrow$ Intip 3 evaluasi terakhir $\rightarrow$ Skor variabel 1–10 (default 5) & catatan $\rightarrow$ Kalkulasi otomatis skor rata-rata $\rightarrow$ Catatan kesimpulan $\rightarrow$ Simpan. |
| **Laporan Evaluasi TR** | `/hrd/tr-laporan` | `FileText` | **5, 6, 8, 13, 14, 19** | `[5, 6, 8, 13, 14, 19]` | Laporan rekapitulasi dan riwayat hasil evaluasi terapis. **Khusus Role 6 & 19:** akses terkunci secara ketat hanya untuk outlet mereka sendiri (`user.kode_outlet`). Role 5, 8, 13, 14 dapat memfilter seluruh outlet. Dilengkapi modal rincian variabel per kategori. |

---

## 4. Matriks Ringkas Akses Menu per Role

| Modul / Menu Grup | 1 Admin Holding | 2 Staff Holding | 3 Laundry Admin | 4 Laundry Staff | 5 Finance | 6 Outlet Admin | 7 Warehouse Staff | 8 Superuser | 10 Finance Outlet | 13 Supervisor | 14 Auditor | 18 Web Admin | 19 Resepsionis |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dasbor Utama** | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — |
| **Manajemen Pengguna** | — | — | — | — | — | ✅*(Cabang)* | — | ✅*(All)* | — | — | — | ✅ | — |
| **Inventaris & Opname** | — | — | — | — | — | ✅ | ✅ | ✅ | — | — | — | ✅ | — |
| **Laporan Stok** | ✅ | — | — | — | ✅ | ✅ | ✅*(Qty Only)* | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Pemakaian/Retur Internal**| — | — | — | — | — | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — |
| **Pengadaan PO & Faktur** | ✅ | — | — | — | — | ✅ | — | ✅ | ✅ | — | — | ✅ | — |
| **Penerimaan GR Supplier** | ✅ | ✅ | — | — | — | ✅ | ✅ | ✅ | — | — | — | ✅ | — |
| **Laporan Procurement** | ✅ | — | — | — | ✅ | ✅ | ✅*(GR)* | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Transfer Stok (STO)** | — | — | — | — | — | ✅ | ✅*(Issue/Rec)*| ✅ | ✅ | — | — | ✅ | — |
| **Laporan STO** | — | — | — | — | ✅ | ✅ | ✅*(Items)*| ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Produksi & Resep** | — | — | — | — | — | ✅*(Resep)*| ✅*(Run)*| ✅ | ✅*(Resep)*| — | — | ✅ | — |
| **Laporan Produksi** | ✅ | — | — | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Kas & Bank Cabang** | — | — | — | — | — | ✅ | — | ✅ | ✅ | — | — | ✅ | — |
| **Kategori Transaksi** | — | — | — | — | ✅ | — | — | ✅ | — | — | — | ✅ | — |
| **Laporan Keuangan & AP** | ✅ | — | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Pelunasan Hutang & STO**| — | — | — | — | — | ✅ | — | ✅ | ✅ | — | — | ✅ | — |
| **Info Outlet** | — | — | — | — | — | ✅*(Own)* | — | ✅*(All)*| — | — | — | ✅ | — |
| **Master Kategori Gudang**| — | — | — | — | ✅ | ✅ | — | ✅ | ✅ | — | — | ✅ | — |
| **Master Produk & Harga** | — | — | — | — | — | ✅ | — | ✅ | ✅ | — | — | ✅ | — |
| **Pemasok (Supplier)** | — | — | — | — | — | ✅ | — | ✅ | ✅ | — | — | ✅ | — |
| **CRM Inbox Outlet** | — | — | — | — | ✅ | ✅ | — | ✅ | — | ✅ | — | — | ✅ |
| **CRM Inbox Holding** | — | — | — | — | — | — | — | ✅ | ✅ | — | — | ✅ | — |
| **Web Data CMS (Semua)** | — | — | — | — | ✅ | — | — | ✅ | — | ✅ | — | ✅ | — |
| **POS Dashboard (Live, Periodic, Master Target)** | — | — | — | — | ✅ | — | — | ✅ | — | ✅ | — | — | — |
| **HRD Evaluasi TR** | — | — | — | — | ✅*(Laporan)* | ✅*(Laporan Cabang)* | — | ✅*(All)* | — | ✅*(Laporan)* | ✅*(Laporan)* | — | ✅*(Laporan Cabang)* |

---

## 5. Security & Data Integrity Directives

1. **Mandatory No-Delete Policy**:
   * Kategori keuangan (`finance_transaction_categories`), kategori pengeluaran operasional (`master_issue_category`), dan kategori penyusutan (`master_shrinkage_categories`) **tidak boleh dihapus** demi menjaga integritas data riwayat audit transaksi gudang.
   * Modifikasi status hanya diizinkan melalui saklar alih (*switch toggle*) aktif/nonaktif (`is_active: true/false`). Izin `DELETE` telah dicabut pada level database PostgreSQL (`REVOKE DELETE ...`).
2. **Page Component Layout Protocol**:
   * Setiap halaman rute baru di `src/pages/**/*Page.tsx` **wajib** membungkus pohon komponennya menggunakan `<DashboardLayout>` dari `@/components/layout/Sidebar`.
3. **Bahasa Indonesia Baku Standard**:
   * Seluruh label, judul, placeholder, notifikasi toast, badge status, dan laporan cetak wajib menggunakan **Bahasa Indonesia baku**.
