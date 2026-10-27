# Panduan Deployment Coolify: Warehouse Management System (WHMS)

Dokumentasi resmi ini memuat panduan komprehensif penerapan (**deployment**) aplikasi **Zen Warehouse Management System (WHMS)** ke platform **Coolify Server Management** untuk dua target environment:
1. **Staging / Trial Environment** (terhubung ke Supabase Staging: `okchlapizmhoueeeldrh.supabase.co`, dengan banner Mode Latihan aktif).
2. **Production / Live Operasional** (terhubung ke Supabase Production: `ihdlwogvjfgawgsalgng.supabase.co`, banner latihan nonaktif).

---

## 1. Arsitektur & Kepatuhan Standar Production Grade

Aplikasi WHMS telah diaudit dan dioptimalkan dengan standar **Production Grade**:
* **Teknologi Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS v4, Zustand, TanStack Query, Lucide Icons, Radix UI.
* **Multi-Stage Container Build**:
  - **Stage 1 (Builder)**: Menggunakan Node.js 22 Alpine untuk kompilasi bundle dengan pemangkasan ukuran dependensi.
  - **Stage 2 (Runtime Server)**: Menggunakan Nginx Alpine super ringan (< 30 MB) dengan konsumsi RAM sangat minim (~15-25 MB).
* **Keamanan Kode & Zero-Leakage**:
  - **Pembersihan Log Otomatis**: Konfigurasi `esbuild.drop: ['console', 'debugger']` di `vite.config.ts` otomatis memangkas seluruh `console.log`, `console.warn`, dan `debugger` pada saat build production, mencegah kebocoran data sensitif melalui DevTools browser.
  - **Security Headers Nginx**: Dilengkapi header keamanan `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, dan `Referrer-Policy: strict-origin-when-cross-origin`.
* **Kinerja & Kontrol Cache Agresif**:
  - **Kompresi Gzip**: Mengompresi seluruh aset teks, CSS, JavaScript, JSON, dan SVG.
  - **Cache Fingerprint Vite (`/assets/*`)**: Disimpan dengan `Cache-Control: public, max-age=31536000, immutable` (1 tahun) untuk pemuatan halaman super cepat.
  - **Anti-Stale Cache (`index.html`)**: Disajikan dengan `Cache-Control: no-cache, no-store, must-revalidate` sehingga setiap rilis baru langsung diterima staf tanpa perlu hard-refresh browser.
* **SPA Routing Fallback**: Menggunakan `try_files $uri $uri/ /index.html;` pada Nginx untuk memastikan navigasi dan reload halaman rute dalam (misal `/inventory/stock-opname`, `/master/product`, `/sto`) tidak menghasilkan HTTP 404.
* **Container Healthcheck**: Dilengkapi endpoint bawaan Nginx `/healthz` (HTTP 200 OK) yang dipantau setiap 15 detik oleh Docker/Coolify untuk menjamin ketersediaan service secara kontinu (*zero-downtime healthcheck*).

---

## 2. Informasi Konfigurasi Lingkungan (Environment Variables)

> [!IMPORTANT]
> **ATURAN WAJIB VITE BUILD DI COOLIFY**:
> Pada aplikasi berbasis Vite SPA, variabel lingkungan berawalan `VITE_` dibundel secara statis ke dalam file JavaScript **pada saat proses build container (Build Time)**.
> Oleh karena itu, di dashboard Coolify, pastikan mencentang tombol opsi **"Build Variable"** (atau *"Available during build"*) pada setiap variabel yang dimasukkan.

### A. Environment Staging / Mode Latihan
Gunakan konfigurasi ini untuk instance pengujian atau simulasi staf (misal domain: `whm-staging.zenfamilyspa.id`):

| Nama Variabel | Nilai (Value) | Keterangan |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://okchlapizmhoueeeldrh.supabase.co` | Endpoint Supabase Staging |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_UWMj_yrx7u157kklx62Tzg_Kzy787QN` | Public Anon Key Staging |
| `VITE_APP_NAME` | `Zen Warehouse Management (Latihan)` | Nama aplikasi pada tab browser |
| `VITE_APP_VERSION` | `1.0.0-stag` | Label versi aplikasi |
| `VITE_COMPANY_NAME` | `Zen Family Spa & Reflexology` | Nama entitas perusahaan |
| `VITE_NAVBAR_TITLE` | `ZEN WAREHOUSE [STAGING]` | Judul header navigasi |
| `VITE_APP_MODE` | `STAG` | Mengaktifkan banner statis "Mode Latihan" di bagian atas |

**Format Salin-Tempel Sekaligus (.env) untuk Coolify Staging:**
```env
VITE_SUPABASE_URL=https://okchlapizmhoueeeldrh.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_UWMj_yrx7u157kklx62Tzg_Kzy787QN
VITE_APP_NAME=Zen Warehouse Management (Latihan)
VITE_APP_VERSION=1.0.0-stag
VITE_COMPANY_NAME=Zen Family Spa & Reflexology
VITE_NAVBAR_TITLE=ZEN WAREHOUSE [STAGING]
VITE_APP_MODE=STAG
```

---

### B. Environment Production (Live Operasional)
Gunakan konfigurasi ini untuk instance live operasional cabang dan holding (misal domain: `whm.zenfamilyspa.id`):

| Nama Variabel | Nilai (Value) | Keterangan |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://ihdlwogvjfgawgsalgng.supabase.co` | Endpoint Supabase Production |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_KobV2o95Ymfem77b4zVBJg_E_onldRD` | Public Anon Key Production |
| `VITE_APP_NAME` | `Zen Warehouse Management` | Nama aplikasi resmi |
| `VITE_APP_VERSION` | `1.0.0` | Versi rilis production |
| `VITE_COMPANY_NAME` | `Zen Family Spa & Reflexology` | Nama perusahaan |
| `VITE_NAVBAR_TITLE` | `ZEN WAREHOUSE` | Judul header navigasi |
| `VITE_APP_MODE` | `PROD` | Menonaktifkan banner latihan (mode produksi bersih) |

**Format Salin-Tempel Sekaligus (.env) untuk Coolify Production:**
```env
VITE_SUPABASE_URL=https://ihdlwogvjfgawgsalgng.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_KobV2o95Ymfem77b4zVBJg_E_onldRD
VITE_APP_NAME=Zen Warehouse Management
VITE_APP_VERSION=1.0.0
VITE_COMPANY_NAME=Zen Family Spa & Reflexology
VITE_NAVBAR_TITLE=ZEN WAREHOUSE
VITE_APP_MODE=PROD
```

---

## 3. Langkah-demi-Langkah Penerapan di Coolify

### Langkah 1: Buat Resource Aplikasi Baru
1. Masuk ke dashboard **Coolify** Anda (`https://coolify.yourdomain.com`).
2. Masuk ke **Projects** $\rightarrow$ Pilih project target (misal: `Zen System` atau `Zen Production`).
3. Pilih environment target (`production` atau `staging`).
4. Klik **+ Add Resource** $\rightarrow$ Pilih **Application**.
5. Pilih **Public Repository** atau **Private Repository** (jika menggunakan integrasi GitHub/GitLab).
6. Tentukan konfigurasi git:
   - **Repository URL**: Masukkan URL repositori frontend WHMS Anda.
   - **Branch**: `main` (atau `production`).
   - **Base Directory**: `/` (atau `/frontend/warehousemanagement` jika monorepo).

---

### Langkah 2: Konfigurasi Build Pack & Port
1. Pada menu **General Configuration**:
   - **Build Pack**: Pilih **Dockerfile** *(Coolify akan otomatis mendeteksi file `Dockerfile` yang telah kita siapkan)*.
   - **Ports Exposes**: Isikan `80`.
   - **Healthcheck Path**: `/healthz`.
2. Pada bagian **Domains**:
   - Masukkan FQDN domain lengkap dengan protokol HTTPS:
     - Staging: `https://whm-staging.zenfamilyspa.id`
     - Production: `https://whm.zenfamilyspa.id`
   - *(Coolify dan Traefik akan otomatis menerbitkan sertifikat SSL/TLS gratis via Let's Encrypt)*.

---

### Langkah 3: Masukkan Environment Variables
1. Masuk ke tab **Environment Variables** di menu navigasi kiri resource aplikasi Coolify.
2. Klik tombol **Developer View** / **Raw Text Mode**.
3. Tempel teks environment variables sesuai target environment (Staging atau Production dari Bagian 2 di atas).
4. **PENTING**: Pastikan kolom **"Build Variable"** terceklis untuk seluruh variabel agar Vite dapat membacanya saat proses kompilasi `npm run build`.

---

### Langkah 4: Jalankan Deployment
1. Klik tombol **Deploy** di pojok kanan atas.
2. Pantau jalannya proses pada tab **Build Logs**:
   - Tahap 1: Instalasi dependensi Node.js (`npm install`).
   - Tahap 2: Kompilasi TypeScript dan Vite bundle (`tsc && vite build`).
   - Tahap 3: Pembuatan image Nginx Alpine, injeksi `nginx.conf`, dan aktivasi healthcheck.
3. Setelah status berubah menjadi **Healthy** / **Running**, buka domain Anda pada peramban web.

---

## 4. Checklist Verifikasi Pasca-Deployment

Lakukan verifikasi operasional berikut setelah aplikasi aktif di Coolify:

1. [ ] **Koneksi Supabase & Autentikasi**:
   - Buka halaman login, masukkan kredensial akun staf/admin.
   - Pastikan login berhasil tanpa error CORS atau network failure.
2. [ ] **Verifikasi Header Mode**:
   - Pada instance Staging (`VITE_APP_MODE="STAG"`), pastikan banner kuning *"MODE LATIHAN"* muncul di header atas.
   - Pada instance Production (`VITE_APP_MODE="PROD"`), pastikan tampilan header bersih tanpa banner simulasi.
3. [ ] **SPA Subroute Reload Test**:
   - Navigasi ke menu dalam, misal: `/master/product`, `/inventory/internal-usage`, atau `/sto`.
   - Lakukan refresh browser (**F5**).
   - Pastikan halaman termuat kembali secara normal (tidak muncul error Nginx 404 Not Found).
4. [ ] **Healthcheck Endpoint**:
   - Buka `https://your-domain.com/healthz` di browser atau via curl:
     ```bash
     curl -I https://your-domain.com/healthz
     ```
   - Pastikan respons mengembalikan HTTP status `200 OK` dengan body `OK`.
5. [ ] **Fitur Unggah Foto Produk**:
   - Buka menu **Master Data** $\rightarrow$ **Master Produk**.
   - Klik **Tambah Produk** atau **Ubah**.
   - Pilih foto dari perangkat pada slot Foto 1 & 2.
   - Simpan dan pastikan foto tersimpan di Supabase Storage bucket `product-images` dan thumbnail tampil pada tabel.
6. [ ] **Fitur Mode Gelap (Zen Dark Mode)**:
   - Klik tombol **Ganti Mode Gelap** di sidebar.
   - Pastikan tema berpindah mulus ke palet River Stone (`#191914` / `#22221B`) dan status tema tersimpan di `localStorage`.

---

Dokumen ini disusun sebagai panduan standar operasional resmi tim IT dan DevOps Zen Family Spa & Reflexology.
