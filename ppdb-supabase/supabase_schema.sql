-- ══════════════════════════════════════════════════════
-- PPDB ASESMEN BAKAT & MINAT — SUPABASE SCHEMA
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════

-- ── 1. Tabel: target_penerimaan ──────────────────────
CREATE TABLE IF NOT EXISTS target_penerimaan (
  id      INTEGER PRIMARY KEY DEFAULT 1,          -- selalu 1 row
  min     INTEGER NOT NULL DEFAULT 120,
  max     INTEGER NOT NULL DEFAULT 175,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default
INSERT INTO target_penerimaan (id, min, max)
VALUES (1, 120, 175)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Tabel: kelas ──────────────────────────────────
CREATE TABLE IF NOT EXISTS kelas (
  id         TEXT PRIMARY KEY,                    -- 'k1', 'k2', dst
  nama       TEXT NOT NULL,                       -- 'X-A'
  bidang     TEXT NOT NULL,                       -- 'sains','logika', dst
  kapasitas  INTEGER NOT NULL DEFAULT 30,
  wali       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed kelas default
INSERT INTO kelas (id, nama, bidang, kapasitas, wali) VALUES
  ('k1', 'X-A', 'sains',   35, ''),
  ('k2', 'X-B', 'sosial',  35, ''),
  ('k3', 'X-C', 'logika',  32, ''),
  ('k4', 'X-D', 'bahasa',  30, '')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Tabel: siswa ──────────────────────────────────
CREATE TABLE IF NOT EXISTS siswa (
  id               BIGINT PRIMARY KEY,            -- Date.now()
  nama             TEXT NOT NULL,
  nisn             TEXT NOT NULL,
  sekolah          TEXT NOT NULL,
  tgl_lahir        TEXT DEFAULT '',
  tanggal_asesmen  TEXT NOT NULL,
  kelas_id         TEXT REFERENCES kelas(id) ON DELETE SET NULL,
  kelas_nama       TEXT,
  -- Skor per bidang (0-100)
  skor_logika      INTEGER DEFAULT 0,
  skor_bahasa      INTEGER DEFAULT 0,
  skor_sains       INTEGER DEFAULT 0,
  skor_seni        INTEGER DEFAULT 0,
  skor_sosial      INTEGER DEFAULT 0,
  skor_olahraga    INTEGER DEFAULT 0,
  -- Top 3 bakat (disimpan sebagai JSON)
  top_bakat        JSONB,
  -- Narasi analisis
  narasi           TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_siswa_nisn    ON siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_siswa_kelas   ON siswa(kelas_id);
CREATE INDEX IF NOT EXISTS idx_siswa_created ON siswa(created_at DESC);

-- ── 4. Tabel: panitia (login) ────────────────────────
-- Gunakan Supabase Auth untuk produksi.
-- Tabel ini sebagai alternatif sederhana berbasis username/password hash.
CREATE TABLE IF NOT EXISTS panitia (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,              -- simpan sebagai bcrypt hash di produksi
  nama       TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed akun panitia default (GANTI PASSWORD SEGERA SETELAH DEPLOY)
-- Password: ppdb2025 — hash ini hanya placeholder, implementasi hash ada di aplikasi
INSERT INTO panitia (username, password, nama)
VALUES ('panitia_ppdb', 'ppdb2025', 'Admin PPDB')
ON CONFLICT (username) DO NOTHING;

-- ── 5. Row Level Security (RLS) ──────────────────────
-- Aktifkan RLS agar anon key tidak bisa akses sembarangan

ALTER TABLE target_penerimaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE siswa              ENABLE ROW LEVEL SECURITY;
ALTER TABLE panitia            ENABLE ROW LEVEL SECURITY;

-- Policy: semua operasi hanya dari service_role (server-side)
-- Untuk anon key, hanya boleh SELECT kelas (keperluan asesmen siswa)

CREATE POLICY "anon_read_kelas" ON kelas
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_siswa" ON siswa
  FOR INSERT TO anon WITH CHECK (true);

-- Panitia (authenticated via login custom) bisa semua
-- Catatan: karena login custom (bukan Supabase Auth),
-- semua request dari server menggunakan service_role key.
-- Anon key hanya untuk:
--   - SELECT kelas (tampil di asesmen)
--   - INSERT siswa (simpan hasil asesmen)

CREATE POLICY "service_all_target" ON target_penerimaan
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_all_kelas" ON kelas
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_all_siswa" ON siswa
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_all_panitia" ON panitia
  FOR ALL TO service_role USING (true);

-- ── 6. Function: cek login panitia ──────────────────
-- Dipanggil via RPC dari aplikasi (aman, tidak expose tabel panitia ke anon)
CREATE OR REPLACE FUNCTION cek_login_panitia(p_username TEXT, p_password TEXT)
RETURNS TABLE(berhasil BOOLEAN, nama_panitia TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (password = p_password) AS berhasil,
    nama
  FROM panitia
  WHERE username = p_username
  LIMIT 1;
END;
$$;

-- Izinkan anon memanggil fungsi ini
GRANT EXECUTE ON FUNCTION cek_login_panitia TO anon;

-- ══════════════════════════════════════════════════════
-- SELESAI. Semua tabel siap digunakan.
-- Selanjutnya isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env
-- ══════════════════════════════════════════════════════
