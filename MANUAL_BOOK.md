# MANUAL BOOK
## Ruang Raya Event Studio

**Versi:** 1.1  
**Jenis dokumen:** Panduan pengguna  
**Platform:** Aplikasi web responsif

## Daftar Isi

1. [Informasi Umum](#1-informasi-umum)
2. [Arsitektur dan Hak Akses](#2-arsitektur-dan-hak-akses)
3. [Panduan Klien](#3-panduan-klien)
4. [Panduan Pemilik EO](#4-panduan-pemilik-eo-admin)
5. [Panduan Deployment Lokal](#5-panduan-deployment-lokal)
6. [Batasan dan Catatan Keamanan](#6-batasan-dan-catatan-keamanan)
7. [Pemecahan Masalah](#7-pemecahan-masalah)

---

## 1. Informasi Umum

### 1.1 Tentang aplikasi

Ruang Raya Event Studio adalah platform demonstrasi layanan event organizer yang menghubungkan calon klien dengan tim penyelenggara acara. Pengunjung dapat melihat paket, mendaftar sebagai klien, membuat pesanan, memilih kanal pembayaran simulasi, memantau progres acara, dan mencetak invoice. Pemilik EO dapat memantau ringkasan operasional, mengelola pesanan dan paket, serta meninjau arus kas.

### 1.2 Tujuan penggunaan

Aplikasi ini disiapkan sebagai prototipe bisnis untuk mata kuliah Digital Entrepreneurship. Tujuannya adalah memperlihatkan alur layanan EO secara digital dari penemuan paket sampai administrasi pesanan dan pelaporan keuangan.

### 1.3 Persyaratan penggunaan

- Browser modern dengan JavaScript aktif.
- Untuk menjalankan di komputer lokal: Node.js 20 LTS atau lebih baru dan npm.
- Koneksi internet diperlukan untuk aset visual dan font eksternal yang digunakan halaman.
Langkah setup lengkap tersedia pada [Panduan Deployment Lokal](#5-panduan-deployment-lokal).

---

## 2. Arsitektur dan Hak Akses

### 2.1 Peran pengguna

| Peran | Rute dashboard | Fungsi utama |
|---|---|---|
| Pengunjung | `/` | Melihat landing page dan katalog publik; belum dapat membuka dashboard. |
| Klien | `/client/dashboard` | Melihat pesanan milik akun, progres acara, dan invoice; dapat memulai pemesanan. |
| Pemilik EO (Admin) | `/admin` | Melihat metrik bisnis, mengelola pesanan dan paket, serta memeriksa laporan keuangan. |

Rute dashboard dilindungi berdasarkan sesi dan role. Pengunjung tanpa sesi yang membuka rute dashboard akan dikembalikan ke landing page dan diminta login. Jika role tidak sesuai, aplikasi mengarahkan pengguna ke dashboard yang sesuai dengan role sesi aktif.

### 2.2 Penyimpanan data pada versi demo

- Sesi login memakai cookie HttpOnly dengan masa berlaku delapan jam.
- Akun lokal disimpan pada `data/auth-users.json`; kata sandi disimpan sebagai hash, bukan teks biasa.
- Paket, pesanan, dan catatan keuangan disimpan di `localStorage` browser.
- Payment intent simulasi disimpan di memori proses API dan akan hilang jika server dimulai ulang.
- Skema PostgreSQL tersedia di `db/schema.sql` sebagai rancangan; aplikasi demo saat ini belum menggunakan database tersebut untuk menyimpan data bisnis.

### 2.3 Alur autentikasi

Klien membuat akun terlebih dahulu melalui tab **Buat akun klien**, lalu berpindah ke tab **Masuk** untuk login. Registrasi klien tidak otomatis membuat sesi login. Admin masuk melalui tab **Pemilik EO** menggunakan akun admin yang disediakan saat server lokal pertama kali dijalankan.

---

## 3. Panduan Klien

### 3.1 Registrasi akun

1. Buka landing page Ruang Raya Event Studio.
2. Pilih **Masuk** di bagian atas halaman.
3. Pada modal akses, pilih **Klien**.
4. Pilih tab **Buat akun klien**.
5. Isi nama lengkap, alamat email yang valid, dan kata sandi minimal delapan karakter.
6. Tekan **Buat akun klien**.
7. Setelah pesan pendaftaran berhasil muncul, form berpindah ke tab **Masuk** dan email terisi otomatis.
8. Masukkan kata sandi yang baru dibuat dan tekan **Masuk sebagai klien**.

Jika email telah terdaftar, gunakan tab **Masuk**. Email akun harus unik.

### 3.2 Login klien

1. Buka **Masuk** dan pilih role **Klien**.
2. Masukkan email dan kata sandi akun klien.
3. Tekan **Masuk sebagai klien**.
4. Setelah kredensial diverifikasi, aplikasi membuka dashboard klien di `/client/dashboard`.

Kredensial yang salah akan menampilkan pesan kesalahan pada modal; aplikasi tidak membuka dashboard. Tombol silang atau klik di luar modal menutup modal dan menampilkan landing page.

### 3.3 Menjelajahi paket

1. Dari landing page, tekan **Temukan paket** atau **Lihat semua paket**. Pada dashboard, pilih tab **Paket acara**.
2. Pilih kategori **Semua**, **Wedding**, **Birthday**, **Corporate**, atau **Gathering**.
3. Gunakan kolom pencarian untuk menemukan paket berdasarkan nama, kategori, atau deskripsi.
4. Periksa kapasitas, harga mulai, deskripsi, dan daftar fasilitas pada kartu paket.
5. Tekan tombol pemesanan pada paket yang dipilih.

Jika belum login, aplikasi akan meminta login klien terlebih dahulu. Setelah login, pemesanan dapat dilanjutkan.

### 3.4 Membuat pesanan

Pada langkah **Detail acara**:

1. Pastikan nama pemesan dan email invoice sudah benar.
2. Pilih tanggal acara. Tanggal yang tersedia harus hari ini atau sesudahnya.
3. Masukkan perkiraan jumlah tamu.
4. Isi lokasi atau nama venue.
5. Pilih add-on jika diperlukan. Harga estimasi diperbarui sesuai pilihan.
6. Tekan **Lanjut ke pembayaran**.

Periksa kembali paket, tanggal, lokasi, jumlah tamu, dan add-on pada halaman ringkasan sebelum membuat transaksi.

### 3.5 Memilih metode pembayaran simulasi

Checkout menyediakan kanal berikut:

| Kelompok | Pilihan yang tersedia |
|---|---|
| QRIS | QRIS Universal; deskripsi mencakup aplikasi pembayaran dan perbankan yang mendukung QRIS. |
| Virtual Account | BNI, Mandiri, Danamon, Permata, CIMB Niaga, BSI, Maybank, BRI, dan Bank Sinarmas. |
| Gerai tunai | Alfamart, Alfamidi, Indomaret, Lawson, dan Dan+Dan. |

1. Pilih salah satu kanal pembayaran.
2. Tekan **Buat transaksi**.
3. Aplikasi menampilkan instruksi sandbox: QR demo untuk QRIS atau nomor/kode demo untuk VA dan gerai.
4. Status transaksi mulai dari **Menunggu pembayaran**. Aplikasi memeriksa status dari API setiap 1,5 detik.
5. Simulator mengirim status berhasil secara otomatis setelah sekitar empat detik. Jika transaksi berhasil, status berubah menjadi **Lunas** dan pesanan menampilkan **Berhasil**.
6. Untuk menguji alur gagal, tekan **Simulasikan pembayaran gagal** selagi transaksi masih menunggu.
7. Tekan **Lanjutkan di pesanan** atau **Lihat pesanan** untuk menutup instruksi dan kembali ke riwayat.

> **Penting:** QR, nomor VA, dan kode gerai pada aplikasi lokal adalah data simulasi. QR tersebut bukan QRIS aktif dan tidak dapat digunakan untuk memindahkan dana. Checkout belum terhubung ke akun gateway produksi.

### 3.6 Memantau pesanan

1. Buka tab **Pesanan saya** di dashboard klien.
2. Setiap kartu menampilkan nomor pesanan, status pembayaran, paket, tanggal, lokasi, jumlah tamu, total, dan add-on.
3. Lihat indikator progres dari **Pesanan dibuat**, **Pembayaran**, **Persiapan acara**, hingga **Selesai**.
4. Riwayat yang ditampilkan untuk klien dibatasi ke pesanan dengan email akun yang sedang login.

### 3.7 Mencetak invoice

1. Pada kartu pesanan, tekan **Invoice**.
2. Periksa nomor invoice, tanggal terbit, status pembayaran, identitas klien, rincian paket/add-on, dan total.
3. Tekan **Cetak / simpan PDF**.
4. Pada dialog cetak browser, pilih printer atau **Save as PDF**. Layout invoice memiliki lebar tetap 80 mm. Gunakan kertas thermal 80 mm untuk hasil penuh; jika memilih A4, isi invoice tetap selebar 80 mm pada lembar A4.

---

## 4. Panduan Pemilik EO (Admin)

### 4.1 Kredensial dan login admin

Email default admin adalah `admin@ruangraya.id`. Kata sandi **tidak di-hardcode dengan nilai tetap**; server membuat kata sandi acak pada saat akun admin pertama kali dibuat dan menampilkannya satu kali di terminal.

1. Jalankan `npm run dev` dari terminal proyek.
2. Jika akun admin belum pernah dibuat, catat kata sandi demo yang tampil satu kali pada output terminal.
3. Pada landing page, tekan **Masuk**, lalu pilih **Pemilik EO**.
4. Masukkan `admin@ruangraya.id` dan kata sandi demo.
5. Tekan **Masuk sebagai Pemilik EO**. Login berhasil membuka dashboard di `/admin`.

Untuk menetapkan password sebelum akun pertama dibuat, atur variabel lingkungan sebelum menjalankan server. Contoh PowerShell:

```powershell
$env:ADMIN_PASSWORD = 'KataSandiDemo-YangKuat'
npm run dev
```

Jika akun sudah ada dalam `data/auth-users.json`, mengubah variabel tersebut tidak mengganti password akun yang tersimpan. Menghapus file itu lalu menjalankan ulang server akan membuat ulang admin, tetapi juga menghapus semua akun klien lokal. Tindakan ini hanya untuk reset data demo.

### 4.2 Dashboard dan metrik bisnis

Dashboard admin menampilkan:

- **Total pemasukan:** jumlah catatan bertipe pemasukan yang ada pada data finance lokal.
- **Acara berjalan:** jumlah pesanan yang status acaranya belum **Selesai**.
- **Klien terjangkau:** indikator demo berdasarkan email pada pesanan dan baseline data contoh; bukan metrik CRM produksi.
- **Verifikasi pembayaran:** daftar pesanan yang masih berstatus **Menunggu pembayaran**.
- **Agenda terdekat:** beberapa acara yang belum selesai.

Jika pembayaran simulator berhasil, catatan pemasukan dibuat otomatis dan total dashboard serta laporan diperbarui.

### 4.3 Mengelola pesanan

1. Pilih tab **Pesanan** pada navigasi dashboard.
2. Periksa status pembayaran, data acara, add-on, dan progres pada kartu pesanan.
3. Jika diperlukan, tekan **Verifikasi pembayaran** pada pesanan yang masih menunggu. Tindakan ini menandai pembayaran berhasil dan menambahkan catatan pemasukan jika belum tercatat.
4. Untuk pesanan yang sudah berhasil, gunakan daftar status acara untuk mengubah progres ke **Pembayaran diverifikasi**, **Persiapan**, atau **Selesai**.
5. Untuk menghapus pesanan, tekan **Hapus** pada kartu terkait.
6. Pada pop-up **Hapus pesanan?**, periksa paket, nomor pesanan, dan nama klien. Tekan **Batal** untuk membatalkan atau **Hapus pesanan** untuk melanjutkan.
7. Setelah dikonfirmasi, pesanan dihapus dari state lokal dan catatan pemasukan yang merujuk ke pesanan tersebut ikut dihapus. Ringkasan keuangan dihitung ulang. Tindakan hapus tidak memiliki fitur undo.

### 4.4 Mengelola paket acara

1. Pilih **Paket acara** pada navigasi admin.
2. Tekan **Paket baru** untuk menambahkan paket, atau tombol edit pada baris paket untuk memperbarui.
3. Isi nama, kategori, harga, kapasitas, deskripsi, fasilitas, dan foto bila tersedia.
4. Gunakan opsi tampil/sembunyikan untuk mengatur apakah paket muncul di katalog klien.
5. Simpan perubahan. Gunakan tombol hapus pada paket bila perlu mengeluarkannya dari katalog.

### 4.5 Mencatat pengeluaran

1. Buka tab **Keuangan**.
2. Tekan **Catat pengeluaran**.
3. Isi tanggal transaksi, keperluan, dan nominal.
4. Tekan **Simpan transaksi**. Catatan bertipe **Pengeluaran** ditambahkan dan saldo bersih dihitung ulang.

### 4.6 Memfilter dan mencetak laporan keuangan

1. Buka tab **Keuangan**.
2. Pilih periode **Semua tanggal**, **Hari ini**, **Bulan ini**, atau **Rentang khusus**.
3. Untuk rentang khusus, isi tanggal **Dari** dan **Sampai**.
4. Pilih kategori **Semua**, **Wedding**, **Birthday**, **Corporate**, **Gathering**, atau **Operasional**.
5. Periksa jumlah pemasukan, pengeluaran, saldo bersih, dan baris transaksi. Hasil filter yang sama digunakan pada laporan cetak.
6. Tekan **Simpan PDF**. Dialog cetak browser akan menampilkan dokumen dengan kop Ruang Raya, jenis laporan, periode, tanggal cetak, tabel NO./TANGGAL/KETERANGAN/KATEGORI/JENIS/JUMLAH, serta subtotal pendapatan, pengeluaran, dan saldo bersih.
7. Pilih **Save as PDF** atau printer fisik. Layout print menggunakan kertas A4 portrait dan menyembunyikan navigasi, sidebar, filter, tombol, serta elemen dashboard lain.

Dokumen laporan tidak memiliki blok tanda tangan, nama jabatan penandatangan, barcode, atau QR code. Untuk file tabel yang bisa dibuka di Excel, gunakan **Ekspor CSV**.

---

## 5. Panduan Deployment Lokal

Bagian ini ditujukan untuk anggota kelompok yang menerima proyek melalui file ZIP atau repository Git. Setup berikut menjalankan mode demo lokal; tidak memerlukan hosting, akun gateway, atau database PostgreSQL.

### 5.1 Prasyarat laptop

- Windows 10/11, macOS, atau Linux.
- Node.js 20 LTS atau lebih baru. Installer Node.js menyertakan npm.
- Git hanya diperlukan jika proyek diambil dengan metode clone.
- Browser modern seperti Chrome, Edge, atau Firefox.
- Koneksi internet untuk mengunduh dependency npm serta memuat font dan gambar eksternal.

Periksa instalasi Node.js dan npm di terminal:

```bash
node --version
npm --version
```

Jika salah satu perintah tidak dikenali, pasang Node.js LTS, tutup terminal lama, buka terminal baru, lalu ulangi pemeriksaan.

### 5.2 Mendapatkan dan membuka source code

**Pilihan A — Clone repository**

Ganti alamat dan nama folder contoh berikut sesuai repository kelompok:

```bash
git clone <URL_REPOSITORY_KELOMPOK>
cd <NAMA_FOLDER_PROYEK>
```

Di Windows, terminal dapat berupa PowerShell, Command Prompt, atau terminal bawaan VS Code. Pastikan folder aktif berisi `package.json`, `src/`, dan `server/`.

**Pilihan B — File ZIP**

1. Unduh file ZIP proyek dari platform penyimpanan atau repository.
2. Ekstrak melalui **Extract All** (Windows) atau utilitas arsip di macOS/Linux.
3. Buka folder hasil ekstraksi di VS Code.
4. Buka terminal dari menu **Terminal > New Terminal**.
5. Pastikan terminal berada di folder yang memiliki `package.json`; pindah folder dengan `cd` bila perlu.

Folder `node_modules` tidak perlu disertakan dalam ZIP karena akan dibuat kembali saat instalasi dependency. Jangan membagikan file lokal `data/auth-users.json` atau kredensial pribadi. Pada clone baru/ZIP bersih, admin demo dibuat saat API pertama kali dijalankan.

### 5.3 Instalasi dependency

Jalankan dari folder utama proyek:

```bash
npm install
```

Perintah ini membaca `package.json` dan mengunduh library React, Vite, Tailwind CSS, Express, serta dependency lain ke `node_modules/`. Tunggu sampai terminal menampilkan proses selesai. Jika instalasi gagal karena jaringan, pastikan laptop terhubung ke internet lalu ulangi `npm install`.

### 5.4 Environment dan database

**Environment file**

File `.env` tidak diperlukan untuk menjalankan demo standar. Server membaca variabel dari environment proses, tetapi proyek ini tidak memuat file `.env` secara otomatis. Bila kelompok ingin mengatur password admin sebelum akun admin pertama dibuat, gunakan environment terminal, bukan menyimpan password di source code.

Contoh PowerShell:

```powershell
$env:ADMIN_EMAIL = 'admin@ruangraya.id'
$env:ADMIN_PASSWORD = 'GantiDenganPasswordDemoYangKuat'
$env:SESSION_SECRET = 'GantiDenganSecretAcakUntukSesiLokal'
npm run dev
```

Contoh macOS/Linux:

```bash
ADMIN_EMAIL='admin@ruangraya.id' \
ADMIN_PASSWORD='GantiDenganPasswordDemoYangKuat' \
SESSION_SECRET='GantiDenganSecretAcakUntukSesiLokal' \
npm run dev
```

Password environment hanya digunakan saat admin pertama kali dibuat. Jika `data/auth-users.json` sudah menyimpan akun admin, perubahan `ADMIN_PASSWORD` tidak mengganti password akun yang ada. Pada startup pertama tanpa `ADMIN_PASSWORD`, server membuat password acak dan menampilkannya satu kali di terminal. Catat untuk demo kelompok.

> Jangan commit file rahasia atau password nyata ke repository. Nilai pada contoh di atas harus diganti dan hanya untuk lingkungan lokal.

**Database**

Untuk demo saat ini, PostgreSQL tidak perlu dipasang dan tidak perlu mengisi connection string. Skema pada `db/schema.sql` merupakan rancangan database proyek; aplikasi aktif masih menyimpan paket, pesanan, dan keuangan pada `localStorage`, akun pada `data/auth-users.json`, serta sesi dalam memory store Express. Payment intent simulasi juga hanya disimpan selama proses server berjalan.

### 5.5 Menjalankan aplikasi

Jalankan satu perintah berikut dari folder utama:

```bash
npm run dev
```

Script ini menjalankan dua proses sekaligus:

- API autentikasi dan pembayaran simulasi pada `http://127.0.0.1:3001`.
- Frontend Vite yang mem-proxy endpoint `/api` ke API lokal.

Tunggu sampai terminal menampilkan pesan bahwa layanan auth aktif dan alamat Vite. Buka alamat tersebut di browser; alamat awal biasanya:

```text
http://localhost:5173
```

Jika port 5173 sudah digunakan, Vite otomatis mencoba port berikutnya, misalnya `http://localhost:5174`. Gunakan alamat persis yang dicetak terminal. Biarkan terminal tetap berjalan selama aplikasi digunakan.

Untuk menghentikan kedua proses, fokuskan terminal yang menjalankan `npm run dev`, lalu tekan `Ctrl+C`.

### 5.6 Pemeriksaan build

Untuk memeriksa kompilasi dan bundle frontend tanpa menjalankan mode development:

```bash
npm run build
```

Jika perintah selesai tanpa error, build frontend berhasil. Untuk demo interaktif sehari-hari tetap gunakan `npm run dev`, karena perintah itulah yang menjalankan API auth dan simulator pembayaran bersamaan dengan Vite.

### 5.7 Data lokal dan penggunaan kelompok

- Akun yang didaftarkan tersimpan pada file `data/auth-users.json` di laptop tersebut.
- Paket, pesanan, dan transaksi tersimpan pada browser melalui `localStorage`; data tidak otomatis berpindah ke laptop anggota lain.
- Setiap laptop dapat memiliki akun, pesanan, dan data demo yang berbeda. Untuk presentasi bersama, tentukan satu laptop sebagai perangkat demo utama atau siapkan akun/pesanan pada laptop yang akan digunakan.
- Menghapus data browser dapat menghapus data paket, pesanan, dan keuangan lokal. Menghapus `data/auth-users.json` menghapus daftar akun lokal dan akan memicu pembuatan ulang admin pada startup berikutnya.
- Payment intent sandbox hilang saat API dimulai ulang. Buat transaksi demo baru setelah server restart.

---

## 6. Batasan dan Catatan Keamanan

- Aplikasi ini merupakan demo perkuliahan. Simulator pembayaran tidak menerima atau mengirim dana.
- Callback Midtrans/Xendit tersedia sebagai jalur server demo dengan validasi signature/token, tetapi transaksi UI masih dibuat melalui simulator lokal. Aktivasi pembayaran nyata membutuhkan konfigurasi akun provider, kredensial server, URL publik HTTPS, webhook resmi, dan pencocokan nominal/order di database.
- Data paket, pesanan, dan keuangan berada di `localStorage` pada browser/perangkat yang sama. Menghapus data browser atau berpindah perangkat tidak menyinkronkan data.
- Sesi Express demo disimpan di memori dan berakhir saat sesi kedaluwarsa atau server dimulai ulang.
- Data pada `data/auth-users.json` adalah data akun lokal; jangan membagikan file tersebut atau memakai password demo untuk akun lain.
- Metrik dan transaksi awal mencakup data contoh untuk demonstrasi. Ganti dengan data milik proyek sendiri sebelum presentasi atau publikasi.

---

## 7. Pemecahan Masalah

| Kendala | Tindakan |
|---|---|
| Login admin ditolak | Pastikan role **Pemilik EO** dipilih. Gunakan password yang tampil saat admin pertama dibuat; password baru dari environment tidak mengganti akun lama. |
| Halaman meminta login lagi | Sesi berlaku delapan jam dan disimpan server. Login kembali setelah sesi berakhir atau server dimulai ulang. |
| Checkout menampilkan instruksi demo | Ini perilaku normal sandbox lokal. QR dan kode tidak dapat digunakan untuk pembayaran nyata. |
| Pesanan baru tidak terlihat pada akun klien lain | Riwayat klien difilter berdasarkan email akun yang login. Masuk dengan akun pemesan. |
| PDF memuat tampilan website | Pastikan tombol **Simpan PDF** dari halaman Keuangan digunakan, lalu periksa preview cetak. Template laporan mengatur A4 portrait dan hanya menampilkan lembar laporan. |
| Data tidak sama di browser/perangkat lain | Data bisnis demo disimpan di `localStorage`; gunakan browser dan perangkat yang sama. |

---

**Akhir dokumen**