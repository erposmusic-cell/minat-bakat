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
export async function registerSekolah({ namaSekolah, alamat, kode, username, password, namaPanitia, paketId }) {
  const { data: existingKode } = await supabase
    .from("sekolah").select("id").eq("kode", kode).maybeSingle();
  if (existingKode) throw new Error("Kode sekolah sudah digunakan.");

  const { data: existingUser } = await supabase
    .from("panitia").select("id").eq("username", username).maybeSingle();
  if (existingUser) throw new Error("Username sudah digunakan.");

  const { data: sekolah, error: errSekolah } = await supabase
    .from("sekolah")
    .insert({ nama: namaSekolah, kode, alamat, aktif: false, paket_pilihan: paketId || "starter" })
    .select().single();
  if (errSekolah) throw errSekolah;

  const { error: errPanitia } = await supabase
    .from("panitia")
    .insert({ username, password, nama: namaPanitia, school_id: sekolah.id });
  if (errPanitia) throw errPanitia;

  return sekolah;
}

// ══════════════════════════════════════════
// LOGIN PANITIA
// ══════════════════════════════════════════
export async function loginPanitia(username, password) {
  const { data, error } = await supabase
    .from("panitia")
    .select("id, username, nama, school_id, role, email")
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

  // Cek lisensi aktif (lifetime: tgl_expired null, atau belum expired)
  const today = new Date().toISOString().slice(0, 10);
  const { data: lisensiAll } = await supabase
    .from("lisensi")
    .select("id, paket, maks_siswa, maks_kelas, tgl_expired")
    .eq("school_id", data.school_id)
    .order("created_at", { ascending: false });

  const lisensi = (lisensiAll || []).find(l =>
    l.tgl_expired === null || l.tgl_expired >= today
  );

  if (!lisensi) {
    throw new Error("Lisensi sekolah tidak aktif atau sudah expired. Silakan hubungi admin.");
  }

  const sisaHari = lisensi.tgl_expired
    ? Math.ceil((new Date(lisensi.tgl_expired) - new Date()) / (1000 * 60 * 60 * 24))
    : null; // null = lifetime

  return {
    username: data.username, nama: data.nama,
    school_id: data.school_id, namaSekolah: sekolah.nama,
    kodeSekolah: sekolah.kode,
    role: data.role,
    lisensiExpired:  lisensi.tgl_expired,
    lisensiSisaHari: sisaHari,
    lisensiPaket:    lisensi.paket,
    maksSiswa:       lisensi.maks_siswa,
    maksKelas:       lisensi.maks_kelas,
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
export async function createLisensi({ schoolId, lisensiKey, paket, maksSiswa, maksKelas, tglMulai, tglExpired, catatan }) {
  const key = lisensiKey || generateLisensiKey();
  const { data, error } = await supabase
    .from("lisensi")
    .insert({
      school_id:   schoolId,
      lisensi_key: key,
      paket:       paket || "starter",
      maks_siswa:  maksSiswa ?? null,
      maks_kelas:  maksKelas ?? null,
      tgl_mulai:   tglMulai || new Date().toISOString().slice(0, 10),
      tgl_expired: tglExpired || null,
      catatan:     catatan || "",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Update lisensi yang sudah ada */
export async function updateLisensi(id, { paket, maksSiswa, maksKelas, tglExpired, catatan }) {
  const { error } = await supabase
    .from("lisensi")
    .update({
      paket,
      maks_siswa:  maksSiswa ?? null,
      maks_kelas:  maksKelas ?? null,
      tgl_expired: tglExpired || null,
      catatan,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (error) throw error;
}

/** Cek kuota siswa sekolah */
export async function cekKuotaSiswa(schoolId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: lisensiAll } = await supabase
    .from("lisensi").select("maks_siswa, tgl_expired")
    .eq("school_id", schoolId).order("created_at", { ascending: false });
  const lisensi = (lisensiAll || []).find(l => !l.tgl_expired || l.tgl_expired >= today);
  if (!lisensi) throw new Error("Lisensi tidak aktif.");
  if (lisensi.maks_siswa === null) return { maks: null, terpakai: 0, sisa: null }; // unlimited
  const { count } = await supabase.from("siswa").select("id", { count: "exact", head: true }).eq("school_id", schoolId);
  const terpakai = count || 0;
  return { maks: lisensi.maks_siswa, terpakai, sisa: lisensi.maks_siswa - terpakai };
}

/** Cek kuota kelas sekolah */
export async function cekKuotaKelas(schoolId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: lisensiAll } = await supabase
    .from("lisensi").select("maks_kelas, tgl_expired")
    .eq("school_id", schoolId).order("created_at", { ascending: false });
  const lisensi = (lisensiAll || []).find(l => !l.tgl_expired || l.tgl_expired >= today);
  if (!lisensi) throw new Error("Lisensi tidak aktif.");
  if (lisensi.maks_kelas === null) return { maks: null, terpakai: 0, sisa: null }; // unlimited
  const { count } = await supabase.from("kelas").select("id", { count: "exact", head: true }).eq("school_id", schoolId);
  const terpakai = count || 0;
  return { maks: lisensi.maks_kelas, terpakai, sisa: lisensi.maks_kelas - terpakai };
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

  // Cek lisensi aktif (lifetime: tgl_expired null, atau belum expired)
  const today = new Date().toISOString().slice(0, 10);
  const { data: lisensiAll } = await supabase
    .from("lisensi").select("id, tgl_expired")
    .eq("school_id", data.id).order("created_at", { ascending: false });

  const lisensiAktif = (lisensiAll || []).find(l => !l.tgl_expired || l.tgl_expired >= today);
  if (!lisensiAktif) {
    throw new Error("Lisensi sekolah ini sudah tidak aktif. Silakan hubungi panitia sekolah.");
  }

  return data;
}

// ══════════════════════════════════════════
// RESET PASSWORD PANITIA
// ══════════════════════════════════════════

/** Owner: reset password panitia langsung */
export async function ownerResetPassword(schoolId, passwordBaru) {
  const { data, error } = await supabase.rpc("owner_reset_password", {
    p_school_id: schoolId,
    p_password_baru: passwordBaru,
  });
  if (error) throw error;
  return data;
}

/** Panitia: minta reset via email (generate token) */
export async function requestResetPassword(email) {
  const { data, error } = await supabase.rpc("request_reset_password", {
    p_email: email,
  });
  if (error) throw error;
  return data?.[0] || null;
}

/** Panitia: verifikasi token dan ganti password */
export async function verifyResetToken(token, passwordBaru) {
  const { data, error } = await supabase.rpc("verify_reset_token", {
    p_token: token,
    p_password_baru: passwordBaru,
  });
  if (error) throw error;
  return data?.[0] || null;
}

/** Fetch data panitia untuk sekolah tertentu */
export async function fetchPanitiaBySchool(schoolId) {
  const { data, error } = await supabase
    .from("panitia")
    .select("id, username, nama, email, school_id")
    .eq("school_id", schoolId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Update email panitia */
export async function updateEmailPanitia(schoolId, email) {
  const { error } = await supabase
    .from("panitia")
    .update({ email })
    .eq("school_id", schoolId);
  if (error) throw error;
}

// ══════════════════════════════════════════
// MULTI-ADMIN SEKOLAH
// ══════════════════════════════════════════

/** Ambil semua admin sekolah */
export async function getAdminSekolah(schoolId) {
  const { data, error } = await supabase.rpc("get_admin_sekolah", {
    p_school_id: schoolId,
  });
  if (error) throw error;
  return data || [];
}

/** Tambah admin baru (oleh admin_utama) */
export async function tambahAdmin({ schoolId, username, password, nama, email, dibuatOleh }) {
  const { data, error } = await supabase.rpc("tambah_admin", {
    p_school_id:   schoolId,
    p_username:    username,
    p_password:    password,
    p_nama:        nama,
    p_email:       email || "",
    p_dibuat_oleh: dibuatOleh,
  });
  if (error) throw error;
  return data?.[0] || null;
}

/** Hapus admin (hanya admin biasa) */
export async function hapusAdmin(adminId, schoolId) {
  const { data, error } = await supabase.rpc("hapus_admin", {
    p_admin_id:  adminId,
    p_school_id: schoolId,
  });
  if (error) throw error;
  return data;
}

/** Cek kuota admin berdasarkan paket lisensi */
export async function cekKuotaAdmin(schoolId) {
  const { data, error } = await supabase
    .from("panitia")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("role", "admin");
  if (error) throw error;
  return data?.count || 0;
}
