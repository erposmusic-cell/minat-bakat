// src/supabaseClient.js
// ══════════════════════════════════════════════════════
// Inisialisasi Supabase — kredensial dari environment variable
// URL & Key TIDAK pernah ditulis langsung di sini.
// ══════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    "❌ VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan.\n" +
    "Pastikan file .env sudah dibuat berdasarkan .env.example"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Helper: login panitia via RPC ──────────────────────
export async function loginPanitia(username, password) {
  const { data, error } = await supabase
    .rpc("cek_login_panitia", { p_username: username, p_password: password });
  if (error) throw error;
  const row = data?.[0];
  if (!row || !row.berhasil) return null;
  return { username, nama: row.nama_panitia };
}

// ── Helper: ambil semua kelas ──────────────────────────
export async function fetchKelas() {
  const { data, error } = await supabase
    .from("kelas")
    .select("*")
    .order("nama");
  if (error) throw error;
  return data;
}

// ── Helper: upsert kelas ──────────────────────────────
export async function upsertKelas(kelasArr) {
  const rows = kelasArr.map(k => ({
    id: k.id, nama: k.nama, bidang: k.bidang,
    kapasitas: k.kapasitas, wali: k.wali || "",
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("kelas").upsert(rows);
  if (error) throw error;
}

// ── Helper: hapus kelas ───────────────────────────────
export async function deleteKelas(id) {
  const { error } = await supabase.from("kelas").delete().eq("id", id);
  if (error) throw error;
}

// ── Helper: ambil target penerimaan ───────────────────
export async function fetchTarget() {
  const { data, error } = await supabase
    .from("target_penerimaan")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return { min: data.min, max: data.max };
}

// ── Helper: simpan target penerimaan ──────────────────
export async function saveTarget(min, max) {
  const { error } = await supabase
    .from("target_penerimaan")
    .upsert({ id: 1, min, max, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ── Helper: ambil semua siswa ─────────────────────────
export async function fetchSiswa() {
  const { data, error } = await supabase
    .from("siswa")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // Normalisasi ke format yang dipakai aplikasi
  return data.map(dbRowToSiswa);
}

// ── Helper: simpan siswa baru ─────────────────────────
export async function insertSiswa(siswa) {
  const row = siswaToDbRow(siswa);
  const { error } = await supabase.from("siswa").insert(row);
  if (error) throw error;
}

// ── Helper: update kelas siswa ────────────────────────
export async function updateKelasSiswa(siswaId, kelasId, kelasNama) {
  const { error } = await supabase
    .from("siswa")
    .update({ kelas_id: kelasId, kelas_nama: kelasNama })
    .eq("id", siswaId);
  if (error) throw error;
}

// ── Helper: hapus siswa ───────────────────────────────
export async function deleteSiswa(id) {
  const { error } = await supabase.from("siswa").delete().eq("id", id);
  if (error) throw error;
}

// ── Konversi: baris DB → objek aplikasi ──────────────
function dbRowToSiswa(row) {
  return {
    id:              row.id,
    nama:            row.nama,
    nisn:            row.nisn,
    sekolah:         row.sekolah,
    tgl:             row.tgl_lahir,
    tanggalAsesmen:  row.tanggal_asesmen,
    kelasId:         row.kelas_id,
    kelasNama:       row.kelas_nama,
    narasi:          row.narasi,
    scores: {
      logika:    row.skor_logika,
      bahasa:    row.skor_bahasa,
      sains:     row.skor_sains,
      seni:      row.skor_seni,
      sosial:    row.skor_sosial,
      olahraga:  row.skor_olahraga,
    },
    top: row.top_bakat || [],
  };
}

// ── Konversi: objek aplikasi → baris DB ──────────────
function siswaToDbRow(s) {
  return {
    id:               s.id,
    nama:             s.nama,
    nisn:             s.nisn,
    sekolah:          s.sekolah,
    tgl_lahir:        s.tgl || "",
    tanggal_asesmen:  s.tanggalAsesmen,
    kelas_id:         s.kelasId || null,
    kelas_nama:       s.kelasNama || null,
    narasi:           s.narasi || "",
    skor_logika:      s.scores.logika,
    skor_bahasa:      s.scores.bahasa,
    skor_sains:       s.scores.sains,
    skor_seni:        s.scores.seni,
    skor_sosial:      s.scores.sosial,
    skor_olahraga:    s.scores.olahraga,
    top_bakat:        s.top,
  };
}
