# Panduan Pengguna (User Guide)
## Zen Management System
**Zen Family Spa & Reflexology**

Selamat datang di Panduan Pengguna resmi **Zen Warehouse and Management System (WHMS)**. Dokumen ini dirancang sebagai pegangan praktis bagi staf gudang, admin cabang, tim keuangan (*finance*), dan manajemen holding dalam mengoperasikan seluruh fitur aplikasi gudang dan inventaris secara akurat dan sesuai prosedur standar perusahaan.

---

## 1. Akses Sistem & Memulai Aplikasi

### A. Tautan Resmi Aplikasi (URL)
Aplikasi WHMS dapat diakses langsung melalui peramban web (*Google Chrome*, *Microsoft Edge*, *Safari*, atau *Mozilla Firefox*) tanpa instalasi tambahan:
* **Lingkungan Latihan / Simulasi (Staging)**: [https://latihan-whmapp.zenfamilyspa.id](https://latihan-whmapp.zenfamilyspa.id)
  > [!NOTE]
  > Pada mode Latihan, terdapat banner kuning statis di bagian header paling atas: **"MODE LATIHAN (STAGING)"**. Data dan transaksi pada tautan ini hanya untuk uji coba atau pelatihan staf baru tanpa memengaruhi data cabang riil.
* **Lingkungan Live / Operasional Resmi (Production)**: [https://whmapp.zenfamilyspa.id/](https://whmapp.zenfamilyspa.id/)
  > [!IMPORTANT]
  > Gunakan tautan ini untuk seluruh transaksi operasional harian cabang dan gudang pusat holding.

---

### B. Masuk ke Akun (Login)
1. Buka tautan aplikasi sesuai kebutuhan (Latihan atau Operasional).
2. Terdapat 2 opsi masuk:
   * **Masuk dengan Email & Kata Sandi**:
     - Masukkan **Alamat Email** terdaftar dan **Kata Sandi**.
     - Klik tombol **Masuk**.
   * **Masuk dengan Google (Google Sign-In)**:
     - Klik tombol **Masuk dengan Google**.
     - Pilih akun Google resmi perusahaan Anda.
3. **Ketentuan Hak Akses Peran (Role-Based Access Control)**:
   - Pengguna dengan **Role 9 (UNASSIGNED)** atau **Role 17 (MEMBER)** tidak diizinkan masuk ke WHMS dan akan otomatis dialihkan keluar dengan notifikasi pemberitahuan.
   - Menu yang tampil pada bilah navigasi kiri (*sidebar*) disesuaikan secara otomatis berdasarkan hak akses peran masing-masing staf.

---

### C. Antarmuka Utama & Zen Dark Mode
* **Bilah Navigasi Samping (Sidebar)**: Mengelompokkan modul kerja: *Dashboard*, *Master Data*, *Pengadaan Barang*, *Inventaris & Stok*, *Kirim Barang (STO)*, *Produksi*, dan *Keuangan*.
* **Ganti Mode Gelap (Zen Dark Mode)**:
  - Klik tombol **Ganti Mode Gelap** di bagian bawah sidebar untuk mengaktifkan tema malam (*River Stone Palette*) yang nyaman di mata untuk shift malam.
  - Klik kembali untuk beralih ke mode terang (*Zen Linen*). Pilihan tema tersimpan otomatis di perangkat Anda.
* **Ubah Kata Sandi**:
  - Tersedia di sidebar bawah untuk pengguna email & kata sandi.
  - *Catatan:* Pengguna yang masuk via Google OAuth akan mendapatkan notifikasi bahwa kata sandi dikelola langsung melalui akun Google masing-masing.

---

## 2. Modul Master Data

Menu Master Data digunakan untuk mengelola data acuan produk, kategori, vendor, dan profil cabang.

### A. Master Produk (`Master Data > Master Produk`)
1. **Daftar Produk & Pencarian**:
   - Menampilkan seluruh katalog barang lengkap dengan SKU, Nama Produk, Kategori, Satuan Beli/Jual, dan Status.
   - Dilengkapi kolom pencarian instan dan filter cepat jenis produk: **Semua Barang**, **Khusus Laundry**, atau **Bukan Laundry**.
2. **Penanda Barang Binatu / Laundry**:
   - Saat menambah atau mengubah produk linen (misal: handuk mandi, kimono, sprei bed spa, sarung bantal), aktifkan saklar toggle **"Barang Binatu / Laundry"**.
   - Produk binatu akan memiliki badge hijau **"Laundry"** pada tabel, mempermudah identifikasi alur cucian linen cabang.
3. **Unggah Foto Produk (Penyimpanan Lokal Perangkat)**:
   - Pada form Tambah/Ubah Produk, terdapat slot **Foto Produk 1** dan **Foto Produk 2**.
   - Klik **Pilih Foto** untuk mengambil berkas gambar (`.jpg`, `.png`, `.webp`, maks. 5 MB) dari penyimpanan komputer/laptop Anda.
   - Dilengkapi pratinjau instan (*live preview*), tombol **Ganti**, dan tombol **Hapus**.
   - Pada tabel daftar produk, klik thumbnail foto produk untuk memperbesar tampilan (*Zoom Photo Modal*).

---

### B. Kategori Pemakaian (`Master Data > Kategori Pemakaian`)
> [!NOTE]
> Modul ini dialokasikan khusus untuk **Role 5 (Finance)**, **Role 6 (Outlet Admin)**, **Role 8 (Superuser)**, dan **Role 10 (Finance Outlet)**.
1. Digunakan untuk mengelompokkan tujuan pengeluaran bahan operasional cabang (misal: *Operational Spa*, *Linen & Laundry*, *Cleaning & Sanitation*, *Office Supplies*, dll.).
2. **Kebijakan Integritas Ketat (No-Delete)**:
   - Data kategori pemakaian **TIDAK DAPAT DIHAPUS** demi menjaga keutuhan riwayat audit pemakaian internal.
   - Untuk menonaktifkan kategori yang sudah tidak digunakan, cukup matikan tombol saklar **Aktif / Nonaktif** (`is_active`).

---

### C. Kategori Penyusutan (`Master Data > Kategori Penyusutan`)
> [!NOTE]
> Modul ini dialokasikan khusus hanya untuk **Role 5 (Finance)** dan **Role 8 (Superuser)**.
1. Digunakan untuk mengelola daftar alasan/kategori penyusutan atau pemusnahan stok barang di gudang (misal: *Barang Kadaluarsa (Expired)*, *Barang Rusak / Pecah / Bocor*, *Tumpah / Terkontaminasi*, *Kehilangan / Selisih Stok*, *Linen / Handuk Rusak Tidak Layak Pakai*, *Lainnya*).
2. **Kebijakan Integritas Ketat (No-Delete)**:
   - Data kategori penyusutan **TIDAK DAPAT DIHAPUS** untuk menjaga keutuhan jejak audit (*audit trail*) transaksi penyusutan historis.
   - Untuk menonaktifkan kategori yang sudah tidak dipakai, gunakan tombol saklar **Aktif / Nonaktif** (`is_active`).

---

### D. Info Outlet (`Master Data > Info Outlet`)
> [!NOTE]
> Khusus untuk **Role 6 (Outlet Admin)**.
1. Sistem otomatis mendeteksi dan mengunci data hanya pada cabang milik admin yang bersangkutan.
2. Menampilkan informasi identitas cabang: Kode Outlet, Nama Outlet, Status Operasional, Izin Transaksi Antar-Outlet (STO), dan Grup Outlet.
3. **Pembaruan Informasi Cabang**:
   - Admin cabang dapat memperbarui: Alamat Lengkap, Kota, Provinsi, Nomor Telepon, Nomor WhatsApp, dan Email Outlet.
   - **Integrasi Peta & Lokasi**: Klik tombol **Gunakan Lokasi Saat Ini** untuk mengisi titik koordinat GPS perangkat secara otomatis, melihat pratinjau peta Google Maps interaktif, atau membuka navigasi langsung via tautan Google Maps.

---

### E. Pengaturan Satuan & Harga (`Master Data > Harga & Satuan`)
1. Menentukan konversi satuan (*UOM*) serta **Harga Beli** dan **Harga Jual** barang per cabang.
2. **Format Rupiah 2 Desimal Otomatis (`#.#,#0`)**:
   - Input **Harga Beli** dan **Harga Jual** mendukung penyimpanan hingga **2 angka desimal** dengan format standar Indonesia `#.#,#0` (contoh: `12.500,00` atau `12.500,50`).
   - Pengguna **tidak perlu mengetik titik pemisah ribuan** secara manual—sistem otomatis memformat pemisah ribuan (`.`) saat angka diketik.
   - Untuk memasukkan nilai desimal (sen), pengguna dapat menekan tombol **`.` (titik) pada Numpad keyboard** maupun tombol **`,` (koma)**, yang otomatis dikonversi menjadi pemisah desimal `,`.
   - Saat berpindah kolom (*blur*), angka bulat otomatis dilengkapi dengan akhiran `,00`.
3. Mengubah satuan beli (*Purchase UOM*) otomatis menyinkronkan satuan dasar (*Base UOM*) untuk mencegah selisih konversi pada resep dan produksi.

---

## 3. Pengadaan Barang (Procurement)

### A. Membuat Pesanan Pembelian / Purchase Order (PO)
1. Buka menu **Penerimaan Barang (GR) > Pesanan Pembelian (PO)**.
2. Klik tombol **+ Tambah PO Baru**.
3. Pilih **Pemasok (Supplier)**, **Tanggal Transaksi**, dan nomor referensi RO (jika ada).
4. Klik **Tambah Item** untuk memilih produk, jumlah kuantitas (*Qty*), dan harga satuan (otomatis berformat pemisah ribuan).
5. Klik **Simpan PO**. Dokumen akan berstatus `ISSUED` menunggu pengiriman dari pemasok.

---

### B. Penerimaan Barang Masuk (Goods Receipt)
1. Buka menu **Penerimaan Barang (GR) > Penerimaan Supplier (GR)**.
2. Klik tombol **Receive Goods / Terima Barang** di pojok kanan atas.
3. Pilih nomor **Purchase Order (PO)** yang barangnya tiba di cabang.
4. Masukkan nomor **Delivery Note / Ref No (Surat Jalan)** dari pemasok.
5. **Unggah Foto Bukti Penerimaan / Surat Jalan (Opsional - Maks. 1 Foto)**:
   - Klik tombol **Ambil Foto (Kamera)** untuk memotret langsung fisik Surat Jalan atau barang yang tiba menggunakan kamera perangkat (HP/Tablet/Webcam PC), atau klik **Pilih File / Galeri** untuk memilih gambar dari penyimpanan perangkat.
   - Sistem otomatis mengompresi ukuran foto kamera agar proses unggah cepat dan hemat kuota.
   - Bersifat **Opsional**: pengguna tetap dapat menyimpan penerimaan barang meskipun tanpa melampirkan foto.
6. Masukkan **Jumlah Diterima (Receive Now)** sesuai fisik yang dihitung di lapangan.
   > [!CAUTION]
   > Sistem menolak penerimaan berlebih (*over-receiving*). Anda tidak dapat memasukkan jumlah yang melebihi sisa kuantitas pemesanan pada PO (`Remaining`).
7. Klik **Confirm Receipt**. Saldo stok barang di gudang otomatis bertambah secara *real-time*.
8. **Melihat Foto Bukti Penerimaan pada Laporan**:
   - Foto bukti penerimaan yang diunggah dapat dilihat kembali kapan saja pada halaman **Laporan Pesanan (PO)**, **Laporan Penerimaan Supplier (Report GR Supplier)**, maupun **Riwayat Penerimaan (Goods Receipts)** dengan mengklik ikon **Foto (`Lihat Foto Penerimaan Barang`)** yang terletak tepat di sebelah ikon **Cetak (`Print`)** pada kolom *Actions*.

---

## 4. Inventaris & Pengelolaan Stok

### A. Stock Opname (Penyesuaian Fisik Stok)
1. Buka menu **Inventaris & Stok > Stock Opname**.
2. Tersedia 2 metode perhitungan:
   * **Mode Tunggal (Single Item Spot Check)**: Menghitung 1 produk spesifik secara cepat. Kolom pencarian memuat seluruh katalog produk aktif.
   * **Mode Massal (Batch Count)**: Menghitung seluruh item dalam satu kategori/lokasi gudang sekaligus.
3. Masukkan **Kuantitas Fisik** hasil perhitungan nyata di rak gudang.
4. Sistem otomatis menampilkan selisih (*Variance*) antara catatan sistem dengan fisik.
5. Masukkan catatan penjelasan selisih (jika ada), lalu klik **Finalisasi Stock Opname**. Saldo buku stok akan diperbarui ke angka fisik terkini.

---

### B. Pemakaian Internal (`Inventaris & Stok > Pemakaian Internal`)
Gunakan formulir ini untuk mencatat pengeluaran barang yang dikonsumsi sendiri untuk kebutuhan operasional harian cabang (misal: minyak massage, scrub, sabun mandi tamu, cairan pembersih, kertas kasir, dll.):
1. Buka menu **Pemakaian Internal**, klik **+ Tambah Pemakaian**.
2. Pilih **Kategori Pemakaian** (sesuai data Master Kategori Pemakaian) dan **Tanggal**.
3. Tambahkan item barang dan jumlah kuantitas yang diambil dari gudang.
4. Klik **Simpan**. Sistem otomatis menerbitkan nomor bukti dokumen resmi `USG-YYYYMMDD-XXXX` dan memotong saldo stok barang di cabang secara instan.

---

### C. Retur Internal (`Inventaris & Stok > Retur Internal`)
Gunakan formulir ini jika barang yang sebelumnya diambil untuk operasional dikembalikan kembali ke gudang (misal: sisa bahan produksi, perlengkapan yang tidak jadi dipakai):
1. Buka menu **Retur Internal**, klik **+ Tambah Retur**.
2. Masukkan tanggal dan pilih kondisi barang: **Baik (Bisa Digunakan)**, **Rusak**, atau **Kadaluarsa**.
3. Tambahkan item dan jumlah barang yang dikembalikan.
4. Klik **Simpan**. Sistem menerbitkan nomor dokumen bukti `RET-YYYYMMDD-XXXX` dan menambahkan kembali saldo stok barang layak pakai ke kartu stok gudang.

---

### D. Penyusutan / Pemusnahan (`Inventaris & Stok > Penyusutan / Pemusnahan`)
1. Buka menu **Inventaris & Stok > Penyusutan / Pemusnahan**.
2. Gunakan formulir ini saat menemukan barang rusak, pecah, tumpah, kadaluarsa, atau selisih hilang di rak gudang cabang.
3. Pilih **Produk** menggunakan kotak pencarian produk (*Searchable Select*), pilih **Kategori Penyusutan** (dari Master Kategori Penyusutan), masukkan **Jumlah Penyusutan** (tidak boleh melebihi stok tersedia saat ini), dan isi **Keterangan / Catatan**.
4. Klik **Simpan Penyusutan**. Saldo stok cabang akan langsung dikurangi dan tercatat pada riwayat audit pemusnahan resmi.

---

## 5. Transfer Stok (STO) Antar-Outlet

Modul ini memfasilitasi permintaan dan pengiriman logistik antar-cabang atau distribusi dari gudang pusat (*holding*) ke cabang-cabang Zen Family Spa.

### A. Request Kirim Barang (`Transfer Stok (STO) > Request Kirim Barang`)
Fitur ini berfungsi sebagai langkah awal (*Pre-STO Request*, serupa dengan *Purchase Order* namun untuk transaksi antar-outlet) di mana cabang yang membutuhkan stok mengajukan permintaan barang ke cabang pemasok:
1. Buka menu **Transfer Stok (STO) > Request Kirim Barang**.
2. Klik tombol **+ Buat Request Barang**.
3. Pilih **Outlet Tujuan Permintaan (Penyedia) *** dan **Tanggal Request**.
   > [!NOTE]
   > Dropdown **Outlet Tujuan Permintaan (Penyedia) *** secara otomatis hanya menampilkan daftar outlet yang berstatus aktif melakukan transaksi STO (`can_sto = True`), serta mengecualikan outlet pengguna sendiri.
4. Pada bagian tambah item:
   - Cari dan pilih **Produk** yang dibutuhkan.
   - Masukkan **Jumlah Diminta (Qty)** dan catatan khusus per item (opsional), lalu klik **Tambah ke Daftar**.
5. Periksa daftar rincian barang yang diminta, lalu klik **Ajukan Request Barang**.
6. Sistem otomatis menerbitkan nomor dokumen resmi **`REQ-YYYYMMDD-XXXX`** dengan status `SUBMITTED`.
7. Pada halaman **Daftar Request Kirim Barang**:
   - Cabang peminta maupun cabang pemasok dapat melihat rincian item yang diminta.
   - Cabang pemasok dapat langsung mengklik tombol **Proses Kirim STO** pada baris request untuk menindaklanjuti pengiriman.

---

### B. Membuat Pengiriman Barang (`Transfer Stok (STO) > Kirim Barang Ke Outlet (STO)`)
1. Buka menu **Transfer Stok (STO) > Kirim Barang Ke Outlet (STO)**, lalu klik **Kirim Barang Baru (STO)**.
2. **Referensi No. Request Barang (Opsional)**:
   - Jika pengiriman ini menindaklanjuti permintaan dari cabang lain, pilih nomor **`REQ-YYYYMMDD-XXXX`** pada kolom **Referensi No. Request Barang**.
   - **Penting**: Pemilihan nomor Request hanya menautkan nomor referensi dokumen (`request_number`) dan otomatis memilih Outlet Penerima, namun **tidak otomatis memasukkan daftar barang** ke tabel pengiriman. Staf pengirim tetap menginput fisik barang dan kuantitas aktual yang benar-benar siap dikirim dari gudang pengirim.
3. Pilih **Outlet Penerima (Tujuan)** (jika belum terisi dari referensi Request).
4. Pada baris pemilihan item:
   - Pilih produk dari kotak dropdown pencarian.
   - Masukkan **Jumlah (Qty)** kirim dan klik **Tambah**.
5. Periksa ringkasan daftar barang dan total estimasi transfer, lalu klik **Buat Dokumen STO**. Dokumen STO akan dibuat dengan status awal `DRAFT` (menunggu pengeluaran fisik barang oleh bagian gudang pengirim). Jika tertaut dengan dokumen Request, status Request tersebut otomatis diperbarui menjadi `FULFILLED` (Terpenuhi).

---

### C. Alur Pengiriman (Issue), Persetujuan (Approval), & Penerimaan STO (Receipt)
1. **Pengiriman STO / Goods Issue (`Transfer Stok (STO) > Pengiriman STO (Issue)`)**:
   - Staf gudang pengirim membuka daftar STO berstatus `DRAFT` dan mengklik **Process Shipment**.
   - Verifikasi kuantitas fisik barang yang dikirim.
   - **Foto Bukti Pengiriman STO (Opsional - Maks. 1 Foto)**: Staf pengirim dapat mengambil foto kondisi barang/paket saat dikirim menggunakan **Kamera Perangkat (`Ambil Foto (Kamera)`)** atau mengunggah dari **Galeri / File (`Pilih File / Galeri`)**.
   - Klik **Confirm Shipment**. Stok pada **Outlet Pengirim langsung dipotong** dan status pengirim berubah menjadi **`SHIPPED`** (barang berstatus *In-Transit* menuju outlet penerima).
2. **Kotak Persetujuan STO (`Transfer Stok (STO) > Kotak Persetujuan STO`)**:
   - Setelah gudang pengirim melakukan *Pengiriman STO (Issue)* (`SHIPPED`), dokumen STO otomatis muncul di **Kotak Persetujuan STO** milik **Outlet Penerima**.
   - Admin/pihak berwenang di Outlet Penerima memeriksa rincian STO lalu memilih:
     - **Accept Shipment (`ACCEPTED`)**: Menyetujui pengiriman agar dapat diterima oleh gudang penerima.
     - **Reject (`REJECTED`)**: Menolak pengiriman STO. Jika ditolak, sistem secara otomatis **mengembalikan (*reversal*) stok barang yang sebelumnya terpotong kembali ke saldo gudang Outlet Pengirim** secara utuh dan akurat.
3. **Penerimaan STO / Goods Receipt (`Transfer Stok (STO) > Penerimaan STO (Receipt)`)**:
   - Staf gudang penerima membuka STO yang telah disetujui (`ACCEPTED`) dan mengklik **Receive Goods**.
   - Jika Outlet Pengirim melampirkan foto saat pengiriman, staf penerima dapat mengklik tombol **Lihat Foto Pengirim** di dalam dialog untuk memeriksa kondisi awal barang saat dikirim.
   - Periksa kesesuaian kuantitas fisik barang yang tiba (*Strict Policy: kuantitas diterima wajib sama persis dengan kuantitas dikirim*).
   - **Foto Bukti Penerimaan STO (Opsional - Maks. 1 Foto)**: Staf penerima dapat memotret kondisi barang saat tiba di gerai menggunakan **Kamera Perangkat** atau memilih dari **Galeri / File**.
   - Klik **Confirm Receipt**. Stok pada **Outlet Penerima resmi bertambah** dan status STO menjadi **`COMPLETED`**.
4. **Melihat 2 Foto Bukti STO (Pengirim & Penerima) pada Laporan Penerimaan STO**:
   - Buka menu **Transfer Stok (STO) > Laporan Penerimaan STO**.
   - Pada kolom **Actions** (tepat di sebelah ikon **Cetak / Print**), klik ikon **Foto (`Lihat Foto Bukti STO`)** untuk membuka dialog perbandingan visual berdampingan (*Side-by-Side*):
     1. **Foto Pengiriman (Sender)** dari Outlet Pengirim.
     2. **Foto Penerimaan (Receiver)** dari Outlet Penerima.

---

## 6. Proses Produksi (Production Run)

Digunakan untuk meracik atau memproduksi bahan perawatan spa mandiri (misal: campuran massage oil aroma khusus, racikan scrub badan, dan lulur herbal) berdasarkan standar formula/resep:
1. Buka menu **Produksi > Proses Produksi**.
2. Pilih formula resep (**Master Recipe**) yang akan dijalankan dan tentukan jumlah batch yang diproduksi.
3. Sistem secara otomatis menampilkan lembar kerja bahan baku:
   - Menghitung kebutuhan kuantitas setiap bahan baku.
   - Memeriksa ketersediaan stok bahan di gudang cabang.
   - Menampilkan estimasi Harga Pokok Produksi (HPP) per unit dalam format Rupiah (`Rp`).
4. Pastikan stok bahan baku mencukupi, lalu klik **Proses Produksi**.
5. Sistem secara otomatis:
   - Memotong seluruh bahan baku dari saldo gudang.
   - Menambahkan produk jadi ke stok gudang.
   - Mencatat mutasi riwayat perubahan harga pada audit database.

---

## 7. Keuangan & Kas/Bank (Finance)

### A. Transaksi Kas Masuk & Kas Keluar
1. Buka menu **Keuangan > Kas & Bank**.
2. Pilih rekening sumber/tujuan (misal: Kas Kecil Outlet, Bank BCA, dll.).
3. Pilih tipe transaksi: **Kas Masuk (IN)** atau **Kas Keluar (OUT)**.
4. Pilih kategori transaksi yang sesuai (dikelola melalui *Master Kategori Transaksi* khusus Role 5 & 8).
5. Masukkan nominal uang dan keterangan transaksi.
6. Klik **Simpan**. Saldo rekening buku kas/bank otomatis terbarui seketika.

---

### B. Pelunasan Hutang Pemasok (Supplier Paydown)
1. Buka menu **Keuangan > Pelunasan Hutang Pemasok**.
2. Pilih **Pemasok (Supplier)** yang akan dibayarkan.
3. Sistem memuat seluruh faktur/faktur pembelian yang belum lunas (*Unpaid Invoices*).
4. Centang faktur yang dilunasi, masukkan potongan/diskon (bila ada), dan pilih rekening pembayaran.
5. Klik **Konfirmasi Pembayaran**. Status PO terkait otomatis berubah menjadi `PAID`.

---

### C. Penyelesaian Pembayaran STO (STO Settlement)
1. Buka menu **Keuangan > STO Settlement**.
2. Halaman ini memuat daftar klaim dana transfer barang yang dikirimkan oleh outlet lain dengan status `WAITING CLAIM`.
3. Klik **Konfirmasi Penerimaan Dana**, pilih rekening deposit penerima, dan verifikasi nominal.
4. Klik **Konfirmasi**. Status transaksi tuntas (*COMPLETED*) dan saldo kas/bank bertambah.

---

## 8. Laporan & Rekapitulasi (Reports)

Seluruh laporan dilengkapi filter fleksibel rentang tanggal, pemilihan cabang, metrik ringkasan kartu, serta tombol **Ekspor CSV** untuk pengolahan lebih lanjut di Microsoft Excel:

1. **Laporan Pemakaian Internal (`Inventaris & Stok > Laporan Pemakaian Internal`)**:
   - Merekap seluruh barang yang dipakai untuk operasional, total biaya pengeluaran, perincian kategori pemakaian, dan staf penanggung jawab.
2. **Laporan Retur Internal (`Inventaris & Stok > Laporan Retur Internal`)**:
   - Memantau nilai barang yang dikembalikan ke gudang beserta persentase kondisi barang (Baik vs Rusak).
3. **Laporan STO Lengkap (`Transfer Stok (STO)`)**:
   - **Laporan Request Barang (`Transfer Stok (STO) > Laporan Request Barang`)**: Laporan komprehensif 2-tab yang memantau **Ringkasan Dokumen Request** (status pemenuhan `OPEN`/`FULFILLED`/`CANCELLED` beserta tautan nomor STO realisasi) serta **Detail Item: Request vs Realisasi STO** (membandingkan jumlah diminta vs jumlah dipesan di STO, dikirim, diterima, dan selisih pemenuhan).
   - **Ringkasan STO**: Rekapitulasi volume dan nilai transfer antar-cabang.
   - **STO Transit**: Melacak barang yang masih dalam perjalanan ekspedisi antar-outlet.
   - **Piutang Antar-Outlet (STO AR Report)**: Memantau saldo piutang yang belum dilunasi oleh cabang penerima barang.
4. **Laporan Biaya & Hasil Produksi (`Produksi > Biaya & Hasil Produksi`)**:
   - Evaluasi efisiensi racikan, persentase rendemen hasil (*yield percentage*), dan varians biaya produksi.

---

## 9. Tanya Jawab & Kendala Umum (Troubleshooting)

**1. Muncul pesan "Sesi telah berakhir" atau "Failed to load session"**
- Muat ulang (*refresh*) halaman peramban web Anda (tekan **F5** atau **Ctrl + F5**). Jika masih berlanjut, lakukan Logout dan masuk kembali.

**2. Gagal menyimpan karena "Jumlah melebihi pesanan" (Over-receiving)**
- Periksa kembali fisik barang dan PO. Sistem melarang penerimaan melebihi kuantitas yang tertera pada dokumen pesanan pembelian resmi.

**3. Data outlet lain tidak terlihat di layar saya**
- Sistem menerapkan pembatasan keamanan ketat berbasis peran (*Row-Level Security*). Staf cabang hanya dapat melihat data inventaris dan transaksi milik cabangnya sendiri. Akses lintas seluruh cabang hanya dimiliki oleh akun Holding dan Superuser.

**4. Kategori pemakaian tidak bisa dihapus**
- Sesuai standar audit perusahaan, data kategori pemakaian dilindungi kebijakan *No-Delete*. Anda dapat menonaktifkannya dengan menggeser tombol alih status ke **Nonaktif** agar tidak muncul pada formulir pemakaian baru.

---

## 10. Layanan Bantuan & Dukungan IT

Apabila Anda mengalami kendala teknis atau membutuhkan bantuan terkait hak akses akun, silakan hubungi tim IT Administrator:
* **Email Dukungan IT**: `it-support@zenfamilyspa.id` / `borist@nababancloud.net`
* **Portal Sistem**: Tim IT & DevOps Zen Family Spa & Reflexology
