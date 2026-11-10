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
* **Bilah Navigasi Samping (Sidebar)**: Mengelompokkan modul kerja terpadu: *POS Dashboard*, *Dasbor Utama*, *Inventaris & Stok*, *Penerimaan Barang (GR)*, *Pengeluaran Barang (GI)*, *Transfer Stok (STO)*, *Produksi*, *Keuangan & Akuntansi*, *Master Data*, *Web Data*, *CRM*, dan *HRD*.
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
1. **Daftar Produk & Pencarian Menyeluruh (Server-Side Search)**:
   - Menampilkan seluruh katalog barang lengkap dengan SKU, Nama Produk, Kategori, Satuan Beli/Jual, dan Status.
   - Dilengkapi kolom pencarian instan berbasis server (*server-side search* via `ilike` Supabase) yang menyaring nama produk dan SKU di seluruh basis data, memastikan barang yang berada di halaman-halaman berikutnya (*pagination*) tetap ditemukan seketika tanpa harus berpindah halaman secara manual.
   - Filter cepat jenis produk: **Semua Barang**, **Khusus Laundry**, atau **Bukan Laundry**.
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
4. **Pemetaan Ketersediaan Menu Layanan Cabang (`Layanan Tersedia di Outlet Ini` & `web_outlet_services`):**
   - Pada bagian bawah halaman Info Outlet, admin cabang dapat memilih dan mencentang layanan perawatan spa mana saja yang aktif disediakan oleh cabang bersangkutan (mengambil acuan dari *Master Menu Layanan Global*).
   - Pengunjung website statis yang melihat menu layanan dapat membuka dropdown ketersediaan cabang untuk memastikan apakah layanan tersebut ada di cabang kota mereka.
   - **Kebijakan Tanpa Harga Cabang (Zero-Price Standard):** Pada pengaturan cabang ini, **tidak terdapat kolom pengisian/pengubahan harga**, dan website statis juga **tidak menampilkan harga layanan** demi menghindari salah persepsi dari pengunjung mengingat adanya variasi tarif dan promo antar-cabang di kota yang berbeda.

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

### F. Master Fasilitas (`Master Data > Master Fasilitas`)
> [!NOTE]
> Dapat diakses oleh **Role 5 (Finance)**, **Role 8 (Superuser)**, **Role 13 (Owner)**, dan **Role 18 (Web Admin)**.
1. Digunakan untuk mengelola daftar fasilitas unggulan cabang yang ditampilkan kepada pengunjung di website statis publik (misal: *Ruang Perawatan VIP Couple*, *Foot Reflexology Lounge*, *Kamar Mandi Shower Pribadi*, *Bathtub Rendam Herbal*, *Area Parkir Luas*, *Free Wi-Fi & Teh Jahe*, dll.).
2. **Form Tambah / Ubah Fasilitas**:
   - Masukkan **Kode Fasilitas** dan **Nama Fasilitas**.
   - Pilih **Kategori Fasilitas** (misal: *Ruangan*, *Kenyamanan*, *Fasilitas Umum*).
   - Masukkan **Deskripsi Singkat** dan **Urutan Tampilan (`sort_order`)**.
   - Tentukan nama ikon (*Icon Name* dari pustaka Lucide Icons).
3. **Unggah Foto Fasilitas (Supabase Storage `web-facilities`):**
   - Dilengkapi slot unggah gambar fasilitas (**Foto Fasilitas 1** dan **Foto Fasilitas 2**).
   - Foto otomatis diunggah langsung ke *bucket* Supabase Storage `web-facilities` (maks. 5 MB) dengan penamaan otomatis berformat rapi.
   - Tersedia tombol pratinjau (*live preview*), ganti foto, dan hapus foto.
4. **Saklar Alih Aktif / Nonaktif (`is_active`):**
   - Admin web dapat mengaktifkan atau menonaktifkan fasilitas tertentu dari tampilan website publik kapan saja secara instan tanpa menghapus rekaman data.

---

## 3. Modul Web Data (Website Management)

Modul ini dikhususkan bagi **Admin Web / Tim Marketing & Manajemen** untuk mengelola seluruh konten interaktif dan dinamis yang tampil pada website resmi Zen Family Spa & Reflexology (`frontend\website`).

> [!NOTE]
> Modul pada menu **Web Data** dialokasikan khusus untuk **Role 18 (Web Admin)**, **Role 8 (Superuser)**, **Role 5 (Finance)**, dan **Role 13 (Owner)**.

---

### A. Galeri Foto (`Web Data > Galeri Foto`)
Digunakan untuk mengelola foto-foto suasana, ruangan spa, produk aromaterapi, dan terapis yang tampil pada seksi Galeri di website publik:
1. **Daftar Galeri & Pratinjau**:
   - Menampilkan tabel seluruh foto galeri lengkap dengan thumbnail gambar, judul, kategori, cabang terkait, status aktif, dan nomor urutan.
   - Klik thumbnail foto untuk memperbesar tampilan (*Zoom Lightbox*).
2. **Tambah / Ubah Foto Galeri**:
   - Klik tombol **+ Tambah Foto Galeri**.
   - Masukkan **Judul Foto** dan **Deskripsi Singkat** (opsional).
   - Pilih **Kategori Foto**: *Suasana Spa*, *Ruang Perawatan*, *Produk & Aromaterapi*, atau *Terapis & Layanan*.
   - Pilih **Cabang Terkait** (opsional, kosongkan jika merupakan foto umum/global).
   - Tentukan **Nomor Urut Tampilan (`sort_order`)** untuk mengatur urutan kemunculan di website.
   - **Unggah Gambar**: Klik tombol pilih berkas untuk mengunggah foto langsung ke Supabase Storage *bucket* `web-galleries` (format JPG/PNG/WebP, maks. 5 MB).
3. **Saklar Alih Aktif / Nonaktif (`active`)**:
   - Admin dapat menonaktifkan foto galeri tertentu kapan saja hanya dengan mengklik tombol saklar (*switch toggle*) pada tabel.
   - Foto yang dinonaktifkan akan **seketika menghilang dari website publik** tanpa menghapus file asli dari database.

---

### B. Menu Layanan Global (`Web Data > Menu Layanan`)
Digunakan untuk mengelola katalog menu perawatan spa dan relaksasi yang ditawarkan kepada pengunjung website:
1. **Standarisasi 3 Kategori Layanan**:
   Sesuai arahan operasional manajemen, kategori layanan dikelompokkan secara baku ke dalam 3 kategori utama:
   * **Body Massage**: Layanan pijat tubuh menyeluruh (misal: *The Royal Touch*, *Balinese Massage*, *Hot Stone Therapy*, *Secluded Relaxation*).
   * **Foot Reflexology**: Layanan refleksi kaki dan punggung (misal: *Foot Relaxing*, *Back & Shoulder Massage*).
   * **Addition**: Layanan tambahan / add-on perawatan (misal: *Body Scrub Boreh*, *Totok Wajah*, *Aromatherapy Oil Upgrade*).
2. **Tambah / Ubah Menu Layanan**:
   - Masukkan **Kode Layanan** (unik) dan **Nama Layanan**.
   - Pilih **Kategori Layanan** (Body Massage, Foot Reflexology, atau Addition).
   - Masukkan **Durasi Perawatan** (dalam menit, contoh: 60, 90, 120 menit).
   - Isi kolom **Deskripsi Layanan** dan **Manfaat Perawatan (*Benefits*)**.
   - Tentukan **Urutan Tampilan (`sort_order`)** pada halaman web.
   - **Unggah Foto Layanan**: Unggah 1 foto representatif perawatan langsung ke Supabase Storage *bucket* `web-services` (maks. 5 MB).
3. **Saklar Alih Aktif / Nonaktif (`active`)**:
   - Layanan yang saklarnya dimatikan tidak akan muncul pada daftar menu website statis.
4. **Kebijakan Bebas Harga (Zero-Price Standard)**:
   - Formulir menu layanan sengaja tidak memuat kolom harga.
   - Pada kartu layanan di website statis, harga tidak ditampilkan dan tombol *"Pilih Layanan Ini"* ditiadakan. Sebagai gantinya, pengunjung dapat melihat accordion daftar cabang mana saja yang menyediakan layanan tersebut.

---

### C. User Testimoni & Moderasi Ulasan (`Web Data > User Testimoni`)
Fitur moderasi terpusat untuk memeriksa, menyetujui, atau menonaktifkan ulasan (*review*) yang dikirimkan oleh pelanggan/member resmi dari website statis:
1. **Ketentuan Pengirim Ulasan**:
   - Hanya pengunjung yang telah mendaftar/masuk sebagai **Member Resmi Zen** menggunakan akun Google mereka yang dapat menulis ulasan.
   - Member diwajibkan memilih cabang yang dikunjungi, memberikan penilaian kepuasan, menulis komentar, dan dapat melampirkan foto kunjungan nyata langsung dari kamera ponsel atau galeri perangkat.
2. **Filter & Pencarian Ulasan**:
   - Tab **Semua**: Menampilkan seluruh ulasan yang masuk ke sistem.
   - Tab **Menunggu Moderasi**: Menyaring ulasan baru yang berstatus `published = false` (memerlukan peninjauan admin sebelum tayang ke publik).
   - Tab **Sudah Tayang**: Menyaring ulasan yang saat ini sedang aktif tampil di website statis (`published = true`).
   - Kotak **Pencarian**: Mencari ulasan berdasarkan nama pelanggan, nama cabang, atau kata kunci dalam teks komentar.
3. **Pemeriksaan Konten Ulasan**:
   - **Identitas Member**: Menampilkan foto profil Google pelanggan, nama lengkap, dan email member.
   - **Cabang Dikunjungi**: Nama cabang dan kota yang diulas.
   - **Tingkat Kepuasan 5-Smile**: Sistem menggunakan 5 indikator emotikon Smile ekspresif (bukan bintang konvensional):
     - 😠 **1: Sangat Kecewa**
     - 🙁 **2: Kurang Puas**
     - 😐 **3: Cukup / Netral**
     - 🙂 **4: Puas**
     - 😄 **5: Sangat Puas**
   - **Pratinjau Foto Kunjungan**: Jika pelanggan melampirkan foto suasana gerai atau perawatan, thumbnail foto akan muncul. Klik thumbnail untuk membuka pratinjau foto resolusi penuh (*Photo Preview Modal*).
4. **Saklar Alih Publikasi (`published`)**:
   - Seluruh ulasan yang baru dikirim oleh member otomatis berstatus **Menunggu Moderasi** (`published = false`).
   - Admin cukup menggeser saklar toggle **Tayang di Web** ke posisi **Aktif (Hijau)** untuk langsung menerbitkan ulasan ke website statis.
   - Jika ditemukan komentar yang melanggar norma atau spam, admin cukup mematikan saklar tanpa perlu menghapus rekaman dari database audit.
   - **Aturan Tayang Website**: Website statis secara otomatis hanya menampilkan **6 ulasan terbaru yang berstatus `published = true`**.

---

---

### D. Berita & Promo (`Web Data > Berita & Promo`)
Digunakan oleh tim promosi dan admin web untuk mengelola konten spanduk dan pengumuman promosi yang tampil dalam bentuk Carousel mewah di halaman utama website statis:
1. **Daftar Berita & Promo**:
   - Menampilkan tabel seluruh materi promosi lengkap dengan thumbnail gambar, judul, teks badge promosi, periode tanggal aktif, status tayang, dan urutan tampilan.
2. **Tambah / Ubah Berita & Promo**:
   - Klik tombol **+ Tambah Berita & Promo**.
   - Masukkan **Judul Promosi** dan **Subjudul** dalam Bahasa Indonesia serta versi Bahasa Inggris (opsional).
   - Isi kolom **Deskripsi Lengkap Promosi** (tersedia kolom terjemahan bahasa Inggris).
   - Masukkan **Teks Badge** (misal: `PROMO TERBATAS`, `SPECIAL DISCOUNT`, `NEW TREATMENT`).
   - Tentukan **Tautan Aksi (CTA URL)**, misalnya link menuju nomor WhatsApp cabang atau halaman menu layanan.
   - Atur **Periode Aktif**: Tanggal Mulai (`start_date`) dan Tanggal Berakhir (`end_date`). Promosi otomatis tidak tampil di website jika telah melewati tanggal berakhir.
   - Atur **Nomor Urutan (`sort_order`)** untuk menentukan urutan slide carousel.
   - **Unggah Gambar Banner**: Unggah gambar banner promosi lanskap beresolusi tinggi langsung dari penyimpanan perangkat Anda (tanpa kamera / zero-camera standard) ke Supabase Storage *bucket* `web-news-promo` (maks. 5 MB).
3. **Saklar Alih Aktif / Nonaktif (`active`)**:
   - Admin dapat menonaktifkan promosi kapan saja dengan saklar alih tanpa menghapus data historis.

---

## 4. Pengadaan Barang (Procurement)

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

## 5. Inventaris & Pengelolaan Stok

### A. Pengajuan Stock Opname (`Inventaris & Stok > Stock Opname`)
> [!NOTE]
> Modul ini dialokasikan untuk staf gudang dan admin cabang (**Role 6 - Outlet Admin** dan **Role 7 - Warehouse Staff**).
1. Buka menu **Inventaris & Stok > Stock Opname**.
2. Tersedia 2 tab metode perhitungan:
   * **Pemeriksaan Satuan (Single Item Spot Check)**: Menghitung 1 produk spesifik secara cepat. Kolom pencarian memuat produk gerai sendiri, produk master Zen Produk (`901`), serta produk yang masuk melalui mutasi/transfer STO.
   * **Opname Massal (Batch Count)**: Menghitung seluruh item dalam satu kategori/lokasi gudang sekaligus secara terstruktur.
3. Masukkan **Kuantitas Fisik** hasil perhitungan nyata di rak gudang.
4. Sistem otomatis menghitung dan menampilkan selisih (*Variance = Fisik - Sistem*) antara saldo buku dengan saldo fisik nyata.
5. Masukkan catatan penjelasan selisih (jika ada), lalu klik tombol pengajuan:
   - Pada tab Opname Massal: Klik tombol floating **"Kirim Pengajuan Batch Opname"**.
   - Pada tab Pemeriksaan Satuan: Klik tombol **"Kirim Pengajuan Pemeriksaan"**.
6. **Mekanisme Persetujuan Berjenjang (Approval Workflow)**:
   > [!IMPORTANT]
   > Pengajuan Stock Opname **TIDAK LAGI LANGSUNG MENGUBAH SALDO STOK GUDANG**.
   > Seluruh pengajuan akan disimpan dalam antrean dengan status **`PENDING_APPROVAL` (Menunggu Persetujuan)** untuk diaudit dan disetujui oleh Manager Cabang atau Finance Holding.

---

### B. Persetujuan Stock Opname (`Inventaris & Stok > Persetujuan Opname`)
> [!NOTE]
> Modul ini dialokasikan khusus untuk **Role 5 (Finance Holding)**, **Role 8 (Superuser)**, dan **Role 14 (Manager)**.
1. Buka menu **Inventaris & Stok > Persetujuan Opname** (`/inventory/opname-approval`).
2. **Aturan Pembatasan Gerai Berbasis Peran**:
   - **Role 14 (Manager Cabang)**: Pemilih gerai dinonaktifkan secara otomatis (`canSelectOutlet = false`) dan dikunci ketat hanya pada cabang penugasan miliknya (`user.kode_outlet`). Manager hanya dapat meninjau dan menyetujui pengajuan opname dari cabangnya sendiri.
   - **Role 5 (Finance Holding) & Role 8 (Superuser)**: Memiliki akses menyeluruh untuk memfilter, memeriksa, dan menyetujui pengajuan opname dari seluruh cabang Zen Family Spa.
3. **Kartu Indikator KPI & Filter**:
   - Menampilkan ringkasan metrik instan: **Menunggu Persetujuan**, **Disetujui**, dan **Ditolak**.
   - Filter fleksibel berdasarkan rentang tanggal dokumen dan status pengajuan.
4. **Audit Rincian Selisih Opname**:
   - Klik tombol **Lihat Rincian / Audit** (ikon mata) pada baris pengajuan untuk membuka dialog audit detail.
   - Dialog menyajikan daftar item lengkap dengan: SKU, Nama Barang, Stok Sistem, Kuantitas Fisik, Selisih Kuantitas, Nilai Rupiah Selisih, dan Catatan Staf.
5. **Aksi Persetujuan atau Penolakan**:
   * **Menyetujui Batch Opname (Approve)**:
     - Klik tombol hijau **Setujui Opname**.
     - Sistem mengeksekusi fungsi database RPC atomik `approve_stock_opname`: status batch diperbarui menjadi `COMPLETED`, audit trail nama penyetuju dicatat, dan angka saldo inventaris di `inventory_balance` resmi disinkronkan ke angka fisik hasil opname secara otomatis.
   * **Menolak Batch Opname (Reject)**:
     - Klik tombol merah **Tolak Opname**.
     - Masukkan **Alasan Penolakan** pada kotak dialog yang muncul, lalu konfirmasi.
     - Status batch diperbarui menjadi `REJECTED` tanpa mengubah saldo inventaris gudang.

---

### C. Pemakaian Internal (`Inventaris & Stok > Pemakaian Internal`)
Gunakan formulir ini untuk mencatat pengeluaran barang yang dikonsumsi sendiri untuk kebutuhan operasional harian cabang (misal: minyak massage, scrub, sabun mandi tamu, cairan pembersih, kertas kasir, dll.):
1. Buka menu **Pemakaian Internal**, klik **+ Tambah Pemakaian**.
2. Pilih **Kategori Pemakaian** (sesuai data Master Kategori Pemakaian) dan **Tanggal**.
3. Tambahkan item barang dan jumlah kuantitas yang diambil dari gudang.
4. Klik **Simpan**. Sistem otomatis menerbitkan nomor bukti dokumen resmi `USG-YYYYMMDD-XXXX` dan memotong saldo stok barang di cabang secara instan.

---

### D. Retur Internal (`Inventaris & Stok > Retur Internal`)
Gunakan formulir ini jika barang yang sebelumnya diambil untuk operasional dikembalikan kembali ke gudang (misal: sisa bahan produksi, perlengkapan yang tidak jadi dipakai):
1. Buka menu **Retur Internal**, klik **+ Tambah Retur**.
2. Masukkan tanggal dan pilih kondisi barang: **Baik (Bisa Digunakan)**, **Rusak**, atau **Kadaluarsa**.
3. Tambahkan item dan jumlah barang yang dikembalikan.
4. Klik **Simpan**. Sistem menerbitkan nomor dokumen bukti `RET-YYYYMMDD-XXXX` dan menambahkan kembali saldo stok barang layak pakai ke kartu stok gudang.

---

### E. Penyusutan / Pemusnahan (`Inventaris & Stok > Penyusutan / Pemusnahan`)
1. Buka menu **Inventaris & Stok > Penyusutan / Pemusnahan**.
2. Gunakan formulir ini saat menemukan barang rusak, pecah, tumpah, kadaluarsa, atau selisih hilang di rak gudang cabang.
3. Pilih **Produk** menggunakan kotak pencarian produk (*Searchable Select*), pilih **Kategori Penyusutan** (dari Master Kategori Penyusutan), masukkan **Jumlah Penyusutan** (tidak boleh melebihi stok tersedia saat ini), dan isi **Keterangan / Catatan**.
4. Klik **Simpan Penyusutan**. Saldo stok cabang akan langsung dikurangi dan tercatat pada riwayat audit pemusnahan resmi.

---

### F. Aturan Privasi Harga Beli Antar-Cabang (Inter-Outlet Pricing Privacy)
> [!IMPORTANT]
> Kebijakan ini diterapkan secara otomatis di seluruh laporan inventaris gudang (`view_inventory_report` dan `view_report_opname_variance`).
1. **Perlindungan Kerahasiaan Harga Modal**:
   - Jika cabang Anda menerima barang hasil mutasi/transfer logistik (STO) dari cabang lain atau holding, informasi harga modal beli (`buy_price` / `unit_cost`) gerai asal **secara otomatis disembunyikan**.
   - Sistem memasking nilai **Harga Beli** dengan **Harga Jual (`sell_price`)** barang bersangkutan.
2. **Keterbacaan Laporan yang Adil**:
   - Pada **Laporan Nilai Stok** dan **Laporan Selisih Opname**, kolom *Harga Beli* dan *Harga Jual* bagi barang antar-gerai akan menampilkan angka yang sama (`sell_price`).
   - Dengan aturan ini, cabang tetap dapat menghitung valuasi aset stok gudang secara akurat tanpa mengekspos margin keuntungan atau harga modal holding kepada staf cabang.

---

## 6. Transfer Stok (STO) Antar-Outlet

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
   - Verifikasi kuantitas fisik barang yang siap dikirim dari gudang.
   - **Penanganan Item Kosong di Gudang (Kuantitas 0 Diizinkan)**: Jika salah satu atau beberapa barang dalam daftar STO kebetulan kosong di rak gudang pengirim, staf dapat memasukkan angka **`0`** pada kolom *Shipped Qty* barang tersebut. Sistem menandai item tersebut dengan badge kuning **"Stok Kosong (0)"** dan **tetap mengizinkan proses pengiriman** selama minimal ada 1 barang lain yang kuantitasnya $> 0$. Hanya item dengan kuantitas $> 0$ yang stoknya akan dipotong di gudang pengirim.
   - **Foto Bukti Pengiriman STO (Opsional - Maks. 1 Foto)**: Staf pengirim dapat mengambil foto kondisi barang/paket saat dikirim menggunakan **Kamera Perangkat (`Ambil Foto (Kamera)`)** atau mengunggah dari **Galeri / File (`Pilih File / Galeri`)**.
   - Klik **Confirm Shipment**. Stok pada **Outlet Pengirim langsung dipotong** untuk item yang dikirim dan status pengirim berubah menjadi **`SHIPPED`** (barang berstatus *In-Transit* menuju outlet penerima).
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

## 7. Modul CRM (Customer Relationship Management)

Modul CRM menghubungkan tamu yang berkunjung ke website resmi Zen Family Spa dengan staf cabang dan tim holding secara langsung melalui fitur obrolan web (*live web chat*).

---

### A. Inbox Outlet (`CRM > Inbox Outlet`)
> [!NOTE]
> Dapat diakses oleh **Role 6 (Outlet Admin)**, **Role 19 (Resepsionis Cabang)**, serta **Role 5, 8, 13**.
1. **Penguncian Akses Cabang**:
   - Untuk **Role 6 (Admin Outlet)** dan **Role 19 (Resepsionis)**, sistem secara otomatis mengunci ruang obrolan **hanya untuk pesan yang masuk ke cabang mereka sendiri**.
   - Untuk Role 5, 8, 13, tersedia dropdown pemilih cabang untuk memantau chat di cabang mana pun.
2. **Kategori Chat Reservasi**:
   - Menampilkan percakapan tamu yang memilih bantuan reservasi gerai (*RESERVASI*).
3. **Fitur Kotak Obrolan (CrmChatBox)**:
   - **Notifikasi Pesan Baru**: Dilengkapi indikator badge pesan belum dibaca (*unread count*). Pada kasir desktop ZenSystem, penerimaan pesan ini memicu lonceng audio instan.
   - **Balasan Cepat (Quick Replies)**: Template pesan standar perhotelan/spa untuk membalas salam dan pertanyaan ketersediaan slot dengan 1 klik.
   - **Tautan Langsung WhatsApp (Direct WhatsApp CTA)**: Jika tamu memerlukan koordinasi lanjut via ponsel, staf dapat mengklik tombol WhatsApp untuk membuka chat WhatsApp langsung ke nomor telepon tamu.
   - **Selesaikan Percakapan (Resolve Ticket)**: Klik tombol **Selesaikan** saat konsultasi reservasi telah tuntas untuk mengarsipkan percakapan.

---

### B. Inbox Holding (`CRM > Inbox`)
> [!NOTE]
> Dialokasikan untuk **Role 10 (Finance Outlet / CS Holding)**, **Role 8 (Superuser)**, dan **Role 18 (Web Admin)**.
1. Menampung obrolan pelanggan untuk kategori umum, komplain layanan tingkat holding, peluang kemitraan/franchise, atau pertanyaan kerja sama korporasi.
2. Menampilkan riwayat interaksi chatbot otomatis (*Bot Knowledge Base*) sebelum tiket dialihkan ke staf penanggung jawab holding.

---

## 8. Modul HRD (Evaluasi Kinerja & Pelanggaran Terapis)

Modul HRD dirancang khusus untuk memantau mutu pelayanan, kepatuhan SOP terapis, standarisasi kualitas perawatan, serta sistem pencatatan pelanggaran harian (*demerit points*) di seluruh gerai Zen Family Spa & Reflexology.

---

### A. Kategori Evaluasi TR (`HRD > Kategori Evaluasi TR`)
> [!NOTE]
> Dialokasikan khusus untuk **Role 8 (Superuser)** dan **Role 16 (HR / Trainer TR)**.
1. Digunakan untuk mengelola master kelompok penilaian performa terapis (misal: *Sikap & Keramahan*, *Standar Grooming & Kerapian*, *Kualitas Pijat & Treatment*, *Kebersihan Area Kerja & Sanitasi*).
2. **Pengaturan Urutan & Status**:
   - Tentukan nomor urutan (`urutan`) agar kategori tampil berurutan saat formulir penilaian dibuka.
   - Tombol saklar alih aktif/nonaktif untuk menonaktifkan kategori tanpa menghapus jejak audit evaluasi lampau.

---

### B. Variabel Evaluasi TR (`HRD > Variabel Evaluasi TR`)
> [!NOTE]
> Dialokasikan khusus untuk **Role 8 (Superuser)** dan **Role 16 (HR / Trainer TR)**.
1. Mengelola indikator variabel spesifik di bawah masing-masing kategori master.
2. Setiap variabel dilengkapi **Deskripsi Kriteria Penilaian** (misal: *"Menyapa tamu dengan salam Zen dan senyum ramah"*, *"Tekanan pijatan konsisten dan menanyakan kenyamanan tamu"*, *"Merapikan kembali sprei bed dan aromaterapi setelah sesi"*).
3. Variabel yang berstatus **Aktif** otomatis dimuat saat evaluator membuka form penilaian terapis.
4. **Audit Trail Kolom Update**:
   - Pada tabel grid variabel, sistem menyajikan kolom **Terakhir Diperbarui Oleh** (`users_profile.full_name`) dan **Waktu Update** (`update_at`) untuk transparansi riwayat pengubahan standar variabel.

---

### C. Buat Evaluasi TR (`HRD > Buat Evaluasi TR`)
> [!NOTE]
> Dialokasikan khusus untuk **Role 8 (Superuser)** dan **Role 16 (HR / Trainer TR)**.
Formulir evaluasi terpadu dengan alur multi-langkah (*multi-step workflow*) yang terintegrasi langsung dengan data Payroll dan Pelanggaran Operasional:
1. **Langkah 1 - Pilih Cabang & Terapis**:
   - **Cabang Outlet**: Pilih cabang outlet tempat terapis bertugas untuk mempersempit daftar karyawan.
   - **Pilih Terapis (TR / TB)**: Dropdown karyawan secara otomatis menyaring staf dari `ot_hrd_karyawan_info` dengan kriteria departemen **`TR`** (*Therapist*) atau **`TB`** (*Therapist Baru*) yang berstatus aktif (`active = 'Y'`).
   - **Tanggal Evaluasi**: Tanggal pelaksanaan observasi/penginputan evaluasi.
   - **Pilihan Periode Payroll (5 Terakhir)**: Dropdown memuat 5 periode payroll terbaru terapis yang bersumber dari tabel `ot_hrd_karyawan_payroll_details.payrollperiode`.
   - **Penguraian Rentang Periode Otomatis (Date Range Parsing)**:
     - Sistem secara otomatis mengurai 10 digit terakhir kode periode (misal: `PYZ.117.2025012120` $\rightarrow$ `2025012120`).
     - Digit diuraikan menjadi Tahun (`2025`), Bulan Mulai (`01`), Tanggal Mulai (`21`), dan Tanggal Selesai (`20`).
     - Karena tanggal mulai ($21$) lebih besar dari tanggal selesai ($20$), sistem mengenali bahwa periode berakhir di bulan berikutnya (`2025-02-20`).
     - Ditampilkan sebagai lencana informasi: `📅 Rentang Periode Evaluasi: 2025-01-21 s/d 2025-02-20`.
   - **Matriks Rekap Kehadiran Terapis (Attendance Matrix)**:
     - Sistem mengekstrak payload `payroll_data` (JSONB) dari periode payroll terpilih dan menampilkan 8 metrik absensi terapis:
       1. **H. Alpa**: Hari tanpa keterangan.
       2. **H. Cuti**: Hari cuti resmi.
       3. **Terlambat < 30m**: Frekuensi terlambat kurang dari 30 menit.
       4. **Terlambat > 30m**: Frekuensi terlambat lebih dari 30 menit.
       5. **H. Sakit**: Hari sakit dengan surat keterangan.
       6. **Under Time**: Pulang sebelum jam kerja berakhir.
       7. **Tidak Absen**: Lupa / tidak melakukan tap absen.
       8. **Ijin Tdk Masuk**: Hari ijin resmi tidak masuk kerja.
   - **Integrasi Catatan Kesalahan & Poin Pengurang (`hrd_tr_faults`)**:
     - Sistem secara otomatis menyeleksi seluruh catatan pelanggaran terapis pada rentang tanggal periode payroll tersebut.
     - Disajikan dalam tabel grid interaktif (Tanggal, Nama Kesalahan, Kategori, Poin Pengurang, Keterangan).
     - Menghitung akumulasi **Total Poin Pengurang** (`-X Poin`) secara instan.
2. **Rekam Jejak 3 Evaluasi Terakhir**:
   - Menampilkan kartu ringkasan **3 riwayat evaluasi terakhir** terapis bersangkutan, memuat skor rata-rata (`nilai_total`) dan kesimpulan evaluasi terdahulu untuk bahan pembanding obyektif.
3. **Langkah 2 - Penilaian Variabel Terstruktur**:
   - Sistem secara otomatis me-render seluruh variabel aktif yang dikelompokkan rapi per kategori master.
   - Setiap variabel memiliki nilai awal (*default score*) sebesar **5** dengan pilihan tombol nilai rentang **1 s/d 10**.
   - Terdapat kolom input catatan spesifik per variabel jika evaluator ingin memberikan observasi khusus pada poin tersebut.
4. **Langkah 3 - Kesimpulan & Kalkulasi Nilai Akhir (Formula Opsi B)**:
   - Sistem menyajikan 3 kartu ringkasan penilaian:
     1. **Total Langkah 2: Variabel Standar**: Nilai rata-rata variabel standar sebelum demerit ($\sum \text{Skor} \div N \text{ variabel}$).
     2. **Total Poin Pengurang (Pelanggaran)**: Akumulasi penalti kesalahan terapis pada periode berjalan (`-X Poin`).
     3. **Nilai Total Rata-Rata Akhir**: Nilai performa final yang dihitung menggunakan **Formula Opsi B**:
        $$\text{Nilai Total Akhir} = \max\left(0, \frac{\sum \text{Skor Variabel} - \text{Total Poin Pengurang}}{\text{Jumlah Variabel}}\right)$$
        *Contoh*: Jika total 10 variabel menghasilkan skor 70, dan terapis memiliki poin kesalahan $-6$, maka $\text{Nilai Akhir} = (70 - 6) \div 10 = 6.4$.
   - **Kesimpulan & Catatan Evaluator**: Masukkan apresiasi, catatan evaluasi, atau rekomendasi tindakan perbaikan (coaching/training).
5. **Simpan Dokumen**:
   - Klik tombol **Simpan Laporan Evaluasi**. Dokumen tersimpan ke tabel `hrd_report_tr` beserta `payrollperiode`, `total_pengurang`, dan `nilai_total` dengan nomor dokumen resmi **`EV-TR-YYMMDD-XXXX`**.

---

### D. Laporan Evaluasi TR (`HRD > Laporan Evaluasi TR`)
> [!NOTE]
> Dialokasikan untuk **Role 5 (Finance)**, **Role 6 (Outlet Admin)**, **Role 8 (Superuser)**, **Role 13 (Supervisor / Direksi)**, **Role 14 (Auditor)**, dan **Role 19 (Resepsionis Cabang)**.
1. **Aturan Keamanan Cabang Ketat**:
   - **Role 6 (Admin Outlet)** dan **Role 19 (Resepsionis)**: Akses terkunci secara otomatis dan hanya dapat meninjau hasil evaluasi terapis pada cabang mereka sendiri (`user.kode_outlet`).
   - **Role 5, 8, 13, 14**: Memiliki akses lintas outlet dengan dropdown penyaring cabang (Semua Cabang vs Cabang Tertentu).
2. **Metrik Ringkasan Performa**:
   - Menampilkan total evaluasi terlaksana, rata-rata skor keseluruhan, dan jumlah terapis berpredikat performa tinggi (skor rata-rata $\ge 8.5$).
3. **Pencarian & Filter Tanggal**:
   - Filter rentang tanggal fleksibel (default 30 hari terakhir) serta pencarian instan nama karyawan, ID terapis, atau kode dokumen evaluasi.
4. **Dialog Rincian Nilai (Modal View)**:
   - Klik tombol **Lihat Rincian** pada baris laporan untuk membuka jendela rincian lengkap: memuat skor total, detail nilai setiap variabel per kelompok kategori, catatan evaluator, dan kesimpulan tindak lanjut.

---

### E. Master Kesalahan Terapis (`HRD > Master Faults`)
> [!NOTE]
> Dialokasikan khusus untuk **Role 5 (Finance Holding)**, **Role 8 (Superuser)**, **Role 15 (Evaluator Holding)**, dan **Role 16 (HR / Trainer TR)**.

Modul ini merupakan katalog acuan standar tata tertib operasional dan poin penalti (*demerit points*) bagi terapis pijat & refleksi:
1. **Kategori Tingkat Bobot Pelanggaran**:
   - **Ringan** (Lencana Hijau): Pelanggaran grooming/kebersihan personal dasar (misal: *Tidak menggunakan masker ketika sakit*, *Bau badan*, *Tidak dapat berbahasa asing dasar*), dengan default pengurang **3 Poin**.
   - **Sedang** (Lencana Kuning): Ketidaksesuaian teknik penanganan tamu (misal: *Tekanan dan Teknik tidak sesuai*, *Pijatan berbeda dengan standar terapis lain*), dengan default pengurang **6 Poin**.
   - **Berat** (Lencana Merah): Pelanggaran berat etika dan SOP pelayanan (misal: *Terapis mengantuk / tertidur saat sesi*, *Pengurangan waktu treatment secara sepihak*), dengan default pengurang **9 Poin**.
2. **Tabel Grid & Audit Trail Terakhir Update**:
   - Menampilkan nomor urutan, nama kesalahan, badge kategori, poin pengurang (`-X Poin`), status aktif, serta kolom khusus **Terakhir Diperbarui Oleh** (`users_profile.full_name`) dan **Waktu Update** untuk transparansi audit holding.
3. **Penambahan & Pembaruan Kesalahan**:
   - Klik **Tambah Jenis Kesalahan** untuk membuka dialog formulir.
   - Masukkan deskripsi kesalahan, pilih tingkat kategori, tentukan poin pengurang (angka positif $> 0$), dan urutan tampilan.
   - Klik **Simpan**.
4. **Kebijakan Nonaktif / Soft-Delete**:
   - Untuk menonaktifkan jenis kesalahan yang sudah tidak diberlakukan, cukup klik badge status **Aktif / Nonaktif** tanpa menghapus catatan transaksi riil yang pernah terjadi.

---

### F. Pencatatan Kesalahan Terapis (`HRD > TR Faults`)
> [!NOTE]
> Dialokasikan untuk **Role 5 (Finance)**, **Role 8 (Superuser)**, **Role 15 (Evaluator Holding)**, **Role 16 (HR TR)**, dan **Role 19 (Resepsionis Cabang)**.

Formulir operasional harian untuk mencatat keluhan tamu (*guest complaints*) atau temuan pelanggaran SOP terapis secara *real-time*:
1. **Aturan Keamanan Khusus Resepsionis (Role 19)**:
   - Bagi pengguna dengan Role 19 (Resepsionis Cabang), pilihan cabang **terkunci secara otomatis dan mutlak pada outlet mereka sendiri (`user.kode_outlet`)**.
   - Sistem menampilkan lencana hijau informatif: *"Mode Resepsionis: Terkunci pada Cabang [KODE_OUTLET]"*.
   - Dropdown pemilihan terapis secara otomatis hanya menampilkan staf terapis aktif (`departemen IN ('TR', 'TB')` dan `active = 'Y'`) yang bertugas di cabang bersangkutan.
   - Bagi peran holding (Role 5, 8, 15, 16), pilihan cabang dapat dipilih secara bebas.
2. **Langkah-Langkah Pencatatan**:
   - **Tanggal Kejadian**: Otomatis terisi tanggal hari ini (dapat disesuaikan jika mencatat insiden shift malam kemarin).
   - **Pilih Terapis**: Pilih nama terapis yang bersangkutan dari daftar terapis aktif cabang.
   - **Pilih Jenis Kesalahan**: Pilih dari dropdown master kesalahan. Begitu dipilih, kotak indikator di sampingnya secara otomatis menampilkan badge visual kategori dan jumlah poin pengurang (*snapshot*).
   - **Keterangan Kronologi (Opsional)**: Masukkan catatan tambahan kontekstual (misal: *"Tamu di Kamar VIP 2 mengeluhkan tekanan terlalu keras pada sesi reflexology 90 menit"*).
   - Klik **Simpan Catatan Kesalahan**.
3. **Dukungan Multi-Record Harian**:
   - Sistem dirancang tanpa batasan unik per tanggal. Jika seorang terapis melakukan lebih dari satu kelalaian dalam shift yang sama, resepsionis dapat memasukkan catatan berikutnya tanpa tertolak oleh sistem.
4. **Tabel Live Feed Hari Ini**:
   - Tepat di bawah formulir, sistem menyajikan tabel daftar kesalahan yang telah dicatat pada tanggal terpilih untuk cabang tersebut.
   - Petugas dapat langsung memverifikasi bahwa catatan telah masuk, atau menekan tombol ikon sampah (**Hapus**) jika terjadi kekeliruan salah pilih terapis saat penginputan.

---

### G. Laporan Kesalahan Terapis (`HRD > Report TR Faults`)
> [!NOTE]
> Dialokasikan untuk **Role 5 (Finance)**, **Role 6 (Admin Outlet)**, **Role 8 (Superuser)**, **Role 13 (Supervisor / Direksi)**, **Role 14 (Auditor)**, **Role 15 (Evaluator Holding)**, **Role 16 (HR TR)**, dan **Role 19 (Resepsionis Cabang)**.

Modul rekapitulasi audit dan analisis demerit points terapis untuk evaluasi bulanan serta pengawasan operasional:
1. **Aturan Pembatasan Cabang**:
   - **Role 6 (Admin Outlet)** dan **Role 19 (Resepsionis Cabang)**: Akses terkunci secara otomatis hanya pada data cabang mereka sendiri (`user.kode_outlet`).
   - **Role 5, 8, 13, 14, 15, 16**: Memiliki akses multi-cabang dengan opsi dropdown **SEMUA OUTLET (NASIONAL)** atau memilih cabang tertentu.
2. **Kartu Ringkasan Metrik (KPI Overview)**:
   - **Total Kasus Tercatat**: Jumlah total insiden kesalahan yang terjadi dalam periode filter.
   - **Total Poin Penalti**: Akumulasi total demerit points (`-X Poin`) yang dikumpulkan terapis.
   - **Pelanggaran Ringan / Sedang / Berat**: Penghitung rincian sebaran kasus berdasarkan bobot pelanggaran.
3. **Filter Data Fleksibel**:
   - **Dari Tanggal** & **Sampai Tanggal**: Menyaring periode analisis (default 30 hari terakhir).
   - **Tingkat Kategori**: Memfilter hanya kategori tertentu (*Semua*, *Ringan*, *Sedang*, atau *Berat*).
   - **Kotak Pencarian Instan**: Menyaring tabel berdasarkan nama terapis, kode karyawan, jenis kesalahan, cabang, atau kata kunci kronologi.
4. **Tabel Data Rinci**:
   - Menampilkan Tanggal, Cabang, Nama & Identitas Lengkap Terapis (`kodekaryawan • ID: idkaryawan • departemen`), Jenis Kesalahan, Badge Kategori, Poin Pengurang, Keterangan Kronologi, Petugas Pencatat (`users_profile.full_name`), dan Waktu Catat.
5. **Ekspor CSV & Cetak Dokumen**:
   - **Ekspor CSV**: Klik tombol **Ekspor CSV** untuk mengunduh rekapitulasi lengkap dalam format file `.csv` yang siap dianalisis di Microsoft Excel atau Google Sheets.
   - **Cetak Laporan**: Klik tombol **Cetak** untuk mencetak laporan ke printer fisik atau menyimpan sebagai dokumen PDF resmi.

---

## 9. Resep & Proses Produksi (Production Module)

### A. Formula & Master Resep (`Produksi > Master Resep`)
1. Buka menu **Produksi > Master Resep** untuk mendefinisikan formula racikan produk jadi spa (misal: racikan massage oil, body scrub, lulur rempah).
2. **Pencarian Bahan Baku Lintas Cabang & Mutasi STO**:
   - Saat menyusun komposisi bahan baku (*Pilih Bahan Baku*), sistem menyediakan pencarian menyeluruh (*fallback search*).
   - Staf dapat mencari bahan baku milik gerai sendiri, bahan baku terstandar dari **Zen Produk (`901`)**, maupun bahan baku yang diperoleh dari transfer logistik antar-cabang (STO) yang tercatat di saldo fisik gudang (`inventory_balance`).
3. Tentukan takaran kuantitas dan satuan bahan baku per 1 batch racikan, lalu simpan formula resep.

---

### B. Proses Produksi (`Produksi > Proses Produksi`)
Digunakan untuk mengeksekusi peracikan produk di cabang berdasarkan formula resep yang telah didaftarkan:
1. Buka menu **Produksi > Proses Produksi**.
2. **Pilihan Produk Jadi Terbatas pada Resep Cabang**:
   - Dropdown **Produk (Barang Jadi)** secara ketat **hanya menampilkan produk yang telah terdaftar di Master Resep (`master_recipes`) dengan `kode_outlet` cabang aktif Anda**.
   - Hal ini mencegah staf memproses racikan produk jadi yang belum memiliki formula resep resmi atau formula milik cabang lain.
3. Masukkan **Jumlah Batch** yang akan diproduksi.
4. Sistem secara otomatis menampilkan lembar kerja bahan baku:
   - Menghitung kebutuhan total kuantitas setiap bahan baku.
   - Memeriksa ketersediaan stok bahan baku di gudang cabang secara *real-time*.
   - Menampilkan estimasi Harga Pokok Produksi (HPP) per unit dalam format Rupiah (`Rp`).
5. Pastikan seluruh stok bahan baku berstatus mencukupi (indikator hijau), lalu klik **Proses Produksi**.
6. Sistem secara otomatis:
   - Memotong seluruh bahan baku dari saldo stok gudang cabang.
   - Menambahkan produk jadi ke saldo inventaris gudang secara instan.
   - Mencatat mutasi produksi ke kartu stok dan histori biaya database.

---

## 10. Keuangan & Kas/Bank (Finance)

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

## 11. Laporan & Rekapitulasi (Reports)

Seluruh laporan dilengkapi filter fleksibel rentang tanggal, pemilihan cabang, metrik ringkasan kartu, serta tombol **Ekspor CSV** untuk pengolahan lebih lanjut di Microsoft Excel:

1. **Laporan Selisih Stock Opname (`Inventaris & Stok > Laporan Selisih Opname`)**:
   - Memantau rincian audit selisih perhitungan fisik stok terhadap catatan sistem beserta estimasi dampak finansial (nilai selisih rupiah).
   - **Filter Nomor Batch Dokumen Opname**: Dilengkapi dropdown dinamis untuk memfilter data berdasarkan nomor batch opname spesifik (`document_number`) atau menampilkan seluruh batch.
   - **Filter Hanya yang Berselisih**: Saklar cepat untuk menyaring hanya barang yang mengalami perbedaan stok (selisih $\neq 0$).
   - **Format Cetak Dokumen A4 Resmi (4 Kolom Tanda Tangan)**:
     - Klik tombol **Cetak Laporan** untuk mencetak dokumen selisih berstandar audit format kertas A4.
     - Di bagian paling bawah halaman terakhir, sistem otomatis mencetak 4 kolom tanda tangan pertanggungjawaban:
       1. **Kolom 1 (Dibuat Oleh)**: Otomatis mencantumkan nama lengkap petugas opname dari data profil pengguna (`users_profile.full_name`).
       2. **Kolom 2 (Pemeriksa / Verifikator 1)**: Garis tanda tangan kosong `(...................)`.
       3. **Kolom 3 (Pemeriksa / Verifikator 2)**: Garis tanda tangan kosong `(...................)`.
       4. **Kolom 4 (Disetujui / Manager Cabang)**: Garis tanda tangan kosong `(...................)`.
2. **Laporan Nilai Stok (`Inventaris & Stok > Laporan Nilai Stok`)**:
   - Menghitung total valuasi aset gudang per cabang berdasarkan saldo kuantitas stok (*Qty on Hand*), harga beli, dan harga jual.
   - **Pemberlakuan Privasi Harga Antar-Cabang**: Pada item yang diperoleh dari transfer logistik (STO) cabang lain, kolom *Harga Beli* otomatis disamakan dengan *Harga Jual* untuk melindungi kerahasiaan harga modal holding/cabang asal.
3. **Laporan Kuantitas Stok (`Inventaris & Stok > Laporan Kuantitas Stok`)**:
   - Memantau saldo fisik barang secara murni (tanpa nominal rupiah) untuk kebutuhan cek fisik cepat di rak gudang.
4. **Laporan Pemakaian Internal (`Inventaris & Stok > Laporan Pemakaian Internal`)**:
   - Merekap seluruh barang yang dipakai untuk operasional, total biaya pengeluaran, perincian kategori pemakaian, dan staf penanggung jawab.
5. **Laporan Retur Internal (`Inventaris & Stok > Laporan Retur Internal`)**:
   - Memantau nilai barang yang dikembalikan ke gudang beserta persentase kondisi barang (Baik vs Rusak).
6. **Laporan STO Lengkap (`Transfer Stok (STO)`)**:
   - **Laporan Request Barang (`Transfer Stok (STO) > Laporan Request Barang`)**: Laporan komprehensif 2-tab yang memantau **Ringkasan Dokumen Request** (status pemenuhan `OPEN`/`FULFILLED`/`CANCELLED` beserta tautan nomor STO realisasi) serta **Detail Item: Request vs Realisasi STO** (membandingkan jumlah diminta vs jumlah dipesan di STO, dikirim, diterima, dan selisih pemenuhan).
   - **Ringkasan STO**: Rekapitulasi volume dan nilai transfer antar-cabang.
   - **STO Transit**: Melacak barang yang masih dalam perjalanan ekspedisi antar-outlet.
   - **Piutang Antar-Outlet (STO AR Report)**: Memantau saldo piutang yang belum dilunasi oleh cabang penerima barang.
7. **Laporan Biaya & Hasil Produksi (`Produksi > Biaya & Hasil Produksi`)**:
   - Evaluasi efisiensi racikan, persentase rendemen hasil (*yield percentage*), dan varians biaya produksi.

---

## 12. Tanya Jawab & Kendala Umum (Troubleshooting)

**1. Muncul pesan "Sesi telah berakhir" atau "Failed to load session"**
- Muat ulang (*refresh*) halaman peramban web Anda (tekan **F5** atau **Ctrl + F5**). Jika masih berlanjut, lakukan Logout dan masuk kembali.

**2. Gagal menyimpan karena "Jumlah melebihi pesanan" (Over-receiving)**
- Periksa kembali fisik barang dan PO. Sistem melarang penerimaan melebihi kuantitas yang tertera pada dokumen pesanan pembelian resmi.

**3. Data outlet lain tidak terlihat di layar saya**
- Sistem menerapkan pembatasan keamanan ketat berbasis peran (*Row-Level Security*). Staf cabang hanya dapat melihat data inventaris dan transaksi milik cabangnya sendiri. Akses lintas seluruh cabang hanya dimiliki oleh akun Holding dan Superuser.

**4. Kategori pemakaian tidak bisa dihapus**
- Sesuai standar audit perusahaan, data kategori pemakaian dilindungi kebijakan *No-Delete*. Anda dapat menonaktifkannya dengan menggeser tombol alih status ke **Nonaktif** agar tidak muncul pada formulir pemakaian baru.

**5. Ulasan tamu yang baru dikirim member belum muncul di website**
- Setiap ulasan baru otomatis berstatus `Menunggu Moderasi` (`published = false`) demi menjaga kualitas dan etika konten. Buka menu **Web Data > User Testimoni**, periksa ulasan tersebut, lalu geser saklar **Tayang di Web** ke posisi aktif agar tampil di website statis.

**6. Layanan spa tertentu tidak muncul di cabang saya pada website**
- Buka menu **Master Data > Info Outlet** menggunakan akun Admin Cabang. Pada bagian **Layanan Tersedia di Outlet Ini**, centang layanan yang disediakan cabang Anda lalu klik Simpan. Layanan tersebut akan otomatis terdaftar sebagai cabang yang menyediakan layanan di website.

---

## 13. Layanan Bantuan & Dukungan IT

Apabila Anda mengalami kendala teknis atau membutuhkan bantuan terkait hak akses akun, silakan hubungi tim IT Administrator:
* **Email Dukungan IT**: `support@zenfamilyspa.id` / `borist@nababancloud.net`
* **WhatsApp Dukungan IT**: `+6282188800071`
* **Portal Sistem**: Tim IT & DevOps Zen Family Spa & Reflexology
