# PPDB — Asesmen Bakat & Minat
Sistem penjurusan cerdas berbasis React + Supabase

---

## 🚀 Cara Setup (5 langkah)

### 1. Buat Tabel di Supabase
- Buka **Supabase Dashboard** → **SQL Editor** → **New Query**
- Copy-paste seluruh isi file `supabase_schema.sql`
- Klik **Run**

### 2. Ambil URL & Anon Key
- Di Supabase Dashboard → **Settings** → **API**
- Salin **Project URL** dan **anon public** key

### 3. Buat file `.env`
```bash
cp .env.example .env
```
Lalu isi nilai di `.env`:
```
VITE_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Install & Jalankan
```bash
npm install
npm run dev
```

### 5. Ganti Password Admin
- Di Supabase Dashboard → **Table Editor** → tabel `panitia`
- Edit baris dan ganti kolom `password` dengan password baru Anda

---

## 🌐 Deploy ke Vercel / Netlify

### Vercel
```bash
npm i -g vercel
vercel
```
Saat ditanya environment variables, masukkan:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Atau tambahkan di **Vercel Dashboard** → **Project Settings** → **Environment Variables**

### Netlify
Tambahkan di **Site Settings** → **Environment variables**

---

## 🗂️ Struktur File

```
ppdb-supabase/
├── src/
│   ├── App.jsx              # Komponen utama React
│   ├── supabaseClient.js    # Semua fungsi database
│   └── main.jsx             # Entry point
├── supabase_schema.sql      # Script SQL untuk Supabase
├── .env.example             # Template environment variable
├── .env                     # ← BUAT SENDIRI, jangan di-commit
├── .gitignore               # Melindungi .env dari Git
├── package.json
├── vite.config.js
└── index.html
```

---

## 🔐 Keamanan

- **Anon Key** aman dipakai di frontend karena dilindungi Row Level Security (RLS)
- **Service Role Key** JANGAN pernah dipakai di frontend
- File `.env` sudah dimasukkan ke `.gitignore` — tidak akan ter-upload ke GitHub
- Password panitia disimpan di tabel `panitia` di Supabase — segera ganti dari default

---

## ✏️ Ganti Kredensial Admin Default

Setelah deploy, segera ubah username & password di tabel `panitia`:

```sql
UPDATE panitia
SET username = 'username_baru', password = 'password_baru'
WHERE id = 1;
```

Jalankan query ini di **Supabase SQL Editor**.
