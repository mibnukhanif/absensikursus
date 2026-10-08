# DIGITALMEERA ABSENSI

> **Sistem Absensi Digital Berbasis QR Code Statis**
> Mobile-first, aman, modern, dan siap deploy ke Vercel.

---

## 📖 Ringkasan Aplikasi

**DIGITALMEERA ABSENSI** adalah solusi presensi digital untuk institusi pendidikan dan pelatihan. Murid cukup login dari smartphone, lalu memindai **QR Code Statis** yang terpasang di lokasi (papan absensi, gerbang, atau kelas). Seluruh data absensi dicatat secara real-time dengan timestamp server `Asia/Jakarta`, dilengkapi proteksi anti-duplicate attendance, sistem role-based murid dan administrator, pemantauan statistik langsung, dan ekspor laporan.

---

## ✨ Fitur Utama

### 🧑‍🎓 Fitur Murid
1. **Login Murid**: Masuk menggunakan NIS / Username dan Password.
2. **Dashboard Mobile-First**:
   - Status kehadiran hari ini (🟢 Sudah Absen / 🟡 Belum Absen).
   - Waktu jam presensi tercatat otomatis.
3. **Kamera Pemindai QR (Real-Time)**:
   - Akses kamera perangkat otomatis dengan opsi alih kamera belakang/depan.
   - Deteksi QR instan menggunakan engine Canvas & JSQR.
4. **Riwayat Absensi**:
   - Daftar riwayat presensi lengkap dengan tanggal, jam, status, dan token QR.
5. **Manajemen Akun & Ganti Password**:
   - Murid dapat memperbarui kata sandi secara mandiri.

### 🛡️ Fitur Admin
1. **Statistik Kehadiran Real-Time**:
   - Total murid aktif, hadir hari ini, belum absen, dan persentase kehadiran harian.
   - Grafik tren kehadiran mingguan dan feed presensi terkini.
2. **Kelola Data Murid (CRUD)**:
   - Tambah murid baru (NIS, Nama Lengkap, Kelas, Username, No HP/WhatsApp, Password).
   - Edit data murid, ganti status Aktif/Nonaktif.
   - Hapus murid (soft-delete aman agar histori absensi tidak hilang).
   - Fitur Reset Password murid secara langsung.
3. **Monitoring & Log Absensi**:
   - Filter tanggal (hari ini, rentang tanggal tertentu), filter kelas, filter status (Hadir/Terlambat).
   - Pencarian cepat berdasarkan nama atau NIS.
4. **Kelola QR Code Statis**:
   - Lihat QR Code aktif dengan logo Digitalmeera.
   - Ubah identifier (misal: `DIGITALMEERA-ABSENSI-001`).
   - Unduh QR Code dalam format PNG resolusi tinggi.
   - **Cetak Poster Resmi Absensi**: Tampilan siap print A4/Poster dengan logo, nama lokasi, dan instruksi scan untuk murid.
5. **Laporan & Ekspor**:
   - Rekapitulasi presensi berdasarkan rentang tanggal & kelas.
   - Ekspor data ke format **CSV / Excel**.
   - Mode Cetak Laporan Formal untuk arsip sekolah.
6. **Pengaturan Lembaga**:
   - Ubah nama aplikasi, subjudul, nama lembaga, nomor WhatsApp admin, jam batas masuk, dan teks footer.
   - Log audit aktivitas admin.

---

## 🔒 Keamanan & Prinsip Kredensial

* **Nol Hardcoded Kredensial**: Tidak ada akun demo, kredensial default, atau password tersimpan di source code.
* **Initial Setup / Bootstrap**:
  - Saat aplikasi pertama kali dijalankan dan database belum memiliki admin, sistem menampilkan wizard **Setup Administrator Pertama** dengan verifikasi password aman (min. 8 karakter).
  - Atau dapat diset via Environment Variable `INITIAL_ADMIN_EMAIL` & `INITIAL_ADMIN_PASSWORD`.
* **Password Hashing**: Semua kata sandi di-hash menggunakan `bcryptjs` (salt 10).
* **JWT & Cookie HttpOnly**: Sesi terenkripsi menggunakan JSON Web Token.
* **Server-Authoritative Validation**:
  - Waktu absensi dan tanggal dibuat murni di server (Timezone: `Asia/Jakarta`).
  - Frontend tidak dapat memanipulasi jam hadir atau ID murid.
  - Pengecekan duplikasi absensi pada hari yang sama.

---

## 🚀 Panduan Deploy ke Vercel

### Langkah 1: Persiapan Repository
Push kode sumber ke GitHub:
```bash
git init
git add .
git commit -m "feat: inisialisasi Digitalmeera Absensi"
git branch -M main
git remote add origin https://github.com/USERNAME/digitalmeera-absensi.git
git push -u origin main
```

### Langkah 2: Import ke Vercel
1. Buka [Vercel Dashboard](https://vercel.com/dashboard).
2. Klik **Add New** > **Project** dan pilih repository GitHub Anda.
3. Framework Preset: **Vite** (atau Other).
4. Build Command: `npm run build`
5. Output Directory: `dist`

### Langkah 3: Konfigurasi Environment Variables di Vercel
Di menu **Settings** > **Environment Variables**, tambahkan:

| Variable | Deskripsi |
| :--- | :--- |
| `AUTH_SECRET` | String acak aman (minimal 32 karakter) untuk enkripsi JWT |
| `INITIAL_ADMIN_EMAIL` | *(Opsional)* Email admin pertama jika ingin bootstrap otomatis |
| `INITIAL_ADMIN_PASSWORD` | *(Opsional)* Password admin pertama |
| `DATABASE_URL` | *(Opsional)* Koneksi PostgreSQL / Supabase jika menggunakan database cloud |
| `GOOGLE_SHEETS_ID` | *(Opsional)* ID Spreadsheet jika mengaktifkan mirror Google Sheets |

Klik **Deploy**. Selesai!

---

## 📊 Integrasi Google Spreadsheet (Mirroring)

Jika Anda ingin menyimpan salinan absensi ke Google Sheets:
1. Buat Spreadsheet baru di Google Drive.
2. Buat Sheet/Tab berikut:
   - `MURID`: `ID_MURID`, `NIS`, `NAMA`, `KELAS`, `AUTH_ID`, `NO_HP`, `STATUS`, `TANGGAL_DAFTAR`
   - `ABSENSI`: `ID_ABSENSI`, `ID_MURID`, `NIS`, `NAMA`, `KELAS`, `TANGGAL`, `JAM`, `STATUS`, `QR_ID`, `TIMESTAMP`
   - `ADMIN`: `ID_ADMIN`, `AUTH_ID`, `NAMA`, `ROLE`, `STATUS`
   - `SETTINGS`: `KEY`, `VALUE`
3. Salin Spreadsheet ID dari URL dan masukkan ke menu **Pengaturan** di dashboard admin atau env `GOOGLE_SHEETS_ID`.

---

## 🛠️ Menjalankan di Lokal (Development)

1. Clone repository & install dependencies:
   ```bash
   npm install
   ```
2. Jalankan server development:
   ```bash
   npm run dev
   ```
3. Buka browser di `http://localhost:3000`.
4. Jika pertama kali dibuka, ikuti panduan **Setup Administrator Pertama** untuk membuat akun Super Admin.
