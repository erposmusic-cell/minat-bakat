// src/supabaseClient.js
// ══════════════════════════════════════════════════════
// Inisialisasi Supabase — kredensial dari environment variable
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

// ══════════════════════════════════════════════════════
// MULTI-TENANT: LOGIN PANITIA
// Login sekarang mengembalikan school_id dari tabel panitia
// ══════════════════════════════════════════════════════
export async function loginPanitia(username, password) {
  const { data, error } = await supabase
    .from("panitia")
    .select("id, username, nama, school_id")
    .eq("username", username)
    .eq("password", password)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    username: data.username,
    nama: data.nama,
    school_id: data.school_id, // ← kunci multi-tenant
  };
}

// ══════════════════════════════════════════════════════
// SEKOLAH
// ══════════════════════════════════════════════════════

// Ambil data sekolah berdasarkan school_id
export async function fetchSekolah(schoolId) {
  const { data, error } = await supabase
    .from("sekolah")
    .select("*")
    .eq("id", schoolId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Daftarkan sekolah baru (dipakai oleh admin master)
export async function insertSekolah({ nama, kode, alamat }) {
  const { data, error } = await supabase
    .from("sekolah")
    .insert({ nama, kode, alamat, aktif: true })
    .select()
    .single();
  if (error) throw error;
  return data; // mengembalikan id sekolah baru
}

// Daftarkan panitia baru untuk sekolah tertentu
export async function insertPanitia({ username, password, nama, schoolId }) {
  const { error } = await supabase
    .from("panitia")
    .insert({ username, password, nama, school_id: schoolId });
  if (error) throw error;
}

// ══════════════════════════════════════════════════════
// KELAS — semua query difilter school_id
// ══════════════════════════════════════════════════════
export async function fetchKelas(schoolId) {
  const { data, error } = await supabase
    .from("kelas")
    .select("*")
    .eq("school_id", schoolId)
    .order("nama");
  if (error) throw error;
  return data;
}

export async function upsertKelas(kelasArr, schoolId) {
  const rows = kelasArr.map(k => ({
    id: k.id, nama: k.nama, bidang: k.bidang,
    kapasitas: k.kapasitas, wali: k.wali || "",
    school_id: schoolId,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("kelas").upsert(rows);
  if (error) throw error;
}

export async function deleteKelas(id) {
  const { error } = await supabase.from("kelas").delete().eq("id", id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════
// TARGET PENERIMAAN — difilter school_id
// ══════════════════════════════════════════════════════
export async function fetchTarget(schoolId) {
  const { data, error } = await supabase
    .from("target_penerimaan")
    .select("*")
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { min: 120, max: 175 };
  return { min: data.min, max: data.max };
}

export async function saveTarget(min, max, schoolId) {
  // Cek apakah sudah ada target untuk sekolah ini
  const { data: existing } = await supabase
    .from("target_penerimaan")
    .select("id")
    .eq("school_id", schoolId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("target_penerimaan")
      .update({ min, max, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("target_penerimaan")
      .insert({ min, max, school_id: schoolId, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
}

// ══════════════════════════════════════════════════════
// SISWA — difilter school_id
// ══════════════════════════════════════════════════════
export async function fetchSiswa(schoolId) {
  const { data, error } = await supabase
    .from("siswa")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(dbRowToSiswa);
}

export async function insertSiswa(siswa, schoolId) {
  const row = { ...siswaToDbRow(siswa), school_id: schoolId };
  const { error } = await supabase.from("siswa").insert(row);
  if (error) throw error;
}

export async function updateKelasSiswa(siswaId, kelasId, kelasNama) {
  const { error } = await supabase
    .from("siswa")
    .update({ kelas_id: kelasId, kelas_nama: kelasNama })
    .eq("id", siswaId);
  if (error) throw error;
}

export async function deleteSiswa(id) {
  const { error } = await supabase.from("siswa").delete().eq("id", id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════
// SOAL — difilter school_id (atau soal global jika null)
// ══════════════════════════════════════════════════════
export async function fetchSoal(schoolId) {
  // Ambil soal milik sekolah ini ATAU soal global (school_id = null)
  const { data, error } = await supabase
    .from("soal")
    .select("*")
    .eq("aktif", true)
    .or(`school_id.eq.${schoolId},school_id.is.null`)
    .order("kategori")
    .order("urutan");
  if (error) throw error;
  return data.map(row => ({
    id:    row.id,
    cat:   row.kategori,
    grp:   row.kelompok,
    text:  row.teks,
    aktif: row.aktif,
  }));
}

export async function insertSoal(soal, schoolId) {
  const { error } = await supabase.from("soal").insert({
    kategori:  soal.cat,
    kelompok:  soal.grp,
    teks:      soal.text,
    urutan:    soal.urutan || 0,
    aktif:     true,
    school_id: schoolId,
  });
  if (error) throw error;
}

export async function updateSoal(id, soal) {
  const { error } = await supabase.from("soal").update({
    kategori: soal.cat,
    kelompok: soal.grp,
    teks:     soal.text,
    aktif:    soal.aktif,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteSoal(id) {
  const { error } = await supabase.from("soal").delete().eq("id", id);
  if (error) throw error;
}

// ══════════════════════════════════════════════════════
// KONVERSI BARIS DB ↔ OBJEK APLIKASI
// ══════════════════════════════════════════════════════
function dbRowToSiswa(row) {
  return {
    id:             row.id,
    nama:           row.nama,
    nisn:           row.nisn,
    sekolah:        row.sekolah,
    tgl:            row.tgl_lahir,
    tanggalAsesmen: row.tanggal_asesmen,
    kelasId:        row.kelas_id,
    kelasNama:      row.kelas_nama,
    narasi:         row.narasi,
    scores: {
      logika:   row.skor_logika   || 0,
      bahasa:   row.skor_bahasa   || 0,
      sains:    row.skor_sains    || 0,
      seni:     row.skor_seni     || 0,
      sosial:   row.skor_sosial   || 0,
      olahraga: row.skor_olahraga || 0,
    },
    top: Array.isArray(row.top_bakat) && row.top_bakat.length > 0
      ? row.top_bakat
      : [{ id: "logika", pct: 0, label: "Belum Ada", icon: "❓", color: "#94A3B8" }],
  };
}

function siswaToDbRow(s) {
  return {
    nama:            s.nama,
    nisn:            s.nisn,
    sekolah:         s.sekolah,
    tgl_lahir:       s.tgl || "",
    tanggal_asesmen: s.tanggalAsesmen,
    kelas_id:        s.kelasId  || null,
    kelas_nama:      s.kelasNama || null,
    narasi:          s.narasi   || "",
    skor_logika:     s.scores.logika,
    skor_bahasa:     s.scores.bahasa,
    skor_sains:      s.scores.sains,
    skor_seni:       s.scores.seni,
    skor_sosial:     s.scores.sosial,
    skor_olahraga:   s.scores.olahraga,
    top_bakat:       s.top,
  };
}
