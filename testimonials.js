# Aforte Visuals — Backend API

Backend untuk website Aforte Visuals: sistem booking, portfolio, price list, testimonials, dan dashboard admin, dibangun dengan **Node.js + Express** dan **Supabase** (PostgreSQL + Storage + Auth-ready).

## Kenapa Supabase?
- Database Postgres terkelola, gratis untuk skala kecil-menengah.
- Storage bawaan untuk menyimpan foto portofolio (menggantikan folder `/uploads` lokal).
- Bisa berkembang ke Supabase Auth kalau nanti ingin multi-admin.

## 1. Setup Supabase
1. Buat project baru di https://supabase.com.
2. Buka **SQL Editor**, jalankan seluruh isi `sql/schema.sql`. Ini akan membuat semua tabel, kebijakan keamanan (RLS), dan data awal (kategori portofolio + 3 paket harga).
3. Buka **Storage**, buat bucket baru bernama `aforte-media`, set ke **public** (agar foto bisa ditampilkan langsung di website).
4. Buka **Project Settings → API**, salin `Project URL` dan `service_role key` (bukan `anon key`) ke file `.env`.

## 2. Setup project lokal
```bash
cp .env.example .env
npm install
node scripts/hash-password.js "password-admin-anda"
# salin output ADMIN_PASSWORD_HASH ke .env
npm run dev
```
Server berjalan di `http://localhost:4000`. Cek `GET /health` untuk memastikan berjalan normal.

## 3. Struktur endpoint API

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/auth/login` | publik | Login admin, mengembalikan JWT token |
| GET | `/api/portfolio` | publik | Daftar foto portofolio (`?category=wedding`) |
| POST | `/api/portfolio` | admin | Upload foto baru (multipart/form-data) |
| DELETE | `/api/portfolio/:id` | admin | Hapus foto |
| GET | `/api/services` | publik | Daftar layanan |
| POST/PUT/DELETE | `/api/services` | admin | Kelola layanan |
| GET | `/api/pricing` | publik | Daftar paket harga |
| PUT | `/api/pricing/:id` | admin | Ubah harga/fitur paket |
| GET | `/api/bookings/availability?month=2026-07` | publik | Tanggal yang sudah terisi (untuk kalender) |
| POST | `/api/bookings` | publik | Kirim formulir booking pelanggan |
| GET | `/api/bookings` | admin | Lihat semua booking |
| PATCH | `/api/bookings/:id/status` | admin | Ubah status booking |
| GET | `/api/testimonials` | publik | Daftar testimoni |
| POST/PUT/DELETE | `/api/testimonials` | admin | Kelola testimoni |
| GET | `/api/settings` | publik | Info kontak, tema aktif, dsb. |
| PUT | `/api/settings` | admin | Ubah nomor WA, tema, alamat, dll. |

Semua endpoint admin memerlukan header:
```
Authorization: Bearer <token dari /api/auth/login>
```

## 4. Keamanan yang sudah diterapkan
- Password admin di-hash dengan bcrypt, tidak pernah disimpan sebagai teks biasa.
- Login dibatasi (rate limit) untuk mencegah brute-force.
- Token JWT berlaku 8 jam.
- `service_role key` Supabase hanya dipakai di backend, tidak pernah dikirim ke browser.
- Row Level Security aktif di semua tabel — akses publik hanya bisa membaca data yang memang ditujukan publik.
- Tanggal booking punya *unique constraint* di database, jadi dua pelanggan tidak akan bisa merebut tanggal yang sama meski submit bersamaan.
- Validasi input dengan `zod` di endpoint booking.

## 5. Menghubungkan ke frontend (aforte-visuals.html)
Frontend statis yang sudah dibuat sebelumnya saat ini memakai data contoh langsung di JavaScript. Untuk menyambungkannya ke backend ini:
1. Ganti array data statis (`portfolioItems`, `services`, dst.) dengan `fetch('https://api-domain-anda.com/api/portfolio')` dkk.
2. Ganti submit form booking dari simulasi menjadi:
   ```js
   fetch('https://api-domain-anda.com/api/bookings', {
     method: 'POST',
     headers: {'Content-Type':'application/json'},
     body: JSON.stringify({ full_name, whatsapp, email, service_type, package_name, shoot_date, shoot_time, location, guest_count, notes })
   })
   ```
3. Untuk kalender, panggil `/api/bookings/availability?month=YYYY-MM` saat halaman dimuat, lalu tandai tanggal yang dikembalikan sebagai "booked".
4. Untuk halaman admin, buat form login yang memanggil `/api/auth/login`, simpan token di memori (jangan di localStorage bila ingin lebih aman), lalu sertakan di setiap request admin.

Saya bisa bantu tulis ulang bagian JavaScript di file HTML tersebut agar langsung terhubung ke API ini — tinggal beri tahu domain/URL backend-nya setelah Anda deploy.

## 6. Deploy
Beberapa opsi hosting yang cocok untuk backend Node.js ini (gratis/murah untuk mulai):
- **Railway** atau **Render**: hubungkan repo GitHub, set environment variables dari `.env`, deploy otomatis.
- **Fly.io**: cocok jika ingin kontrol lebih detail.

Domain frontend (tempat file HTML di-hosting, misalnya Vercel/Netlify) perlu didaftarkan di `FRONTEND_ORIGIN` agar CORS mengizinkan permintaan dari domain tersebut.

## 7. Yang belum termasuk (silakan minta jika perlu)
- Halaman UI dashboard admin (saat ini hanya API-nya; frontend admin perlu dibangun terpisah sebagai halaman `/admin` yang login lalu memanggil endpoint di atas).
- Notifikasi email/WhatsApp otomatis ke admin saat ada booking baru (bisa ditambahkan dengan layanan seperti Resend atau WhatsApp Business API).
- Multi-admin dengan role berbeda.
