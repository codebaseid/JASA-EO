# RuangRaya Event Studio

Platform demo untuk layanan event organizer: katalog paket, pemesanan klien, simulasi pembayaran, invoice cetak, pengelolaan pesanan, katalog admin, serta laporan arus kas.

Panduan pengguna lengkap tersedia di [MANUAL_BOOK.md](MANUAL_BOOK.md).

## Menjalankan lokal

1. Pasang Node.js 20 LTS atau lebih baru dari [nodejs.org](https://nodejs.org/).
2. Buka terminal di folder proyek ini.
3. Pasang dependensi dan jalankan aplikasi:

```bash
npm install
npm run dev
```

4. `npm run dev` menjalankan Vite dan API autentikasi. Buka `http://localhost:5173`.
5. Untuk memeriksa build produksi, jalankan `npm run build`, lalu `npm run preview`.

Saat startup pertama, terminal menampilkan email `admin@ruangraya.id` dan kata sandi acak demo satu kali. Akun tersimpan di `data/auth-users.json` dengan kata sandi yang sudah di-hash. Untuk menetapkan kata sandi sebelum membuat akun admin, gunakan PowerShell:

```powershell
$env:ADMIN_PASSWORD = 'KataSandiDemo-YangKuat'
npm run dev
```

Jika akun admin sudah pernah dibuat, mengubah `ADMIN_PASSWORD` tidak mengganti kata sandi tersimpan. Untuk reset data auth lokal, hentikan server lalu hapus `data/auth-users.json` sebelum menjalankan ulang.

## Mencoba alur

- Pengunjung hanya melihat Landing Page. Tombol **Masuk** membuka pilihan akun klien atau Pemilik EO.
- Klien baru harus memilih **Buat akun klien**, mendaftarkan nama/email/kata sandi minimal 8 karakter, lalu berpindah ke tab **Masuk**. Setelah berhasil, akun diarahkan ke `/client/dashboard`.
- Pemilik EO masuk melalui tab **Pemilik EO** menggunakan `admin@ruangraya.id` dan kata sandi demo dari terminal. Login berhasil mengarahkan ke `/admin`.
- Jika pengunjung membuka `/admin` atau `/client/dashboard` tanpa sesi, aplikasi kembali ke Landing Page dan meminta login role yang sesuai. Sesi berlaku 8 jam.
- Dari dashboard klien, pilih paket, lengkapi tanggal, venue, tamu, dan add-on. Checkout menyediakan QRIS, 9 Virtual Account (BNI, Mandiri, Danamon, Permata, CIMB Niaga, BSI, Maybank, BRI, Sinarmas), dan 5 gerai (Alfamart, Alfamidi, Indomaret, Lawson, Dan+Dan). Status intent dibaca dari API setiap 1,5 detik; simulator mengirim notifikasi sukses setelah 4 detik. Tombol uji gagal tersedia pada layar instruksi transaksi.
- QRIS dan nomor VA/gerai pada mode lokal adalah instruksi sandbox, bukan permintaan pembayaran aktif. QR sandbox tidak dapat dipakai untuk memindahkan dana.
- Admin dapat menghapus pesanan melalui tombol **Hapus** dan dialog konfirmasi. Pemasukan yang memiliki referensi ke pesanan tersebut ikut dihapus, lalu metrik keuangan dihitung ulang.
- Buka pesanan untuk melihat tahapan acara dan mencetak invoice. Pilih **Cetak / simpan PDF**, lalu pilih printer atau **Save as PDF** pada dialog browser.
- Area admin mencakup ringkasan, verifikasi pesanan, CRUD katalog beserta unggah foto, pencatatan biaya manual, filter laporan tanggal/kategori, cetak PDF, dan ekspor CSV yang dapat dibuka di Excel.
- Endpoint auth tersedia di `/api/auth/register`, `/api/auth/login`, `/api/auth/session`, dan `/api/auth/logout`. Middleware juga membatasi namespace `/api/admin` dan `/api/client` berdasarkan role.
- Intent pembayaran tersedia pada `/api/client/payments` dan status dapat dibaca melalui `/api/client/payments/:paymentId`. Callback provider menerima `/api/payments/webhooks/midtrans` (signature server key) atau `/api/payments/webhooks/xendit` (token callback).

## Struktur

```text
src/
  App.tsx          Alur klien/admin, katalog, booking, invoice, dan laporan
  data.ts          Tipe data, dataset demo, dan daftar metode pembayaran
  main.tsx         Entry point React
  styles.css       Tailwind dan sistem visual responsif/print
  components/
    Navbar.tsx     Header publik/dashboard
server/
  index.mjs        API auth, payment intent simulator, callback gateway, dan middleware role
db/
  schema.sql       Skema PostgreSQL dan trigger pemasukan otomatis
```

## Batas demo dan produksi

Autentikasi memakai server lokal, hash scrypt, dan cookie session HttpOnly; daftar akun disimpan pada file lokal yang diabaikan Git. Session store bawaan Express bersifat in-memory dan ditujukan untuk demo.

Paket, pesanan, dan catatan keuangan masih disimpan di `localStorage` browser; status intent pembayaran berjalan di server proses demo dan hilang saat server dimulai ulang. Rute dashboard terlindungi di UI dan contoh middleware server tersedia, tetapi data bisnis belum dipindahkan ke API berotorisasi. Sebelum produksi, validasi nominal/order dari database, lindungi semua endpoint data, gunakan session store persisten, validasi CSRF/origin sesuai deployment, dan jangan gunakan QR/kode sandbox untuk menerima pembayaran nyata.

Untuk produksi, sambungkan UI ke API berautentikasi, simpan password dengan hash Argon2id/bcrypt, validasi role di server, simpan foto di object storage, dan pasang payment gateway sandbox/produksi di backend. Skema PostgreSQL tersedia di `db/schema.sql`; trigger membuat catatan pemasukan satu kali saat transaksi menjadi paid.

Foto portofolio pada demo adalah visual ilustrasi dari Unsplash, bukan dokumentasi acara RuangRaya. Ganti dengan foto acara milik EO yang sudah mendapat izin sebelum website dipublikasikan.

## Contoh inti untuk integrasi produksi

### Membuat transaksi Midtrans sandbox

Simpan `MIDTRANS_SERVER_KEY` hanya di server. Contoh ini menggunakan Node.js 20 `fetch`; panggil dari route backend setelah pesanan dan nominal divalidasi di database.

```ts
type SnapRequest = {
  orderId: string
  amount: number
  customer: { name: string; email: string }
}

export async function createSandboxPayment(input: SnapRequest) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY belum diatur')

  const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.amount },
      customer_details: { first_name: input.customer.name, email: input.customer.email },
      enabled_payments: ['qris', 'bank_transfer', 'gopay', 'shopeepay'],
    }),
  })

  if (!response.ok) throw new Error(`Midtrans menolak transaksi (${response.status})`)
  return await response.json() as { token: string; redirect_url: string }
}
```

Jangan menandai pembayaran lunas hanya dari redirect browser. Verifikasi notifikasi Midtrans di backend menggunakan signature, cocokkan `order_id` dan `gross_amount` dengan database, lalu ubah status transaksi menjadi `paid`; trigger SQL akan mencatat pemasukan.

### Invoice dan PDF siap cetak

Invoice pada `InvoiceModal` merender identitas klien, referensi, rincian paket/add-on, status, dan total. Tombol cetaknya menggunakan dialog printer browser, yang dapat menyimpan halaman sebagai PDF:

```tsx
<button type="button" onClick={() => window.print()}>
  Cetak / simpan PDF
</button>
```

CSS `@media print` di `src/styles.css` menghilangkan navigasi/modal lain dan menata invoice ringkas untuk kertas thermal 80 mm. Browser juga dapat memilih kertas A4 dari dialog cetak.

### Filter laporan dan ekspor Excel-kompatibel

UI memfilter berdasarkan tanggal mulai/akhir dan kategori. Untuk data PostgreSQL, gunakan parameter query (bukan menggabungkan input ke SQL):

```sql
SELECT occurred_at, description, category, entry_type, amount, transaction_id
FROM financial_records
WHERE occurred_at >= $1::date
  AND occurred_at <= $2::date
  AND ($3::text IS NULL OR category = $3)
ORDER BY occurred_at DESC, created_at DESC;
```

Ekspor CSV pada aplikasi menambahkan BOM UTF-8, mengapit nilai dengan tanda kutip, dan memisahkan pemasukan/pengeluaran ke kolom akuntansi agar dapat dibuka langsung di Excel. Untuk PDF laporan, gunakan tombol **Simpan PDF** dan dialog cetak browser dengan tata letak laporan khusus.