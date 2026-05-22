// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error("❌ VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY tidak ditemukan.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ══════════════════════════════════════════
// OWNER
// ══════════════════════════════════════════
export async function loginOwner(username, password) {
  const { data, error } = await supabase
    .from("owner")
    .select("id, username, nama")
    .eq("username", username)
    .eq("password", password)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { username: data.username, nama: data.nama };
}

export async function fetchAllSekolah() {
  const { data, error } = await supabase
    .from("sekolah")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function toggleAktifSekolah(id, aktif) {
  const { error } = await supabase.from("sekolah").update({ aktif }).eq("id", id);
  if (error) throw error;
}

export async function deleteSekolah(id) {
  const { error } = await supabase.from("sekolah").delete().eq("id", id);
  if (error) throw error;
}

// ══════════════════════════════════════════
// REGISTRASI SEKOLAH BARU
// ══════════════════════════════════════════
export async function registerSekolah({ namaSekolah, alamat, kode, username, password, namaPanitia }) {
  const { data: existingKode } = await supabase
    .from("sekolah").select("id").eq("kode", kode).maybeSingle();
  if (existingKode) throw new Error("Kode sekolah sudah digunakan.");

  const { data: existingUser } = await supabase
    .from("panitia").select("id").eq("username", username).maybeSingle();
  if (existingUser) throw new Error("Username sudah digunakan.");

  const { data: sekolah, error: errSekolah } = await supabase
    .from("sekolah")
    .insert({ nama: namaSekolah, kode, alamat, aktif: false })
    .select().single();
  if (errSekolah) throw errSekolah;

  const { error: errPanitia } = await supabase
    .from("panitia")
    .insert({ username, password, nama: namaPanitia, school_id: sekolah.id });
  if (errPanitia) throw errPanitia;

  // Auto-generate lisensi trial 30 hari
  const tglMulai   = new Date().toISOString().slice(0, 10);
  const tglExpired = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const chars      = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg        = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const lisensiKey = `LIS-${seg()}-${seg()}-${seg()}`;
  await supabase.from("lisensi").insert({
    school_id: sekolah.id, lisensi_key: lisensiKey,
    tgl_mulai: tglMulai, tgl_expired: tglExpired,
    catatan: "Trial otomatis 30 hari",
  });

  return sekolah;
}

// ══════════════════════════════════════════
// LOGIN PANITIA
// ══════════════════════════════════════════
export async function loginPanitia(username, password) {
  const { data, error } = await supabase
    .from("panitia")
    .select("id, username, nama, school_id")
    .eq("username", username)
    .eq("password", password)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: sekolah } = await supabase
    .from("sekolah").select("aktif, nama, kode").eq("id", data.school_id).maybeSingle();

  if (!sekolah?.aktif) {
    throw new Error("Akun sekolah belum diaktifkan. Silakan hubungi admin.");
  }

  // Cek lisensi aktif
  const today = new Date().toISOString().slice(0, 10);
  const { data: lisensi } = await supabase
    .from("lisensi")
    .select("id, tgl_expired")
    .eq("school_id", data.school_id)
    .gte("tgl_expired", today)
    .order("tgl_expired", { ascending: false })
    .limit(1);

  if (!lisensi || lisensi.length === 0) {
    throw new Error("Lisensi sekolah tidak aktif atau sudah expired. Silakan hubungi admin.");
  }

  const sisaHari = Math.ceil(
    (new Date(lisensi[0].tgl_expired) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return {
    username: data.username, nama: data.nama,
    school_id: data.school_id, namaSekolah: sekolah.nama,
    kodeSekolah: sekolah.kode,
    lisensiExpired: lisensi[0].tgl_expired,
    lisensiSisaHari: sisaHari,
  };
}

// ══════════════════════════════════════════
// LISENSI
// ══════════════════════════════════════════

/** Generate lisensi key format: LIS-XXXX-XXXX-XXXX */
export function generateLisensiKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `LIS-${seg()}-${seg()}-${seg()}`;
}

/** Ambil lisensi berdasarkan school_id */
export async function fetchLisensiBySchool(schoolId) {
  const { data, error } = await supabase
    .from("lisensi")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Ambil semua lisensi (untuk Owner Dashboard) */
export async function fetchAllLisensi() {
  const { data, error } = await supabase
    .from("lisensi")
    .select("*, sekolah(nama, kode)")
    .order("tgl_expired", { ascending: true });
  if (error) throw error;
  return data;
}

/** Buat lisensi baru untuk sekolah */
export async function createLisensi({ schoolId, lisensiKey, tglMulai, tglExpired, catatan }) {
  const key = lisensiKey || generateLisensiKey();
  const { data, error } = await supabase
    .from("lisensi")
    .insert({
      school_id: schoolId,
      lisensi_key: key,
      tgl_mulai: tglMulai || new Date().toISOString().slice(0, 10),
      tgl_expired: tglExpired,
      catatan: catatan || "",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Update lisensi yang sudah ada */
export async function updateLisensi(id, { tglExpired, catatan }) {
  const { error } = await supabase
    .from("lisensi")
    .update({ tgl_expired: tglExpired, catatan, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Hapus lisensi */
export async function deleteLisensi(id) {
  const { error } = await supabase.from("lisensi").delete().eq("id", id);
  if (error) throw error;
}

/** Cek apakah sekolah punya lisensi aktif (belum expired) */
export async function cekLisensiAktif(schoolId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("lisensi")
    .select("id, lisensi_key, tgl_expired")
    .eq("school_id", schoolId)
    .gte("tgl_expired", today)
    .order("tgl_expired", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}


export async function fetchKelas(schoolId) {
  const { data, error } = await supabase
    .from("kelas").select("*").eq("school_id", schoolId).order("nama");
  if (error) throw error;
  return data;
}

export async function upsertKelas(kelasArr, schoolId) {
  const rows = kelasArr.map(k => ({
    id: k.id, nama: k.nama, bidang: k.bidang,
    kapasitas: k.kapasitas, wali: k.wali || "",
    school_id: schoolId, updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("kelas").upsert(rows);
  if (error) throw error;
}

export async function deleteKelas(id) {
  const { error } = await supabase.from("kelas").delete().eq("id", id);
  if (error) throw error;
}

// ══════════════════════════════════════════
// TARGET PENERIMAAN
// ══════════════════════════════════════════
export async function fetchTarget(schoolId) {
  const { data, error } = await supabase
    .from("target_penerimaan").select("*").eq("school_id", schoolId).maybeSingle();
  if (error) throw error;
  if (!data) return { min: 120, max: 175 };
  return { min: data.min, max: data.max };
}

export async function saveTarget(min, max, schoolId) {
  const { data: existing } = await supabase
    .from("target_penerimaan").select("id").eq("school_id", schoolId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("target_penerimaan")
      .update({ min, max, updated_at: new Date().toISOString() }).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("target_penerimaan")
      .insert({ min, max, school_id: schoolId, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
}

// ══════════════════════════════════════════
// SISWA
// ══════════════════════════════════════════
export async function fetchSiswa(schoolId) {
  const { data, error } = await supabase
    .from("siswa").select("*").eq("school_id", schoolId)
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
  const { error } = await supabase.from("siswa")
    .update({ kelas_id: kelasId, kelas_nama: kelasNama }).eq("id", siswaId);
  if (error) throw error;
}

export async function deleteSiswa(id) {
  const { error } = await supabase.from("siswa").delete().eq("id", id);
  if (error) throw error;
}

// ══════════════════════════════════════════
// SOAL
// ══════════════════════════════════════════
export async function fetchSoal(schoolId) {
  const { data, error } = await supabase
    .from("soal").select("*").eq("aktif", true)
    .or(`school_id.eq.${schoolId},school_id.is.null`)
    .order("kategori").order("urutan");
  if (error) throw error;
  return data.map(row => ({
    id: row.id, cat: row.kategori, grp: row.kelompok, text: row.teks, aktif: row.aktif,
  }));
}

export async function insertSoal(soal, schoolId) {
  const { error } = await supabase.from("soal").insert({
    kategori: soal.cat, kelompok: soal.grp, teks: soal.text,
    urutan: soal.urutan || 0, aktif: true, school_id: schoolId,
  });
  if (error) throw error;
}

export async function updateSoal(id, soal) {
  const { error } = await supabase.from("soal").update({
    kategori: soal.cat, kelompok: soal.grp, teks: soal.text, aktif: soal.aktif,
  }).eq("id", id);
  if (error) throw error;
}

export async function deleteSoal(id) {
  const { error } = await supabase.from("soal").delete().eq("id", id);
  if (error) throw error;
}

// ══════════════════════════════════════════
// KONVERSI
// ══════════════════════════════════════════
function dbRowToSiswa(row) {
  return {
    id: row.id, nama: row.nama, nisn: row.nisn, sekolah: row.sekolah,
    tgl: row.tgl_lahir, tanggalAsesmen: row.tanggal_asesmen,
    kelasId: row.kelas_id, kelasNama: row.kelas_nama, narasi: row.narasi,
    scores: {
      logika: row.skor_logika||0, bahasa: row.skor_bahasa||0, sains: row.skor_sains||0,
      seni: row.skor_seni||0, sosial: row.skor_sosial||0, olahraga: row.skor_olahraga||0,
    },
    top: Array.isArray(row.top_bakat) && row.top_bakat.length > 0
      ? row.top_bakat
      : [{ id:"logika", pct:0, label:"Belum Ada", icon:"❓", color:"#94A3B8" }],
  };
}

function siswaToDbRow(s) {
  return {
    nama: s.nama, nisn: s.nisn, sekolah: s.sekolah, tgl_lahir: s.tgl||"",
    tanggal_asesmen: s.tanggalAsesmen, kelas_id: s.kelasId||null,
    kelas_nama: s.kelasNama||null, narasi: s.narasi||"",
    skor_logika: s.scores.logika, skor_bahasa: s.scores.bahasa,
    skor_sains: s.scores.sains, skor_seni: s.scores.seni,
    skor_sosial: s.scores.sosial, skor_olahraga: s.scores.olahraga,
    top_bakat: s.top,
  };
}

// ══════════════════════════════════════════
// VALIDASI KODE SEKOLAH (untuk siswa)
// ══════════════════════════════════════════
export async function fetchSekolahByKode(kode) {
  const { data, error } = await supabase
    .from("sekolah")
    .select("id, nama, kode, aktif")
    .eq("kode", kode.toUpperCase().trim())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Cek lisensi aktif
  const today = new Date().toISOString().slice(0, 10);
  const { data: lisensi } = await supabase
    .from("lisensi")
    .select("id, tgl_expired")
    .eq("school_id", data.id)
    .gte("tgl_expired", today)
    .limit(1);

  if (!lisensi || lisensi.length === 0) {
    throw new Error("Lisensi sekolah ini sudah tidak aktif. Silakan hubungi panitia sekolah.");
  }

  return data;
}
