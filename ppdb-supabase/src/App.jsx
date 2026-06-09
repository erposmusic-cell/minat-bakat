import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ──────────────────────────────────────────
// RESPONSIVE HOOK
// ──────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

// ──────────────────────────────────────────
// URL ROUTING (tanpa library tambahan)
// ──────────────────────────────────────────
// Peta phase+tab → path URL
const PHASE_TO_PATH = {
  "landing":          "/",
  "kode":             "/kode",
  "form":             "/asesmen/form",
  "asesmen":          "/asesmen/soal",
  "result":           "/asesmen/hasil",
  "dashboard:dashboard": "/dashboard",
  "dashboard:kelas":     "/dashboard/kelas",
  "dashboard:data":      "/dashboard/data",
  "dashboard:soal":      "/dashboard/soal",
  "dashboard:admin":     "/dashboard/admin",
  "dashboard:logo":      "/dashboard/identitas",
};

const PATH_TO_STATE = {
  "/":                  { phase:"landing",    tab:"dashboard" },
  "/kode":              { phase:"kode",        tab:"dashboard" },
  "/asesmen/form":      { phase:"form",        tab:"dashboard" },
  "/asesmen/soal":      { phase:"asesmen",     tab:"dashboard" },
  "/asesmen/hasil":     { phase:"result",      tab:"dashboard" },
  "/dashboard":         { phase:"dashboard",   tab:"dashboard" },
  "/dashboard/kelas":   { phase:"dashboard",   tab:"kelas" },
  "/dashboard/data":    { phase:"dashboard",   tab:"data" },
  "/dashboard/soal":    { phase:"dashboard",   tab:"soal" },
  "/dashboard/admin":   { phase:"dashboard",   tab:"admin" },
  "/dashboard/identitas": { phase:"dashboard", tab:"logo" },
};

function getPath(phase, tab) {
  return PHASE_TO_PATH[phase==="dashboard" ? `dashboard:${tab}` : phase] || "/";
}

function navigate(phase, tab="dashboard") {
  const path = getPath(phase, tab);
  if (window.location.pathname !== path) {
    window.history.pushState({ phase, tab }, "", path);
  }
}
import * as XLSX from "xlsx";
import {
  supabase,
  loginPanitia,
  fetchKelas,
  upsertKelas,
  deleteKelas,
  fetchTarget,
  saveTarget,
  fetchSiswa,
  insertSiswa,
  deleteSiswa,
  updateKelasSiswa,
  fetchSoal,
  insertSoal,
  updateSoal,
  deleteSoal,
  fetchSekolahByKode,
  getAdminSekolah, tambahAdmin, hapusAdmin, cekKuotaAdmin,
  getLogoSekolah, uploadLogoSekolah,
  getTahunAjaran, saveTahunAjaran,
} from "./supabaseClient";
import LoginPage from "./LoginPage";
import OwnerDashboard from "./OwnerDashboard";

// ══════════════════════════════════════════
// KONSTANTA
// ══════════════════════════════════════════
const DEFAULT_TARGET = { min: 120, max: 175 };
const DEFAULT_KELAS = [
  { id:"k1", nama:"X-A", bidang:"sains",    kapasitas:35, wali:"", jenjang:"sma_x" },
  { id:"k2", nama:"X-B", bidang:"sosial",   kapasitas:35, wali:"", jenjang:"sma_x" },
  { id:"k3", nama:"X-C", bidang:"logika",   kapasitas:32, wali:"", jenjang:"sma_x" },
  { id:"k4", nama:"X-D", bidang:"bahasa",   kapasitas:30, wali:"", jenjang:"sma_x" },
];

const CAT = [
  { id:"logika",   label:"Logika & Analitik",     icon:"🧮", color:"#3B82F6" },
  { id:"bahasa",   label:"Bahasa & Sastra",        icon:"📚", color:"#10B981" },
  { id:"sains",    label:"Sains & Teknologi",      icon:"🔬", color:"#8B5CF6" },
  { id:"seni",     label:"Seni & Kreativitas",     icon:"🎨", color:"#F59E0B" },
  { id:"sosial",   label:"Sosial & Kepemimpinan",  icon:"🤝", color:"#EF4444" },
  { id:"olahraga", label:"Olahraga & Kinestetik",  icon:"⚽", color:"#06B6D4" },
];

// ══════════════════════════════════════════
// JENJANG
// ══════════════════════════════════════════
const JENJANG_LIST = [
  { id: "smp",    label: "SMP / MTs",           icon: "🏫", subtitle: "Penjurusan kelas VII" },
  { id: "sma_x",  label: "SMA / SMK — Kelas X", icon: "🎓", subtitle: "PPDB siswa baru" },
  { id: "sma_xi", label: "SMA — Penjurusan XI",  icon: "📚", subtitle: "Pemilihan jurusan kelas XI" },
];

const JURUSAN_PER_JENJANG = {
  smp: {
    logika:   ["Olimpiade Matematika","Robotika & Coding","KIR Sains","Komputer","Jurnalistik Ilmiah","Debat"],
    bahasa:   ["Jurnalistik","Sastra & Puisi","Debat Bahasa","Pidato","Drama","English Club"],
    sains:    ["KIR Sains","Olimpiade IPA","Biologi Terapan","Fisika Eksperimen","Kimia Dasar","Lingkungan Hidup"],
    seni:     ["Seni Rupa","Musik","Tari","Drama & Teater","Fotografi","Desain Kreatif"],
    sosial:   ["OSIS","Pramuka","PMR","Paskibra","Relawan Sosial","Kepemimpinan"],
    olahraga: ["Sepak Bola","Basket","Voli","Berenang","Bela Diri","Atletik"],
  },
  sma_x: {
    logika:   ["Teknik Informatika","Matematika","Teknik Sipil","Akuntansi","Statistika","Sistem Informasi"],
    bahasa:   ["Sastra Indonesia","Sastra Inggris","Jurnalistik","Hukum","Hub. Internasional","Pend. Bahasa"],
    sains:    ["Kedokteran","Farmasi","Biologi","Fisika","Teknik Kimia","Kesehatan Masyarakat"],
    seni:     ["Desain Grafis","Seni Rupa","Arsitektur","Film & TV","Musik","Animasi"],
    sosial:   ["Psikologi","Ilmu Sosial","Manajemen","Ilmu Politik","Komunikasi","Sosiologi"],
    olahraga: ["Ilmu Keolahragaan","Pend. Jasmani","Fisioterapi","Gizi & Kesehatan","Kepelatihan","Kes. Olahraga"],
  },
  sma_xi: {
    logika:   ["IPA — Matematika & Sains","IPA — Teknik & Rekayasa","IPA — Kedokteran & Kesehatan","IPS — Ekonomi & Akuntansi","Bahasa — Linguistik","Vokasi — TI & Komputer"],
    bahasa:   ["Bahasa & Sastra","IPS — Komunikasi","IPS — Hukum & Politik","IPA — Sains Komunikasi","Vokasi — Perhotelan","IPS — Sosiologi"],
    sains:    ["IPA — Kedokteran","IPA — Farmasi & Biologi","IPA — Fisika & Teknik","IPA — Kimia Terapan","IPA — Lingkungan","Vokasi — Kesehatan"],
    seni:     ["Bahasa — Seni & Budaya","IPA — Arsitektur","Vokasi — Desain","Vokasi — Multimedia","Bahasa — Sastra","IPS — Komunikasi Visual"],
    sosial:   ["IPS — Manajemen","IPS — Psikologi Sosial","IPS — Ilmu Politik","IPS — Sosiologi","IPS — Hukum","Vokasi — Administrasi"],
    olahraga: ["IPA — Kedokteran Olahraga","Vokasi — Kepelatihan","IPA — Fisioterapi","IPS — Manajemen Olahraga","Vokasi — Pend. Jasmani","IPA — Gizi & Kesehatan"],
  },
};


const JURUSAN = JURUSAN_PER_JENJANG["sma_x"]; // default fallback
function getJurusan(jenjang) {
  return JURUSAN_PER_JENJANG[jenjang] || JURUSAN_PER_JENJANG["sma_x"];
}

// ══════════════════════════════════════════
// GAYA BELAJAR
// ══════════════════════════════════════════
const GAYA_BELAJAR_CAT = [
  { id: "visual",     label: "Visual",      icon: "👁️",  color: "#3B82F6", desc: "Belajar lewat gambar, grafik, warna & diagram" },
  { id: "auditori",   label: "Auditori",    icon: "👂",  color: "#10B981", desc: "Belajar lewat mendengar, diskusi & ceramah" },
  { id: "kinestetik", label: "Kinestetik",  icon: "🤲",  color: "#F59E0B", desc: "Belajar lewat praktik langsung & gerakan" },
  { id: "baca_tulis", label: "Baca-Tulis",  icon: "📖",  color: "#8B5CF6", desc: "Belajar lewat membaca & menulis catatan" },
];

const GAYA_BELAJAR_QUESTIONS = [
  // Visual
  { id:"gb1", cat:"visual",     text:"Saya lebih mudah memahami materi jika ada diagram, grafik, atau gambar pendukung." },
  { id:"gb2", cat:"visual",     text:"Saat belajar, saya sering membuat mind map atau coretan visual untuk membantu memahami." },
  { id:"gb3", cat:"visual",     text:"Saya mengingat wajah orang lebih mudah dibanding namanya." },
  { id:"gb4", cat:"visual",     text:"Saya lebih suka membaca buku bergambar atau infografis dibanding teks panjang." },
  { id:"gb5", cat:"visual",     text:"Ketika menjelaskan sesuatu, saya cenderung menggambar atau menunjuk sesuatu secara visual." },
  // Auditori
  { id:"gb6",  cat:"auditori",  text:"Saya lebih mudah mengingat informasi yang saya dengar dibanding yang saya baca." },
  { id:"gb7",  cat:"auditori",  text:"Belajar sambil mendengarkan musik atau suara tertentu membuat saya lebih fokus." },
  { id:"gb8",  cat:"auditori",  text:"Saya suka berdiskusi atau menjelaskan materi kepada orang lain untuk memahaminya." },
  { id:"gb9",  cat:"auditori",  text:"Saya mudah terganggu oleh kebisingan saat belajar." },
  { id:"gb10", cat:"auditori",  text:"Saya sering mengulang-ulang informasi dalam hati atau dengan suara keras untuk mengingat." },
  // Kinestetik
  { id:"gb11", cat:"kinestetik", text:"Saya lebih mudah memahami sesuatu jika langsung mempraktikkannya." },
  { id:"gb12", cat:"kinestetik", text:"Saya sulit duduk diam terlalu lama saat belajar dan butuh bergerak." },
  { id:"gb13", cat:"kinestetik", text:"Saya lebih suka eksperimen atau proyek nyata dibanding membaca teori." },
  { id:"gb14", cat:"kinestetik", text:"Belajar sambil berjalan-jalan atau bergerak membuat saya lebih mudah mengingat." },
  { id:"gb15", cat:"kinestetik", text:"Saya menggunakan gerakan tangan atau ekspresi tubuh saat menjelaskan sesuatu." },
  // Baca-Tulis
  { id:"gb16", cat:"baca_tulis", text:"Saya lebih suka membaca buku teks lengkap dibanding mendengarkan penjelasan lisan." },
  { id:"gb17", cat:"baca_tulis", text:"Membuat catatan detail saat belajar sangat membantu saya memahami materi." },
  { id:"gb18", cat:"baca_tulis", text:"Saya sering menulis ulang catatan untuk membantu mengingat pelajaran." },
  { id:"gb19", cat:"baca_tulis", text:"Saya lebih nyaman belajar dari buku atau artikel dibanding video atau praktik." },
  { id:"gb20", cat:"baca_tulis", text:"Saya suka membuat daftar, rangkuman, atau poin-poin penting saat belajar." },
];

function calcGayaBelajar(answers) {
  const scores = {};
  GAYA_BELAJAR_CAT.forEach(c => { scores[c.id] = 0; });
  GAYA_BELAJAR_QUESTIONS.forEach(q => {
    if (answers[q.id]) scores[q.cat] += answers[q.id];
  });
  // Normalisasi ke 0-100 (5 soal x max 5 = 25)
  GAYA_BELAJAR_CAT.forEach(c => {
    scores[c.id] = Math.round((scores[c.id] / 25) * 100);
  });
  return scores;
}

function getTopGayaBelajar(scores) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0];
}

const GAYA_BELAJAR_TIPS = {
  visual:     ["Gunakan mind map & warna berbeda untuk setiap topik","Buat diagram atau gambar saat mencatat","Pilih tempat belajar yang rapi dan tidak berantakan","Tonton video pembelajaran & infografis","Tandai teks penting dengan stabilo warna-warni"],
  auditori:   ["Rekam penjelasan guru & putar ulang saat belajar","Diskusikan materi dengan teman sebagai latihan","Baca materi dengan suara keras","Buat lagu atau ritme untuk mengingat rumus","Gunakan podcast atau audio book sebagai referensi"],
  kinestetik: ["Buat model atau alat peraga saat belajar","Ambil jeda aktif setiap 25 menit (jalan, stretching)","Ikut praktikum, percobaan, atau proyek nyata","Tulis sambil membaca untuk menyerap materi","Belajar dalam kelompok dengan role-play atau simulasi"],
  baca_tulis: ["Buat rangkuman & catatan detail setelah belajar","Tulis ulang catatan dengan kata-kata sendiri","Baca berbagai sumber referensi tambahan","Buat daftar poin penting sebelum ujian","Manfaatkan perpustakaan & buku teks sebagai sumber utama"],
};

const QUESTIONS = [
  {id:1,  cat:"logika",   grp:"Penalaran",   text:"Ketika menghadapi soal matematika yang sulit, saya tidak mudah menyerah dan terus mencari cara lain untuk menyelesaikannya."},
  {id:2,  cat:"logika",   grp:"Pola",        text:"Saya dengan cepat mengenali pola tersembunyi dalam deretan angka, huruf, atau bentuk tanpa harus berpikir terlalu lama."},
  {id:3,  cat:"logika",   grp:"Sistematis",  text:"Sebelum mengambil keputusan penting, saya selalu membuat analisis pro-kontra atau daftar pertimbangan secara tertulis."},
  {id:4,  cat:"logika",   grp:"Teknologi",   text:"Saya tertarik memahami bagaimana algoritma atau program komputer bekerja di balik layar, bukan hanya cara menggunakannya."},
  {id:5,  cat:"logika",   grp:"Abstrak",     text:"Saya menikmati soal-soal logika abstrak seperti silogisme, diagram Venn, atau teka-teki deduksi."},
  {id:6,  cat:"logika",   grp:"Kritis",      text:"Saya terbiasa mempertanyakan asumsi yang ada dan mencari bukti sebelum mempercayai suatu informasi."},
  {id:7,  cat:"logika",   grp:"Strategi",    text:"Dalam permainan seperti catur, puzzle, atau game strategi, saya mampu merencanakan beberapa langkah ke depan."},
  {id:8,  cat:"logika",   grp:"Statistik",   text:"Saya merasa nyaman bekerja dengan data, grafik, atau tabel dan dapat membaca informasi di dalamnya dengan mudah."},
  {id:9,  cat:"logika",   grp:"Investigasi", text:"Saat menemukan kesalahan dalam perhitungan atau sistem, saya merasa tertantang untuk menelusuri dan memperbaiki akar masalahnya."},
  {id:10, cat:"logika",   grp:"Coding",      text:"Saya tertarik atau pernah mencoba membuat program, skrip sederhana, atau otomatisasi menggunakan komputer."},
  {id:11, cat:"bahasa",   grp:"Membaca",     text:"Saya lebih suka menghabiskan waktu luang dengan membaca buku, artikel, atau esai dibanding aktivitas lainnya."},
  {id:12, cat:"bahasa",   grp:"Menulis",     text:"Saya senang menulis cerita, puisi, jurnal harian, atau esai sebagai cara mengekspresikan pikiran dan perasaan."},
  {id:13, cat:"bahasa",   grp:"Bhs Asing",   text:"Saya merasa mempelajari kosakata dan tata bahasa baru dalam bahasa asing adalah hal yang menyenangkan, bukan beban."},
  {id:14, cat:"bahasa",   grp:"Retorika",    text:"Saya mampu menyusun argumen yang runtut dan meyakinkan, baik secara lisan maupun tulisan, untuk mempertahankan pendapat."},
  {id:15, cat:"bahasa",   grp:"Sastra",      text:"Saya tertarik menganalisis makna tersembunyi, simbolisme, dan pesan moral dalam karya sastra, film, atau lirik lagu."},
  {id:16, cat:"bahasa",   grp:"Komunikasi",  text:"Orang-orang sering memuji kemampuan saya dalam menjelaskan hal-hal rumit dengan bahasa yang mudah dipahami."},
  {id:17, cat:"bahasa",   grp:"Jurnalistik", text:"Saya tertarik pada dunia jurnalistik, penulisan berita, atau investigasi untuk mengungkap fakta dan menyampaikannya ke publik."},
  {id:18, cat:"bahasa",   grp:"Kosakata",    text:"Saya secara aktif mencari dan mempelajari kata-kata baru, termasuk etimologi atau asal-usul kata."},
  {id:19, cat:"bahasa",   grp:"Pidato",      text:"Saya merasa nyaman berbicara di depan umum, mendongeng, atau mempresentasikan ide kepada banyak orang."},
  {id:20, cat:"bahasa",   grp:"Editorial",   text:"Saya peka terhadap kesalahan ejaan, tanda baca, atau susunan kalimat yang kurang tepat saat membaca tulisan orang lain."},
  {id:21, cat:"sains",    grp:"Eksperimen",  text:"Saya lebih suka membuktikan sendiri suatu konsep ilmiah melalui percobaan daripada sekadar membaca teorinya."},
  {id:22, cat:"sains",    grp:"Alam",        text:"Saya penasaran dengan fenomena alam seperti gerhana, gempa bumi, atau reaksi kimia dan ingin memahami penjelasan ilmiahnya."},
  {id:23, cat:"sains",    grp:"Biologi",     text:"Saya tertarik pada cara kerja tubuh manusia, organisme hidup, ekosistem, atau rekayasa genetika."},
  {id:24, cat:"sains",    grp:"Fisika",      text:"Konsep-konsep fisika seperti gravitasi, gelombang, energi, atau relativitas terasa menarik dan ingin saya dalami lebih jauh."},
  {id:25, cat:"sains",    grp:"Kimia",       text:"Saya senang mengamati reaksi kimia, memahami struktur molekul, atau menemukan aplikasi kimia dalam kehidupan sehari-hari."},
  {id:26, cat:"sains",    grp:"Teknologi",   text:"Saya aktif mengikuti perkembangan teknologi terbaru seperti AI, robotika, bioteknologi, atau energi terbarukan."},
  {id:27, cat:"sains",    grp:"Metodologi",  text:"Saya memahami dan menghargai pentingnya metode ilmiah: hipotesis, variabel, kontrol, dan interpretasi data."},
  {id:28, cat:"sains",    grp:"Lingkungan",  text:"Saya peduli pada isu lingkungan dan tertarik mencari solusi ilmiah untuk masalah seperti perubahan iklim atau pencemaran."},
  {id:29, cat:"sains",    grp:"Medis",       text:"Saya tertarik pada ilmu kedokteran, farmasi, atau kesehatan dan ingin berkontribusi pada peningkatan kualitas hidup manusia."},
  {id:30, cat:"sains",    grp:"Riset",       text:"Saya membayangkan diri bekerja di laboratorium, melakukan riset jangka panjang, dan mempublikasikan temuan ilmiah."},
  {id:31, cat:"seni",     grp:"Visual",      text:"Saya dapat menggambarkan bayangan visual yang detail di kepala saya dan kemudian menuangkannya dalam bentuk gambar atau desain."},
  {id:32, cat:"seni",     grp:"Musik",       text:"Saya mudah mengingat melodi, ritme, atau harmoni lagu, dan sering kali musik memengaruhi suasana hati saya secara kuat."},
  {id:33, cat:"seni",     grp:"Kerajinan",   text:"Saya menikmati proses membuat sesuatu dengan tangan, seperti origami, batik, fotografi, atau kerajinan lainnya."},
  {id:34, cat:"seni",     grp:"Estetika",    text:"Saya sangat memperhatikan estetika dan harmoni visual, seperti komposisi warna, proporsi, dan tata letak dalam desain."},
  {id:35, cat:"seni",     grp:"Pertunjukan", text:"Saya tertarik atau pernah terlibat dalam teater, tari, atau pertunjukan seni dan menikmati ekspresi diri di atas panggung."},
  {id:36, cat:"seni",     grp:"Digital",     text:"Saya tertarik membuat konten digital seperti ilustrasi, animasi, video kreatif, atau desain grafis menggunakan perangkat lunak."},
  {id:37, cat:"seni",     grp:"Arsitektur",  text:"Saya suka memperhatikan desain bangunan, ruang interior, atau tata kota dan sering memikirkan bagaimana ruang dapat dibuat lebih indah."},
  {id:38, cat:"seni",     grp:"Imajinasi",   text:"Saya memiliki imajinasi yang kaya dan sering menciptakan dunia, karakter, atau cerita baru di dalam pikiran saya."},
  {id:39, cat:"seni",     grp:"Apresiasi",   text:"Saya secara aktif mengunjungi pameran seni, konser, pertunjukan tari, atau bioskop untuk mengapresiasi karya orang lain."},
  {id:40, cat:"seni",     grp:"Inovasi",     text:"Ketika mengerjakan tugas, saya selalu mencari cara yang unik dan berbeda dari orang lain daripada mengikuti pola yang sudah ada."},
  {id:41, cat:"sosial",   grp:"Empati",      text:"Saya mudah merasakan dan memahami perasaan orang lain, bahkan tanpa mereka harus mengungkapkannya secara langsung."},
  {id:42, cat:"sosial",   grp:"Pimpinan",    text:"Ketika ada tugas kelompok, saya secara alami mengambil peran mengorganisasi anggota, membagi tugas, dan memastikan tujuan tercapai."},
  {id:43, cat:"sosial",   grp:"Advokasi",    text:"Saya peduli pada ketidakadilan di sekitar saya dan terdorong untuk menyuarakan atau memperjuangkan hak kelompok yang lemah."},
  {id:44, cat:"sosial",   grp:"Jaringan",    text:"Saya mudah menjalin pertemanan baru dan menjaga hubungan jangka panjang dengan banyak orang dari berbagai latar belakang."},
  {id:45, cat:"sosial",   grp:"Konseling",   text:"Teman-teman sering datang kepada saya untuk berbagi masalah dan mencari saran, karena mereka merasa nyaman berbicara dengan saya."},
  {id:46, cat:"sosial",   grp:"Negosiasi",   text:"Saya mampu meyakinkan orang lain, bernegosiasi, dan mencapai kesepakatan yang menguntungkan semua pihak."},
  {id:47, cat:"sosial",   grp:"Organisasi",  text:"Saya aktif dalam organisasi, OSIS, atau kegiatan kemasyarakatan dan merasa puas ketika dapat memberikan dampak nyata bagi lingkungan."},
  {id:48, cat:"sosial",   grp:"Keberagaman", text:"Saya menghargai perbedaan budaya, pendapat, dan latar belakang orang lain, dan melihatnya sebagai kekuatan bukan hambatan."},
  {id:49, cat:"sosial",   grp:"Pelayanan",   text:"Saya mendapat kepuasan yang besar ketika dapat membantu orang lain, mengajar, atau memberikan dukungan tanpa mengharapkan imbalan."},
  {id:50, cat:"sosial",   grp:"Komunikasi",  text:"Saya pandai membaca situasi sosial dan menyesuaikan gaya komunikasi saya agar pesan yang disampaikan diterima dengan baik."},
  {id:51, cat:"olahraga", grp:"Aktivitas",   text:"Saya merasa gelisah atau tidak nyaman jika harus duduk diam terlalu lama dan selalu butuh aktivitas fisik setiap harinya."},
  {id:52, cat:"olahraga", grp:"Motorik",     text:"Saya mudah dan cepat mempelajari gerakan fisik baru, seperti teknik olahraga, koreografi tari, atau keterampilan bela diri."},
  {id:53, cat:"olahraga", grp:"Kompetisi",   text:"Saya menikmati persaingan dalam olahraga dan termotivasi untuk menampilkan performa terbaik di bawah tekanan kompetisi."},
  {id:54, cat:"olahraga", grp:"Koordinasi",  text:"Saya memiliki keseimbangan dan koordinasi tubuh yang baik, sehingga mudah menguasai aktivitas yang membutuhkan presisi gerak."},
  {id:55, cat:"olahraga", grp:"Kebugaran",   text:"Saya secara rutin berolahraga dan memiliki komitmen menjaga pola makan serta kebugaran fisik sebagai bagian dari gaya hidup."},
  {id:56, cat:"olahraga", grp:"Tim",         text:"Saya menikmati olahraga tim seperti sepak bola, basket, atau voli karena aspek kerja sama dan strategi bersama."},
  {id:57, cat:"olahraga", grp:"Kinestetik",  text:"Saya lebih mudah memahami dan mengingat sesuatu ketika melakukannya secara langsung (learning by doing) dibanding membaca atau mendengarkan."},
  {id:58, cat:"olahraga", grp:"Kesehatan",   text:"Saya tertarik mempelajari ilmu tentang tubuh manusia dari sisi kebugaran, nutrisi, cedera olahraga, dan rehabilitasi fisik."},
  {id:59, cat:"olahraga", grp:"Outdoor",     text:"Saya lebih suka kegiatan di luar ruangan seperti mendaki, berenang, atau bersepeda dibanding aktivitas dalam ruangan."},
  {id:60, cat:"olahraga", grp:"Kepelatihan", text:"Saya tertarik melatih, membimbing, atau memotivasi orang lain untuk mencapai performa fisik terbaik mereka."},
];

const SCALE = [
  {val:1,label:"Sangat Tidak Setuju"},
  {val:2,label:"Tidak Setuju"},
  {val:3,label:"Netral"},
  {val:4,label:"Setuju"},
  {val:5,label:"Sangat Setuju"},
];

// ══════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════
function calcScores(ans) {
  const scores = {}; const counts = {};
  CAT.forEach(c => { scores[c.id]=0; counts[c.id]=0; });
  QUESTIONS.forEach(q => { counts[q.cat]++; if(ans[q.id]) scores[q.cat]+=ans[q.id]; });
  CAT.forEach(c => { scores[c.id]=Math.round((scores[c.id]/(5*counts[c.id]))*100); });
  return scores;
}

function getTop(scores) {
  return Object.entries(scores)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3)
    .map(([id,pct])=>({id,pct,...CAT.find(c=>c.id===id)}));
}


// Kata kunci mapel per bidang bakat untuk pencocokan
const MAPEL_KEYWORDS = {
  logika:   ["matematika","informatika","komputer","fisika","kimia","statistika","akuntansi","ekonomi","matematika lanjut"],
  bahasa:   ["bahasa","indonesia","inggris","bahasa inggris lanjutan","jerman","bahasa jerman","jepang","arab","sastra","jurnalistik","komunikasi"],
  sains:    ["fisika","biologi","kimia","ipa","sains","kesehatan","lingkungan","geografi"],
  seni:     ["seni","musik","tari","desain","kriya","gambar","teater","budaya"],
  sosial:   ["sosiologi","sejarah","ips","pkn","geografi","ekonomi","sosial","politik","antropologi"],
  olahraga: ["olahraga","pjok","jasmani","kesehatan","atletik","penjas"],
};

// Hitung skor kesesuaian bakat siswa (top 3) dengan mapel pilihan kelas (0-100)
// Perbaikan: normalisasi berbasis bobot bakat (bukan jumlah mapel),
// sehingga kelas dengan banyak mapel tidak dirugikan dibanding kelas sedikit mapel.
function hitungKesesuaianMapel(topBakat, mapelKelas) {
  if (!mapelKelas || mapelKelas.length === 0) return null;
  let totalSkor = 0;
  topBakat.forEach((t, i) => {
    const bobot = i === 0 ? 3 : i === 1 ? 2 : 1; // bakat #1 bobot 3, #2 bobot 2, #3 bobot 1
    const keywords = MAPEL_KEYWORDS[t.id] || [];
    // Cukup satu mapel yang cocok sudah cukup untuk bakat ini (hindari double-count)
    const adaMatch = mapelKelas.some(mp =>
      keywords.some(kw => mp.toLowerCase().includes(kw))
    );
    if (adaMatch) totalSkor += bobot * 20;
  });
  // maxMungkin = (3+2+1) x 20 = 120, tetap konstan tidak terpengaruh jumlah mapel
  const maxMungkin = 6 * 20;
  return Math.min(100, Math.round((totalSkor / maxMungkin) * 100));
}

// autoAssign untuk sekolah umum (tanpa penjurusan IPA/IPS).
// Penentu utama = kesesuaian mapel pilihan kelas dengan bakat siswa.
//
// Sistem penempatan ADIL — 3 lapis:
//   Lapis 1: kelas terbaik masih ada kursi              → masuk langsung
//   Lapis 2: kelas terbaik penuh, kesesuaian ≥ 70%     → overflow sementara + flag peringatan
//   Lapis 3: kesesuaian < 70% atau semua opsi penuh    → kelas terbaik berikutnya yang masih kosong
//
// Return: { kelasId, overflow, mapelSkor }
// overflow = true  → panitia perlu meninjau (kelas melebihi kapasitas karena siswa sangat cocok)
// overflow = false → penempatan normal
const OVERFLOW_THRESHOLD = 70; // % — ambang kesesuaian mapel untuk boleh overflow

function autoAssign(top, daftar, kelas, jenjangSiswa) {
  const top0 = Array.isArray(top) ? top[0] : top;
  const topArr = Array.isArray(top) ? top : [top0];

  // Filter kelas sesuai jenjang siswa
  const kelasFiltred = jenjangSiswa
    ? kelas.filter(k => !k.jenjang || k.jenjang === jenjangSiswa)
    : kelas;
  const kelasCandidates = kelasFiltred.length > 0 ? kelasFiltred : kelas;

  // Hitung skor semua kelas (termasuk yang sudah penuh)
  const withScore = kelasCandidates
    .map(k => {
      const terisi = daftar.filter(s => s.kelasId === k.id).length;
      const mapelSkor    = hitungKesesuaianMapel(topArr, k.mapel || []) ?? 0;
      const padatPenalty = Math.round(terisi / (k.kapasitas || 1) * 20);
      const totalSkor    = mapelSkor - padatPenalty;
      const penuh        = terisi >= (k.kapasitas || 0);
      return { ...k, terisi, totalSkor, mapelSkor, penuh };
    })
    .sort((a, b) => b.totalSkor - a.totalSkor);

  if (withScore.length === 0) return { kelasId: null, overflow: false, mapelSkor: 0 };

  const terbaik = withScore[0];

  // Lapis 1: kelas terbaik masih ada kursi → masuk langsung
  if (!terbaik.penuh) {
    return { kelasId: terbaik.id, overflow: false, mapelSkor: terbaik.mapelSkor };
  }

  // Lapis 2: kelas terbaik penuh tapi kesesuaian sangat tinggi → overflow sementara
  if (terbaik.mapelSkor >= OVERFLOW_THRESHOLD) {
    return { kelasId: terbaik.id, overflow: true, mapelSkor: terbaik.mapelSkor };
  }

  // Lapis 3: cari kelas terbaik berikutnya yang masih ada kursi
  const alternatif = withScore.find(k => !k.penuh);
  if (alternatif) {
    return { kelasId: alternatif.id, overflow: false, mapelSkor: alternatif.mapelSkor };
  }

  // Semua kelas penuh — overflow ke kelas terbaik (skor tertinggi)
  return { kelasId: terbaik.id, overflow: true, mapelSkor: terbaik.mapelSkor };
}

// ══════════════════════════════════════════
// BULK ASSIGN — ranking semua siswa sekaligus
// ══════════════════════════════════════════
// Dipanggil admin setelah semua siswa selesai asesmen.
// Proses: urutkan siswa per jenjang berdasarkan skor kesesuaian mapel (tertinggi duluan),
// lalu tempatkan satu per satu ke kelas terbaik yang masih ada kursi.
// Return: array { siswaId, kelasId, kelasNama } untuk semua siswa yang berhasil ditempatkan.
function bulkAssign(daftar, kelas) {
  // Pisahkan per jenjang
  const jenjangList = [...new Set(daftar.map(s => s.jenjang || "sma_x"))];
  const hasil = [];

  jenjangList.forEach(jenjang => {
    const siswaDijenjang = daftar.filter(s => (s.jenjang || "sma_x") === jenjang);
    const kelasDijenjang = kelas.filter(k => !k.jenjang || k.jenjang === jenjang);
    if (kelasDijenjang.length === 0) return;

    // Hitung skor kesesuaian tiap siswa terhadap tiap kelas
    const siswaScored = siswaDijenjang.map(s => {
      const topArr = Array.isArray(s.top) ? s.top : [s.top];
      const skorPerKelas = kelasDijenjang.map(k => ({
        kelasId: k.id,
        kelasNama: k.nama,
        kapasitas: k.kapasitas || 0,
        skor: hitungKesesuaianMapel(topArr, k.mapel || []) ?? 0,
      }));
      // Urutkan kelas terbaik untuk siswa ini
      skorPerKelas.sort((a, b) => b.skor - a.skor);
      return { ...s, skorPerKelas };
    });

    // Ranking siswa berdasarkan skor tertinggi ke kelas #1 pilihan mereka
    // Primary  : skor kesesuaian mapel (bakat vs mapel kelas terbaik)
    // Tiebreaker: skor bakat murni siswa (top[0].pct) — siswa dengan nilai asesmen lebih tinggi diprioritaskan
    siswaScored.sort((a, b) => {
      const skorA = a.skorPerKelas[0]?.skor ?? 0;
      const skorB = b.skorPerKelas[0]?.skor ?? 0;
      if (skorB !== skorA) return skorB - skorA;
      // Tiebreaker: skor bakat murni dari asesmen
      return (b.top?.[0]?.pct ?? 0) - (a.top?.[0]?.pct ?? 0);
    });

    // Simulasi kursi tersedia (track terisi secara lokal)
    const terisiMap = {};
    kelasDijenjang.forEach(k => { terisiMap[k.id] = 0; });

    // Siswa yang sudah punya kelas (manual/sebelumnya) — hitung dulu
    daftar.forEach(s => {
      if (s.kelasId && terisiMap[s.kelasId] !== undefined) terisiMap[s.kelasId]++;
    });

    // Reset — bulk assign hanya untuk siswa jenjang ini, mulai fresh
    kelasDijenjang.forEach(k => { terisiMap[k.id] = 0; });

    // Tempatkan siswa satu per satu dari ranking tertinggi
    siswaScored.forEach(s => {
      // Cari kelas terbaik yang masih ada kursi
      const pilihan = s.skorPerKelas.find(kx => terisiMap[kx.kelasId] < kx.kapasitas);
      if (pilihan) {
        terisiMap[pilihan.kelasId]++;
        hasil.push({ siswaId: s.id, kelasId: pilihan.kelasId, kelasNama: pilihan.kelasNama });
      } else {
        // Semua kelas penuh — masuk kelas dengan skor tertinggi (overflow)
        const fallback = s.skorPerKelas[0];
        if (fallback) {
          hasil.push({ siswaId: s.id, kelasId: fallback.kelasId, kelasNama: fallback.kelasNama });
        }
      }
    });
  });

  return hasil;
}

// ══════════════════════════════════════════
// GENERATOR NARASI
// ══════════════════════════════════════════
const NARASI_DB = {
  p1: {
    logika: {
      tinggi: [
        "memiliki kecerdasan analitik yang sangat menonjol, ditandai oleh kemampuan berpikir sistematis dan terstruktur yang berada di atas rata-rata.",
        "menunjukkan kapasitas intelektual yang kuat dalam bidang penalaran logis, dengan kecenderungan alami untuk memecah masalah kompleks menjadi bagian-bagian yang lebih terkelola.",
        "diidentifikasi sebagai individu dengan orientasi berpikir yang sangat kritis dan analitis, mampu memproses informasi abstrak dengan tingkat kedalaman yang tinggi.",
      ],
      sedang: [
        "menampilkan kemampuan berpikir logis yang cukup solid, meskipun masih memiliki ruang berkembang untuk mengasah ketajaman analitiknya lebih jauh.",
        "memiliki potensi dalam bidang logika dan analitik yang perlu terus dikembangkan melalui latihan dan paparan terhadap tantangan intelektual yang lebih beragam.",
      ],
    },
    bahasa: {
      tinggi: [
        "memiliki kecerdasan linguistik yang sangat dominan, tercermin dari kemampuan verbal dan sensitivitasnya terhadap nuansa bahasa yang jauh melampaui teman seusianya.",
        "menunjukkan bakat alami dalam dunia literasi dan komunikasi, dengan kapasitas memproses, menyusun, dan mengekspresikan gagasan melalui bahasa secara efektif dan berkesan.",
        "diidentifikasi sebagai individu dengan orientasi verbal yang kuat, memiliki kepekaan tinggi terhadap makna, struktur, dan keindahan bahasa dalam berbagai bentuknya.",
      ],
      sedang: [
        "memiliki kemampuan bahasa yang cukup baik dengan potensi yang dapat dikembangkan lebih lanjut melalui kebiasaan membaca dan menulis secara konsisten.",
        "menunjukkan minat yang nyata dalam bidang bahasa dan sastra, dengan fondasi yang memadai untuk berkembang lebih jauh jika mendapat stimulasi yang tepat.",
      ],
    },
    sains: {
      tinggi: [
        "memiliki kecerdasan naturalis-saintifik yang sangat kuat, ditandai oleh rasa ingin tahu yang mendalam terhadap fenomena alam dan cara kerja dunia di sekitarnya.",
        "menunjukkan orientasi ilmiah yang dominan, dengan kecenderungan untuk selalu mencari penjelasan empiris dan berbasis bukti atas setiap gejala yang diamatinya.",
        "diidentifikasi sebagai individu dengan jiwa peneliti yang tinggi, memiliki kesabaran dan ketelitian yang dibutuhkan untuk menjalani proses ilmiah secara sistematis.",
      ],
      sedang: [
        "memiliki ketertarikan yang cukup dalam pada bidang sains dengan fondasi yang dapat dikembangkan melalui eksplorasi dan pengalaman langsung di laboratorium.",
        "menunjukkan potensi ilmiah yang perlu diasah lebih lanjut, terutama melalui keterlibatan aktif dalam kegiatan eksperimen dan diskusi ilmiah.",
      ],
    },
    seni: {
      tinggi: [
        "memiliki kecerdasan kinestetik-visual yang sangat menonjol, dengan kemampuan persepsi estetika dan ekspresi kreatif yang berada pada tingkat yang luar biasa.",
        "menunjukkan bakat seni yang autentik dan mendalam, tercermin dari kepekaan tinggi terhadap keindahan, harmoni, dan orisinalitas dalam setiap karya yang dihasilkan.",
        "diidentifikasi sebagai individu dengan imajinasi yang kaya dan kemampuan mentransformasi ide abstrak menjadi karya nyata yang bermakna dan berkesan bagi orang lain.",
      ],
      sedang: [
        "memiliki minat seni yang genuine dengan bakat kreatif yang masih dalam tahap berkembang dan sangat berpotensi untuk diasah melalui praktik yang konsisten.",
        "menunjukkan kepekaan estetika yang cukup baik, dengan potensi kreatif yang dapat berkembang pesat jika mendapat bimbingan dan lingkungan yang mendukung.",
      ],
    },
    sosial: {
      tinggi: [
        "memiliki kecerdasan interpersonal yang sangat tinggi, ditandai oleh kemampuan empati, kepemimpinan, dan membangun hubungan bermakna dengan orang-orang di sekitarnya.",
        "menunjukkan orientasi sosial yang dominan dengan kapasitas luar biasa dalam memahami dinamika kelompok, memotivasi orang lain, dan menciptakan harmoni di lingkungan sosialnya.",
        "diidentifikasi sebagai individu dengan jiwa pemimpin yang tulus, selalu menempatkan kepentingan bersama di atas kepentingan pribadi dan memiliki kemampuan advokasi yang kuat.",
      ],
      sedang: [
        "memiliki kemampuan sosial yang cukup baik dengan potensi kepemimpinan yang perlu dikembangkan melalui keterlibatan aktif dalam kegiatan organisasi dan pelayanan masyarakat.",
        "menunjukkan kepekaan sosial yang positif dengan fondasi empati yang cukup untuk dikembangkan menjadi kekuatan nyata dalam bidang pelayanan dan kepemimpinan.",
      ],
    },
    olahraga: {
      tinggi: [
        "memiliki kecerdasan kinestetik-motorik yang sangat dominan, dengan kemampuan fisik, koordinasi, dan daya tahan yang jauh melampaui teman seusianya.",
        "menunjukkan bakat atletik yang autentik disertai mentalitas kompetitif yang sehat, menjadikannya individu yang selalu mampu tampil optimal di bawah tekanan.",
        "diidentifikasi sebagai individu dengan disiplin fisik yang tinggi, memiliki komitmen kuat terhadap kebugaran dan pemahaman mendalam tentang pentingnya gaya hidup aktif.",
      ],
      sedang: [
        "memiliki minat olahraga yang cukup kuat dengan potensi fisik yang dapat dikembangkan lebih optimal melalui latihan terstruktur dan pembinaan yang tepat.",
        "menunjukkan kemampuan kinestetik yang memadai dengan semangat aktif yang menjadi modal berharga untuk berkembang lebih jauh dalam bidang olahraga dan kesehatan.",
      ],
    },
  },
  p2_kombinasi: {
    "logika-bahasa":   "Kombinasi logika dan bahasa yang dimilikinya menciptakan profil yang sangat langka: kemampuan berpikir analitik yang tajam dipadukan dengan kefasihan verbal yang memukau. Individu dengan kombinasi ini mampu tidak hanya memahami konsep kompleks, tetapi juga mengkomunikasikannya dengan sangat efektif kepada audiens yang beragam. Kekuatan ini sangat bernilai di bidang hukum, jurnalisme investigatif, akademisi, dan konsultansi.",
    "logika-sains":    "Kombinasi logika analitik dan minat sains yang sama-sama tinggi menjadikannya kandidat ideal untuk jalur karier riset dan teknologi tinggi. Kedua kekuatan ini saling memperkuat: logika menyediakan kerangka berpikir yang sistematis, sementara semangat sains mendorongnya untuk terus menguji, membuktikan, dan menemukan hal baru.",
    "logika-seni":     "Perpaduan logika dan seni menciptakan profil yang sangat unik: seorang pemikir kreatif yang mampu mendekati masalah dari sudut pandang analitik sekaligus estetik. Kombinasi ini adalah fondasi ideal untuk bidang desain berbasis data, arsitektur, animasi teknis, dan pengembangan antarmuka pengguna.",
    "logika-sosial":   "Integrasi antara kemampuan analitik dan kecerdasan sosial yang tinggi menjadikannya individu yang sangat efektif dalam peran kepemimpinan berbasis data dan kebijakan publik.",
    "logika-olahraga": "Kombinasi logika yang kuat dan minat olahraga yang tinggi menciptakan profil yang sangat cocok untuk menjadi atlet cerdas, pelatih berbasis sains, atau ahli sport science.",
    "bahasa-sains":    "Kombinasi bahasa dan sains menciptakan profil komunikator ilmiah yang sangat dibutuhkan dunia saat ini. Kemampuan untuk memahami konsep sains yang kompleks sekaligus mengkomunikasikannya dalam bahasa yang mudah dipahami adalah keterampilan yang sangat langka.",
    "bahasa-seni":     "Perpaduan bahasa dan seni yang tinggi mengindikasikan jiwa seniman sekaligus sastrawan yang memiliki kepekaan estetika menyeluruh, baik dalam medium verbal maupun visual.",
    "bahasa-sosial":   "Integrasi kemampuan bahasa dan kecerdasan sosial yang tinggi menjadikannya komunikator sosial yang luar biasa efektif, mampu memengaruhi, memotivasi, dan menginspirasi orang-orang di sekitarnya melalui kekuatan kata.",
    "bahasa-olahraga": "Kombinasi bahasa dan olahraga menciptakan profil yang unik sebagai komunikator dunia olahraga: komentator, jurnalis olahraga, atau motivator atlet.",
    "sains-seni":      "Perpaduan sains dan seni yang sama-sama tinggi menciptakan profil inovator yang mampu menciptakan solusi yang sekaligus fungsional dan indah.",
    "sains-sosial":    "Integrasi minat sains dan kecerdasan sosial yang tinggi menjadikannya ilmuwan yang peduli pada dampak sosial dari pekerjaannya.",
    "sains-olahraga":  "Kombinasi sains dan olahraga yang tinggi menjadikannya kandidat ideal untuk bidang sport science, kedokteran olahraga, fisioterapi, atau nutrisi olahraga.",
    "seni-sosial":     "Perpaduan seni dan kecerdasan sosial yang tinggi menciptakan seniman-aktivis yang menggunakan karyanya sebagai medium untuk menyentuh hati dan mendorong perubahan sosial.",
    "seni-olahraga":   "Kombinasi seni dan olahraga yang tinggi menciptakan profil yang sangat cocok untuk bidang seni pertunjukan fisik: tari, senam artistik, akrobatik, atau koreografi.",
    "sosial-olahraga": "Integrasi kecerdasan sosial dan minat olahraga yang tinggi menjadikannya pemimpin tim yang luar biasa efektif.",
  },
  p3: {
    logika:   (nama, j1, j2, j3, pct) => `Berdasarkan profil bakat yang komprehensif ini, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling selaras dengan kekuatan analitiknya yang berada di angka ${pct}%. Untuk memaksimalkan potensi ini, sangat disarankan agar ia aktif mengikuti olimpiade matematika, kompetisi pemrograman, atau turnamen debat ilmiah. Bergabung dengan komunitas yang berfokus pada diskusi intelektual dan inovasi teknologi akan memperluas wawasan sekaligus membangun jaringan yang berharga.`,
    bahasa:   (nama, j1, j2, j3, pct) => `Berdasarkan profil bakat yang telah dianalisis secara menyeluruh, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling sesuai dengan kecerdasan linguistiknya yang mencapai ${pct}%. Sangat disarankan agar ia mengembangkan kebiasaan membaca lintas genre dan menulis setiap hari. Mempelajari minimal satu bahasa asing secara serius akan membuka cakrawala berpikir yang lebih luas.`,
    sains:    (nama, j1, j2, j3, pct) => `Berdasarkan hasil asesmen yang komprehensif ini, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling selaras dengan minat sainsnya yang mencapai ${pct}%. Sangat disarankan agar ia aktif terlibat dalam kegiatan eksperimen mandiri dan proyek sains sekolah. Mengikuti olimpiade sains akan memberikan tantangan intelektual sekaligus pengakuan atas kemampuan yang dimilikinya.`,
    seni:     (nama, j1, j2, j3, pct) => `Berdasarkan profil bakat yang telah diidentifikasi secara mendalam, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling sesuai dengan jiwa kreatifnya yang mencapai ${pct}%. Sangat disarankan agar ia membangun rutinitas berkarya setiap hari dan membangun portofolio sejak dini. Mengunjungi pameran seni dan festival kreatif secara rutin akan memperluas referensi estetikanya.`,
    sosial:   (nama, j1, j2, j3, pct) => `Berdasarkan hasil asesmen yang menyeluruh ini, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling selaras dengan kecerdasan interpersonalnya yang mencapai ${pct}%. Sangat disarankan agar ia aktif mengambil peran kepemimpinan dalam berbagai organisasi. Terlibat langsung dalam kegiatan pelayanan masyarakat akan mengasah empatinya secara nyata.`,
    olahraga: (nama, j1, j2, j3, pct) => `Berdasarkan profil bakat yang komprehensif ini, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling sesuai dengan kecerdasan kinestetiknya yang mencapai ${pct}%. Sangat disarankan agar ia mengembangkan program latihan yang terstruktur di bawah bimbingan pelatih profesional. Mengikuti kompetisi secara rutin akan membangun mentalitas juara yang kuat.`,
  },
  levelKata: (pct) => {
    if (pct >= 85) return "sangat dominan dan menonjol";
    if (pct >= 70) return "kuat dan konsisten";
    if (pct >= 55) return "cukup berkembang";
    return "masih dalam tahap berkembang";
  },
  pembuka: ["Berdasarkan hasil asesmen yang telah dilaksanakan, ", "Melalui serangkaian pengukuran psikometri yang komprehensif, ", "Hasil analisis mendalam terhadap profil psikologis menunjukkan bahwa ", "Setelah melalui proses asesmen bakat dan minat yang terstandarisasi, "],
};

function generateNarasi(nama, scores, top) {
  const t0 = top[0]; const t1 = top[1]; const t2 = top[2];
  const isHigh = (id) => scores[id] >= 65;
  const p1db  = NARASI_DB.p1[t0.id];
  const p1arr = p1db ? (isHigh(t0.id) ? p1db.tinggi : p1db.sedang) : [];
  const p1core = p1arr[Math.floor((scores[t0.id] + scores[t1.id]) % p1arr.length)] || p1arr[0] || "memiliki profil bakat yang unik dan beragam.";
  const pembuka = NARASI_DB.pembuka[Math.floor(scores[t0.id] % NARASI_DB.pembuka.length)];
  const lvlWord = NARASI_DB.levelKata(t0.pct);
  const p1 = `${pembuka}${nama} ${p1core} Kecenderungan bakat pada bidang ${t0.label} teridentifikasi sebagai yang paling ${lvlWord}, dengan skor mencapai ${t0.pct}%. Selain itu, bidang ${t1.label} (${t1.pct}%) dan ${t2.label} (${t2.pct}%) turut membentuk profil multi-dimensi yang kaya.`;
  const kombiKey = [t0.id, t1.id].sort().join("-");
  const p2base = NARASI_DB.p2_kombinasi[kombiKey] || `${nama} memiliki kombinasi bakat yang unik antara ${t0.label} dan ${t1.label}.`;
  const p2 = `${p2base} Distribusi skor: ${t0.label} (${t0.pct}%), ${t1.label} (${t1.pct}%), ${t2.label} (${t2.pct}%).`;
  const j = (getJurusan("sma_x")[t0.id]) || [];
  const p3fn = NARASI_DB.p3[t0.id];
  const p3 = p3fn ? p3fn(nama, j[0]||"-", j[1]||"-", j[2]||"-", t0.pct) : `${nama} disarankan untuk mendalami bidang-bidang yang selaras dengan kekuatan utamanya.`;
  return `${p1}\n\n${p2}\n\n${p3}`;
}

function doExcelExport(daftar, kelas) {
  const rows = daftar.map((s,i)=>{
    const k=kelas.find(x=>x.id===s.kelasId);
    const jur = s.jurusan || JURUSAN_PER_JENJANG["sma_x"];
    const jenjangLabel = JENJANG_LIST.find(j=>j.id===s.jenjang)?.label || "-";
    return {
      "No":i+1,"Nama":s.nama,"NISN":s.nisn,"Sekolah":s.sekolah,
      "Jenjang":jenjangLabel,
      "Tgl Lahir":s.tgl||"-","Tgl Asesmen":s.tanggalAsesmen,
      "Bakat Utama":s.top[0]?.label||"-","Skor (%)":s.top[0]?.pct||0,
      "Kelas":k?.nama||"-",
      "Logika":s.scores.logika,"Bahasa":s.scores.bahasa,"Sains":s.scores.sains,
      "Seni":s.scores.seni,"Sosial":s.scores.sosial,"Olahraga":s.scores.olahraga,
      "Gaya Belajar":s.gayaBelajar?.label||"-",
      "Skor Gaya (%)":s.gayaBelajar?.pct||"-",
      "Rekomendasi 1":jur[s.top[0]?.id]?.[0]||"-",
      "Rekomendasi 2":jur[s.top[0]?.id]?.[1]||"-",
      "Rekomendasi 3":jur[s.top[0]?.id]?.[2]||"-",
    };
  });
  const kelasRows = kelas.map(k=>{
    const terisi=daftar.filter(s=>s.kelasId===k.id).length;
    return {
      "Kelas":k.nama,"Bidang":CAT.find(c=>c.id===k.bidang)?.label||k.bidang,
      "Kapasitas":k.kapasitas,"Terisi":terisi,"Sisa":k.kapasitas-terisi,
      "% Penuh":Math.round((terisi/k.kapasitas)*100)+"%","Wali Kelas":k.wali||"-"
    };
  });
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"Data Siswa");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(kelasRows),"Rekapitulasi Kelas");
  XLSX.writeFile(wb,"PPDB_"+new Date().toLocaleDateString("id-ID").replace(/\//g,"-")+".xlsx");
}

function doExcelExportPerKelas(daftar, kelas) {
  const wb = XLSX.utils.book_new();
  kelas.forEach(k => {
    const siswaKelas = daftar.filter(s => s.kelasId === k.id);
    if (siswaKelas.length === 0) return;
    const rows = siswaKelas.map((s, i) => {
      const jur = s.jurusan || JURUSAN_PER_JENJANG["sma_x"];
      return {
        "No": i+1, "Nama": s.nama, "NISN": s.nisn||"-", "Sekolah Asal": s.sekolah||"-",
        "Tgl Lahir": s.tgl||"-", "Tgl Asesmen": s.tanggalAsesmen||"-",
        "Bakat Utama": s.top[0]?.label||"-", "Skor (%)": s.top[0]?.pct||0,
        "Logika": s.scores.logika, "Bahasa": s.scores.bahasa, "Sains": s.scores.sains,
        "Seni": s.scores.seni, "Sosial": s.scores.sosial, "Olahraga": s.scores.olahraga,
        "Gaya Belajar": s.gayaBelajar?.label||"-",
        "Rekomendasi 1": jur[s.top[0]?.id]?.[0]||"-",
        "Rekomendasi 2": jur[s.top[0]?.id]?.[1]||"-",
        "Rekomendasi 3": jur[s.top[0]?.id]?.[2]||"-",
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), k.nama.slice(0,31));
  });
  if (wb.SheetNames.length === 0) { alert("Belum ada siswa yang ditempatkan."); return; }
  XLSX.writeFile(wb, "Data_Per_Kelas_"+new Date().toLocaleDateString("id-ID").replace(/\//g,"-")+".xlsx");
}

function doPrintSiswa(siswa, logoBase64, namaSekolah, tahunAjaran, showKelas = false) {
  const t0 = siswa.top[0];
  const bars = CAT.map(c=>`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="min-width:180px;font-size:13px">${c.icon} ${c.label}</span>
      <div style="flex:1;height:10px;background:#e2e8f0;border-radius:99px">
        <div style="width:${siswa.scores[c.id]}%;height:100%;background:${c.color};border-radius:99px"></div>
      </div>
      <strong style="min-width:36px;color:${c.color}">${siswa.scores[c.id]}%</strong>
    </div>`).join("");
  const narasiText = siswa.narasi || "Analisis belum tersedia.";
  const narasiHtml = narasiText.split("\n\n").map(p=>`<p style="margin:0 0 14px;line-height:1.85;font-size:13.5px">${p}</p>`).join("");
  const gb = siswa.gayaBelajar;
  const gbHtml = gb ? `
    <h2 style="border-left:4px solid ${gb.color};padding-left:10px;margin:20px 0 10px;font-size:15px">
      ${gb.icon} Gaya Belajar Dominan — ${gb.label} (${gb.pct}%)
    </h2>
    <div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="font-size:13px;color:#64748b;margin-bottom:8px">${GAYA_BELAJAR_CAT.find(c=>c.id===gb.dominan)?.desc||""}</div>
      <strong style="font-size:13px">Tips Belajar:</strong>
      <ol style="margin:8px 0 0;padding-left:18px">
        ${(gb.tips||[]).map(t=>`<li style="font-size:13px;margin-bottom:4px;line-height:1.6">${t}</li>`).join("")}
      </ol>
    </div>` : "";
  const jenjangInfo = JENJANG_LIST.find(j=>j.id===siswa.jenjang);
  const jurusan = (siswa.jurusan || JURUSAN_PER_JENJANG["sma_x"])[t0.id] || [];
  const topCards = siswa.top.map((t,i)=>`
    <div style="border-radius:12px;padding:16px;text-align:center;border:2px solid ${t.color};background:${t.color}15">
      <div style="font-size:11px;color:#94a3b8;font-weight:800">#${i+1}</div>
      <div style="font-size:26px">${t.icon}</div>
      <div style="font-size:12px;font-weight:700;color:${t.color}">${t.label}</div>
      <div style="font-size:24px;font-weight:900;color:${t.color}">${t.pct}%</div>
    </div>`).join("");
  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Laporan — ${siswa.nama}</title>
  <style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:32px;color:#1e293b}h2{border-left:4px solid #3b82f6;padding-left:10px;margin:20px 0 10px;font-size:15px}.narasi{background:#f8fafc;border-radius:10px;padding:16px}.footer{margin-top:32px;text-align:center;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px}</style>
  </head><body>
  <div style="border-bottom:3px solid #3b82f6;padding-bottom:16px;margin-bottom:20px">
    <!-- baris 1: kop sekolah di tengah -->
    <div style="text-align:center;margin-bottom:14px">
      ${logoBase64 ? `<img src="${logoBase64}" style="width:72px;height:72px;object-fit:contain;display:block;margin:0 auto 6px" />` : ""}
      ${namaSekolah ? `<div style="font-size:16px;font-weight:900;color:#1e3a5f;letter-spacing:0.5px;line-height:1.3">${namaSekolah}</div>` : ""}
      <div style="font-size:12px;color:#64748b;margin-top:2px">Laporan Asesmen Bakat &amp; Minat · PPDB ${tahunAjaran || "2025/2026"}</div>
    </div>
    <!-- garis pemisah tipis antara kop dan data peserta -->
    <div style="border-top:1px dashed #cbd5e1;margin-bottom:12px"></div>
    <!-- baris 2: data peserta di kiri -->
    <div>
      <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">Data Peserta</div>
      <div style="font-size:20px;font-weight:900;color:#1e293b;margin-bottom:4px">${siswa.nama}</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <span style="font-size:12px;color:#64748b">NISN: <strong style="color:#334155">${siswa.nisn}</strong></span>
        <span style="font-size:12px;color:#64748b">Asal: <strong style="color:#334155">${siswa.sekolah}</strong></span>
        <span style="font-size:12px;color:#64748b">Tanggal: <strong style="color:#334155">${siswa.tanggalAsesmen}</strong></span>
        ${showKelas && siswa.kelasNama?`<span style="font-size:12px;color:#3b82f6;font-weight:700">Kelas: ${siswa.kelasNama}</span>`:""}
      </div>
    </div>
  </div>
  <h2>📊 Top 3 Bidang Bakat</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0">${topCards}</div>
  <h2>📈 Profil Lengkap</h2>${bars}
  <h2>🎓 Rekomendasi Jurusan</h2>
  <ul>${jurusan.map(j=>`<li>${j}</li>`).join("")}</ul>
  ${gbHtml}
  <h2>📝 Analisis Psikologi Pendidikan</h2>
  <div class="narasi">${narasiHtml}</div>
  <div class="footer">${namaSekolah ? namaSekolah + " · " : "Sistem PPDB SMA · "}${siswa.tanggalAsesmen}</div>
  </body></html>`;
  // Sisipkan auto-print script ke dalam HTML
  const htmlWithPrint = html.replace("</body>", `<script>window.onload=function(){window.print();}<\/script></body>`);
  const blob = new Blob([htmlWithPrint], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  // Coba buka tab baru dulu
  const w = window.open(url, "_blank");
  if (!w || w.closed || typeof w.closed === "undefined") {
    // Popup diblokir — fallback: download langsung
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_${siswa.nama.replace(/\s+/g,"_")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ══════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════
export default function App() {
  // Baca initial state dari URL saat pertama load
  const initFromUrl = () => {
    const s = PATH_TO_STATE[window.location.pathname];
    return s || { phase:"landing", tab:"dashboard" };
  };

  const [auth, setAuth]           = useState(null);
  const [phase, setPhaseRaw]      = useState(() => initFromUrl().phase);
  const [tab,   setTabRaw]        = useState(() => initFromUrl().tab);
  const [formSiswa, setFormSiswa] = useState({nama:"",nisn:"",sekolah:"",tgl:"",jenjang:"sma_x"});
  const [answers, setAnswers]     = useState({});
  const [gbAnswers, setGbAnswers] = useState({}); // jawaban gaya belajar
  const [asesPhase, setAsesPhase] = useState("bakat"); // "bakat" | "gaya_belajar"
  const [current, setCurrent]     = useState(0);
  const [animIn, setAnimIn]       = useState(true);
  const [daftar, setDaftar]       = useState([]);
  const [viewSiswa, setViewSiswa] = useState(null);
  const [kelas, setKelas]         = useState(DEFAULT_KELAS);
  const [target, setTarget]       = useState(DEFAULT_TARGET);
  const [jenjang, setJenjang]     = useState("sma_x"); // jenjang sekolah
  const [setupDone, setSetupDone] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError]     = useState(null);
  const [questions, setQuestions] = useState([]);
  const [shuffled, setShuffled]   = useState([]);
  const [gbShuffled, setGbShuffled] = useState([]);
  const [siswaSchool, setSiswaSchool] = useState(null);
  const [logoSekolah, setLogoSekolah] = useState(null); // base64 logo
  const [tahunAjaran, setTahunAjaran] = useState(null); // e.g. '2025/2026'

  // Wrapper setPhase & setTab yang sekaligus update URL
  function setPhase(p, t) {
    const newTab = t !== undefined ? t : tab;
    setPhaseRaw(p);
    if (t !== undefined) setTabRaw(t);
    navigate(p, newTab);
  }
  function setTab(t) {
    setTabRaw(t);
    navigate(phase, t);
  }

  // Tangani tombol Back/Forward browser
  useEffect(() => {
    function onPop(e) {
      const s = PATH_TO_STATE[window.location.pathname] || { phase:"landing", tab:"dashboard" };
      setPhaseRaw(s.phase);
      setTabRaw(s.tab);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ── Load data dari Supabase — semua query pakai auth.school_id ──
  const loadAllData = useCallback(async () => {
    if (!auth?.school_id) return;
    setDbLoading(true); setDbError(null);
    try {
      const sid = auth.school_id;
      const [kelasData, targetData, siswaData, soalData, logoData, tahunAjaranData] = await Promise.all([
        fetchKelas(sid),
        fetchTarget(sid),
        fetchSiswa(sid),
        fetchSoal(sid),
        getLogoSekolah(sid),
        getTahunAjaran(sid),
      ]);
      setKelas(kelasData.length > 0 ? kelasData : DEFAULT_KELAS);
      setTarget(targetData);
      setDaftar(siswaData);
      setQuestions(soalData.length > 0 ? soalData : QUESTIONS);
      if (logoData) setLogoSekolah(logoData);
      if (tahunAjaranData) setTahunAjaran(tahunAjaranData);
      setSetupDone(true);
    } catch(e) {
      setDbError("Gagal memuat data: " + e.message);
    }
    setDbLoading(false);
  }, [auth]);

  useEffect(() => {
    if (auth?.role === "panitia") loadAllData();
  }, [auth, loadAllData]);

  function handleAnswer(qid, val) {
    setAnimIn(false);
    setTimeout(()=>{
      setAnswers(prev=>({...prev,[qid]:val}));
      // Tidak auto-pindah soal agar siswa bisa mengubah jawaban
      setAnimIn(true);
    },180);
  }

  function handleNext() {
    const maxLen = shuffled.length || QUESTIONS.length;
    if (current < maxLen - 1) {
      setAnimIn(false);
      setTimeout(() => { setCurrent(c => c + 1); setAnimIn(true); }, 180);
    }
  }

  async function handleSelesai() {
    // ── Validasi kuota paket ──────────────────────────────
    const maksSiswa = auth?.maksSiswa ?? null;
    if (maksSiswa !== null && daftar.length >= maksSiswa) {
      alert(`❌ Kuota siswa paket Anda sudah penuh (${maksSiswa} siswa).\nHubungi admin untuk upgrade paket.`);
      return;
    }
    const scores    = calcScores(answers);
    const top       = getTop(scores);
    // Fetch kelas & siswa fresh dari Supabase agar autoAssign pakai data terkini
    const schoolId  = auth?.school_id || siswaSchool?.id || null;
    let kelasLive   = kelas;
    let daftarLive  = daftar;
    if (schoolId) {
      try {
        const [kd, sd] = await Promise.all([fetchKelas(schoolId), fetchSiswa(schoolId)]);
        if (kd.length > 0) kelasLive = kd;
        daftarLive = sd;
      } catch(e) { console.error("Gagal fetch live data:", e.message); }
    }
    // Penempatan kelas dilakukan SETELAH semua siswa selesai asesmen (bulk ranking)
    // Siswa disimpan tanpa kelas dulu — admin proses via tombol "Proses Penempatan"
    const kelasId      = null;
    const kelasNama    = null;
    const kelasOverflow = false;
    const narasi    = generateNarasi(formSiswa.nama, scores, top);
    const gbScores  = calcGayaBelajar(gbAnswers);
    const [topGbId, topGbPct] = getTopGayaBelajar(gbScores);
    const topGbCat  = GAYA_BELAJAR_CAT.find(c => c.id === topGbId);
    const jurusan   = getJurusan(formSiswa.jenjang || jenjang);
    const rec = {
      ...formSiswa, scores, top, kelasId, kelasNama, kelasOverflow,
      tanggalAsesmen: new Date().toLocaleDateString("id-ID", { dateStyle: "long" }),
      narasi,
      jenjang: formSiswa.jenjang || jenjang,
      gayaBelajar: {
        scores: gbScores,
        dominan: topGbId,
        pct: topGbPct,
        label: topGbCat?.label,
        icon: topGbCat?.icon,
        color: topGbCat?.color,
        tips: GAYA_BELAJAR_TIPS[topGbId] || [],
      },
      jurusan,
    };
    setViewSiswa(rec);
    setPhase("result");
    try {
      const sid = auth?.school_id || siswaSchool?.id || null;
      await insertSiswa(rec, sid);
      if (auth?.role === "panitia") await loadAllData();
    } catch(e) {
      if (e.message?.startsWith("KUOTA_PENUH:")) {
        const msg = e.message.replace("KUOTA_PENUH:", "");
        // Tetap tampilkan hasil asesmen, tapi beri tahu kuota penuh
        setTimeout(() => alert("⚠️ Data asesmen tidak tersimpan!\n\n" + msg), 300);
      } else {
        console.error("Gagal simpan ke Supabase:", e.message);
      }
    }
  }

  async function handleBulkAssign() {
    if (!window.confirm(`Proses penempatan kelas untuk ${daftar.filter(s=>!s.kelasId).length} siswa yang belum ditempatkan?\n\nSiswa akan diranking berdasarkan kesesuaian bakat dengan mapel kelas.`)) return;
    setDbLoading(true);
    try {
      const hasilAssign = bulkAssign(daftar, kelas);
      // Update ke Supabase satu per satu
      await Promise.all(hasilAssign.map(h => updateKelasSiswa(h.siswaId, h.kelasId, h.kelasNama)));
      // Update state lokal
      setDaftar(prev => prev.map(s => {
        const h = hasilAssign.find(x => x.siswaId === s.id);
        return h ? { ...s, kelasId: h.kelasId, kelasNama: h.kelasNama } : s;
      }));
      alert(`✅ Penempatan selesai!\n${hasilAssign.length} siswa berhasil ditempatkan.`);
    } catch(e) {
      alert("❌ Gagal memproses penempatan: " + e.message);
    } finally {
      setDbLoading(false);
    }
  }

  async function handleSaveKelas(kelasArr) {
    setDbLoading(true);
    try {
      await upsertKelas(kelasArr, auth.school_id);
      setKelas(kelasArr);
    } catch(e) { setDbError("Gagal simpan kelas: " + e.message); }
    setDbLoading(false);
  }

  async function handleSaveTarget(min, max) {
    setDbLoading(true);
    try {
      await saveTarget(min, max, auth.school_id);
      setTarget({min, max});
    } catch(e) { setDbError("Gagal simpan target: " + e.message); }
    setDbLoading(false);
  }

  async function handleDeleteKelas(kid) {
    setDbLoading(true);
    try {
      await deleteKelas(kid);
      setKelas(prev=>prev.filter(k=>k.id!==kid));
      setDaftar(prev=>prev.map(s=>s.kelasId===kid?{...s,kelasId:null,kelasNama:null}:s));
    } catch(e) { setDbError("Gagal hapus kelas: " + e.message); }
    setDbLoading(false);
  }

  async function handleUpdateKelasSiswa(siswaId, kelasId, kelasNama) {
    setDaftar(prev=>prev.map(s=>s.id===siswaId?{...s,kelasId,kelasNama}:s));
    try { await updateKelasSiswa(siswaId, kelasId, kelasNama); }
    catch(e) { console.error("Gagal update kelas siswa:", e.message); }
  }

  function resetAsesmen() {
    setAnswers({}); setGbAnswers({}); setCurrent(0);
    setAsesPhase("bakat");
    setFormSiswa({nama:"",nisn:"",sekolah:"",tgl:"",jenjang:"sma_x"});
    setSiswaSchool(null);
    setPhaseRaw("landing");
    navigate("landing");
  }

  if (!auth) return (
    <LoginPage onLogin={(role, userData) => {
      setAuth({...userData, role});
      if (userData.logoSekolah) setLogoSekolah(userData.logoSekolah);
      if (userData.tahunAjaran) setTahunAjaran(userData.tahunAjaran);
      const target = role==="panitia" ? "dashboard" : "landing";
      setPhaseRaw(target);
      navigate(target);
    }}/>
  );

  // Owner Dashboard
  if (auth.role === "owner") return (
    <OwnerDashboard auth={auth} onLogout={() => setAuth(null)} />
  );

  if (dbLoading && auth.role==="panitia" && daftar.length===0 && !setupDone) {
    return (
      <div style={{...S.root,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
        <div style={{textAlign:"center"}}>
          <div style={{width:48,height:48,border:"5px solid #1E293B",borderTop:"5px solid #3B82F6",
            borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
          <p style={{color:"#475569",marginTop:18,fontSize:15}}>Memuat data dari Supabase...</p>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div style={{...S.root,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
        <div style={{...S.card,maxWidth:420,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
          <h3 style={{color:"#EF4444",marginBottom:8}}>Koneksi Database Gagal</h3>
          <p style={{color:"#94A3B8",fontSize:13,marginBottom:16}}>{dbError}</p>
          <button style={S.cta} onClick={loadAllData}>Coba Lagi</button>
        </div>
      </div>
    );
  }

  if (auth.role==="panitia" && phase==="dashboard" && !setupDone) {
    return (
      <div style={S.root}>
        <Topbar auth={auth} phase={phase} setPhase={setPhase} setAuth={setAuth} daftar={daftar} tab={tab} setTab={setTab} questions={questions}/>
        <main style={S.main} className="main-resp">
          <SetupWizard kelas={kelas} target={target} jenjang={jenjang} maksSiswa={auth?.maksSiswa ?? null} onSaveKelas={handleSaveKelas} onSaveTarget={handleSaveTarget} onSaveJenjang={setJenjang} onDone={()=>setSetupDone(true)} dbLoading={dbLoading}/>
        </main>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <Topbar auth={auth} phase={phase} setPhase={setPhase} setAuth={setAuth} daftar={daftar} tab={tab} setTab={setTab} questions={questions}/>
      <main style={S.main} className="main-resp">
        {phase === "landing" && <Landing onMulai={()=>setPhase(auth?.role==="panitia"?"form":"kode")} />}
        {phase === "kode" && (
          <InputKodeSekolah
            onValid={async (sekolah) => { setSiswaSchool(sekolah); if (sekolah.logo) setLogoSekolah(sekolah.logo); if (sekolah.tahun_ajaran) setTahunAjaran(sekolah.tahun_ajaran); try { const kd = await fetchKelas(sekolah.id); if (kd.length > 0) setKelas(kd); } catch(e) { console.error("Gagal load kelas:", e.message); } setPhase("form"); }}
            onBatal={() => setPhase("landing")}
          />
        )}
        {phase === "form" && <FormSiswa siswa={formSiswa} onChange={setFormSiswa} siswaSchool={siswaSchool} jenjangAdmin={jenjang} onLanjut={() => {
          setCurrent(0); setAnswers({}); setGbAnswers({}); setAsesPhase("bakat");
          const q = questions.length > 0 ? questions : QUESTIONS;
          setShuffled([...q].sort(() => Math.random() - 0.5));
          setGbShuffled([...GAYA_BELAJAR_QUESTIONS].sort(() => Math.random() - 0.5));
          setPhase("asesmen");
        }} />}
        {phase === "asesmen" && asesPhase === "bakat" && (
          <Asesmen
            questions={shuffled.length > 0 ? shuffled : QUESTIONS}
            current={current} answers={answers} animIn={animIn}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onPrev={() => setCurrent(c => Math.max(0, c - 1))}
            onSelesai={() => { setAsesPhase("gaya_belajar"); setCurrent(0); }}
          />
        )}
        {phase === "asesmen" && asesPhase === "gaya_belajar" && (
          <AsesmenGayaBelajar
            questions={gbShuffled.length > 0 ? gbShuffled : GAYA_BELAJAR_QUESTIONS}
            current={current} answers={gbAnswers} animIn={animIn}
            onAnswer={(qid, val) => {
              setAnimIn(false);
              setTimeout(() => { setGbAnswers(prev => ({...prev, [qid]: val})); setAnimIn(true); }, 180);
            }}
            onNext={() => {
              setAnimIn(false);
              setTimeout(() => { setCurrent(c => c + 1); setAnimIn(true); }, 180);
            }}
            onPrev={() => setCurrent(c => Math.max(0, c - 1))}
            onSelesai={handleSelesai}
          />
        )}
        {phase === "result" && viewSiswa && <Hasil siswa={viewSiswa} onBaru={resetAsesmen} onDaftar={()=>setPhase("dashboard","data")} auth={auth} logoSekolah={logoSekolah} tahunAjaran={tahunAjaran} kelasList={kelas}/>}
        {phase === "dashboard" && auth.role==="panitia" && (
          <Dashboard
            daftar={daftar} setDaftar={setDaftar}
            kelas={kelas} target={target}
            tab={tab} setTab={setTab}
            questions={questions}
            auth={auth}
            maksSiswa={auth?.maksSiswa ?? null}
            onDetail={s=>{setViewSiswa(s);setPhase("result");}}
            onBaru={()=>{
              const maks = auth?.maksSiswa ?? null;
              if (maks !== null && daftar.length >= maks) {
                alert(`❌ Kuota siswa penuh (${maks} siswa).\nHubungi admin untuk upgrade paket.`);
                return;
              }
              setPhase("landing");
            }}
            onExport={()=>doExcelExport(daftar,kelas)}
            onSetupUlang={()=>setSetupDone(false)}
            onSaveKelas={handleSaveKelas}
            onDeleteKelas={handleDeleteKelas}
            onUpdateKelasSiswa={handleUpdateKelasSiswa}
            onRefresh={loadAllData}
            onBulkAssign={handleBulkAssign}
            dbLoading={dbLoading}
            logoSekolah={logoSekolah}
            onSaveLogo={async (base64) => { await uploadLogoSekolah(auth.school_id, base64); setLogoSekolah(base64); }}
            tahunAjaran={tahunAjaran}
            onSaveTahun={async (t) => { await saveTahunAjaran(auth.school_id, t); setTahunAjaran(t); }}
          />
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════
function Topbar({auth,phase,setPhase,setAuth,daftar,tab,setTab,questions}) {
  const [copied, setCopied] = useState(false);
  function copyKode() {
    if (!auth?.kodeSekolah) return;
    navigator.clipboard.writeText(auth.kodeSekolah).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <header style={S.header}>
      <div className="header-inner" style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
        <div className="header-brand" style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}
          onClick={()=>setPhase(auth.role==="panitia"?"dashboard":"landing")}>
          <span style={{fontSize:26,color:"#3B82F6"}}>◈</span>
          <div>
            <div style={{fontWeight:800,fontSize:14}}>ASESMEN BAKAT & MINAT</div>
            <div style={{fontSize:11,color:"#475569"}}>Sistem PPDB SMA 2025/2026</div>
          </div>
        </div>
        <div className="nav-btns">
          {auth.role==="panitia"&&<>
            {auth.kodeSekolah && (
              <button
                onClick={copyKode}
                title="Klik untuk salin kode sekolah"
                style={{...S.navBtn, background:"#1E3A5F", color: copied?"#4ade80":"#60A5FA", borderColor:"#1E3A5F", fontWeight:700, letterSpacing:1, fontSize:12}}
              >
                {copied ? "✅ Tersalin!" : `🔑 ${auth.kodeSekolah}`}
              </button>
            )}
            {auth.lisensiExpired && (()=>{
              const sisa = auth.lisensiSisaHari;
              const col  = sisa <= 7 ? "#F59E0B" : sisa <= 30 ? "#60A5FA" : "#4ade80";
              const bg   = sisa <= 7 ? "#451A03" : "#0F172A";
              const tgl  = new Date(auth.lisensiExpired).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});
              return (
                <span title={`Lisensi berlaku hingga ${tgl}`}
                  style={{...S.navBtn, background:bg, color:col, borderColor:col+"44", fontSize:11, fontWeight:700, cursor:"default"}}>
                  🛡️ Lisensi: {sisa}h ({tgl})
                </span>
              );
            })()}
            <button style={{...S.navBtn,...(phase==="dashboard"&&tab==="dashboard"?S.navAct:{})}} onClick={()=>setPhase("dashboard","dashboard")}>Dashboard</button>
            <button style={{...S.navBtn,...(phase==="dashboard"&&tab==="kelas"?S.navAct:{})}} onClick={()=>setPhase("dashboard","kelas")}>Kelas</button>
            <button style={{...S.navBtn,...(phase==="dashboard"&&tab==="data"?S.navAct:{})}} onClick={()=>setPhase("dashboard","data")}>Data</button>
            <button style={{...S.navBtn,...(phase==="dashboard"&&tab==="soal"?S.navAct:{})}} onClick={()=>setPhase("dashboard","soal")}>Soal</button>
            {auth?.role_admin==="admin_utama" && (
              <button style={{...S.navBtn,...(phase==="dashboard"&&tab==="admin"?S.navAct:{})}} onClick={()=>setPhase("dashboard","admin")}>Admin</button>
            )}
            {auth?.role_admin==="admin_utama" && (
              <button style={{...S.navBtn,...(phase==="dashboard"&&tab==="logo"?S.navAct:{})}} onClick={()=>setPhase("dashboard","logo")}>Identitas</button>
            )}
          </>}
          <button style={S.navBtn} onClick={()=>setPhase("landing")}>+ Asesmen</button>
          <button style={{...S.navBtn,background:"#1E293B"}} onClick={()=>setAuth(null)}>Keluar</button>
        </div>
      </div>
    </header>
  );
}

// ══════════════════════════════════════════
// SETUP WIZARD
// ══════════════════════════════════════════
function SetupWizard({kelas,target,jenjang,maksSiswa,onSaveKelas,onSaveTarget,onSaveJenjang,onDone,dbLoading}) {
  const [step,setStep]=useState(0);
  const [lj,setLj]=useState(jenjang||"sma_x");
  const [lt,setLt]=useState({
    min: target.min || 120,
    max: target.max || 175,
    perJenjang: target.perJenjang || {
      smp:    { min: null, max: null },
      sma_x:  { min: target.min || 120, max: target.max || 175 },
      sma_xi: { min: null, max: null },
    }
  });
  const [lk,setLk]=useState(kelas.map(k=>({...k, jenjang: k.jenjang || "sma_x"})));

  const totalKap = lk.reduce((s,k)=>s+k.kapasitas,0);
  const totalMin = Object.values(lt.perJenjang).reduce((s,v)=>s+(v.min||0),0) || lt.min;
  const totalMax = Object.values(lt.perJenjang).reduce((s,v)=>s+(v.max||0),0) || lt.max;

  // Validasi vs paket lisensi
  const kapMelebihi = maksSiswa !== null && totalKap > maksSiswa;
  const targetMelebihi = maksSiswa !== null && totalMax > maksSiswa;
  const stColor = kapMelebihi ? "#EF4444" : totalKap < totalMin ? "#EF4444" : totalKap > totalMax ? "#F59E0B" : "#10B981";
  const stMsg   = kapMelebihi
    ? `🔴 Melebihi kuota paket! Maks ${maksSiswa} siswa, total kursi ${totalKap}`
    : totalKap < totalMin ? "⚠️ Kurang "+(totalMin-totalKap)+" kursi"
    : totalKap > totalMax ? "⚠️ Kelebihan "+(totalKap-totalMax)+" kursi"
    : "✅ Kapasitas ideal — "+totalKap+" kursi";

  function updPJ(jid, field, val) {
    const angka = parseInt(val) || null;
    // Batasi max tidak melebihi maksSiswa
    const safe = maksSiswa !== null && angka !== null && field === "max" && angka > maksSiswa ? maksSiswa : angka;
    setLt(prev => ({
      ...prev,
      perJenjang: { ...prev.perJenjang, [jid]: { ...prev.perJenjang[jid], [field]: safe } }
    }));
  }

  function updK(i,f,v){
    setLk(prev=>prev.map((k,idx)=>{
      if(idx!==i) return k;
      let val = f==="kapasitas" ? parseInt(v)||0 : v;
      // Batasi kapasitas kelas agar total tidak melebihi maksSiswa
      if(f==="kapasitas" && maksSiswa !== null) {
        const totalTanpaIni = prev.reduce((s,kk,ii)=>ii===i?s:s+kk.kapasitas, 0);
        if(totalTanpaIni + val > maksSiswa) val = Math.max(0, maksSiswa - totalTanpaIni);
      }
      return {...k,[f]:val};
    }));
  }
  function addK(){
    if(maksSiswa !== null && totalKap >= maksSiswa) {
      alert(`❌ Total kapasitas kelas sudah mencapai batas paket (${maksSiswa} siswa).`);
      return;
    }
    setLk(prev=>[...prev,{id:"k"+Date.now(),nama:"",bidang:"sains",kapasitas:Math.min(30, maksSiswa?maksSiswa-totalKap:30),wali:"",jenjang:lj}]);
  }
  function delK(i){ if(lk.length>1) setLk(prev=>prev.filter((_,idx)=>idx!==i)); }

  function calcGlobal() {
    const pj = lt.perJenjang;
    const minTotal = (pj.smp.min||0) + (pj.sma_x.min||0) + (pj.sma_xi.min||0);
    const maxTotal = (pj.smp.max||0) + (pj.sma_x.max||0) + (pj.sma_xi.max||0);
    return { min: minTotal || lt.min, max: maxTotal || lt.max };
  }

  async function finish() {
    if (kapMelebihi) { alert(`❌ Total kapasitas kelas (${totalKap}) melebihi kuota paket (${maksSiswa} siswa). Kurangi kapasitas atau jumlah kelas.`); return; }
    const global = calcGlobal();
    await onSaveKelas(lk);
    await onSaveTarget(global.min, global.max, lt.perJenjang);
    await onSaveJenjang(lj);
    onDone();
  }
  const jenjangInfo = JENJANG_LIST.find(j=>j.id===lj);
  return (
    <div style={{maxWidth:660,margin:"0 auto",display:"flex",flexDirection:"column",gap:20}}>
      <div style={{textAlign:"center",padding:"18px 0 4px"}}>
        <div style={S.badge}>✦ Setup Awal PPDB</div>
        <h2 style={{fontSize:23,fontWeight:900,margin:"10px 0 4px",color:"#E2E8F0"}}>Konfigurasi Penerimaan Siswa Baru</h2>
      </div>
      {step===0&&(
        <div style={S.card}>
          <h3 style={S.cardTitle}>🎓 Pilih Jenjang</h3>
          <p style={{color:"#475569",fontSize:13,marginBottom:16}}>Sesuaikan sistem dengan kebutuhan sekolah kamu</p>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
            {JENJANG_LIST.map(j=>(
              <div key={j.id} onClick={()=>setLj(j.id)} style={{
                border:"2px solid "+(lj===j.id?"#3B82F6":"#1E293B"),
                background:lj===j.id?"#1E3A5F":"#0B1120",
                borderRadius:12,padding:"14px 18px",cursor:"pointer",
                display:"flex",alignItems:"center",gap:14,transition:"all 0.15s"
              }}>
                <span style={{fontSize:28}}>{j.icon}</span>
                <div>
                  <div style={{fontWeight:700,color:lj===j.id?"#60A5FA":"#E2E8F0",fontSize:14}}>{j.label}</div>
                  <div style={{fontSize:12,color:"#475569",marginTop:2}}>{j.subtitle}</div>
                </div>
                {lj===j.id&&<span style={{marginLeft:"auto",color:"#3B82F6",fontWeight:900}}>✓</span>}
              </div>
            ))}
          </div>
          <button style={{...S.cta,width:"100%"}} onClick={()=>setStep(1)}>Lanjut: Target Penerimaan →</button>
        </div>
      )}
      {step===1&&(
        <div style={S.card}>
          <h3 style={S.cardTitle}>🎯 Target Penerimaan Per Jenjang</h3>
          {maksSiswa !== null && (
            <div style={{background:"#1E3A5F",border:"1px solid #3B82F666",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#93C5FD"}}>
              📦 Batas paket: <strong style={{color:"#60A5FA"}}>{maksSiswa} siswa total</strong> — jumlah semua jenjang tidak boleh melebihi ini.
            </div>
          )}
          <p style={{color:"#475569",fontSize:13,marginBottom:14}}>Isi target untuk jenjang yang dibuka. Kosongkan jenjang yang tidak digunakan.</p>
          {JENJANG_LIST.map(j=>{
            const pj = lt.perJenjang?.[j.id] || { min: null, max: null };
            const kelasJ = lk.filter(k=>(k.jenjang||"sma_x")===j.id);
            const kapJ = kelasJ.reduce((s,k)=>s+k.kapasitas,0);
            return (
              <div key={j.id} style={{background:"#0B1120",border:"1px solid #1E293B",borderRadius:12,padding:14,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:20}}>{j.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:"#E2E8F0",fontSize:13}}>{j.label}</div>
                    <div style={{fontSize:11,color:"#475569"}}>{j.subtitle}{kapJ>0?` · ${kapJ} kursi tersedia`:""}</div>
                  </div>
                  {pj.min && pj.max && <span style={{fontSize:11,color:"#10B981",fontWeight:700}}>✓ Aktif</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div style={S.fg}>
                    <label style={S.lbl}>Minimum siswa</label>
                    <input style={S.inp} type="number" placeholder="Kosongkan jika tidak ada"
                      value={pj.min??""} min={0} max={maksSiswa??undefined}
                      onChange={e=>updPJ(j.id,"min",e.target.value||null)}/>
                  </div>
                  <div style={S.fg}>
                    <label style={S.lbl}>Maksimum siswa{maksSiswa?` (maks ${maksSiswa})`:""}</label>
                    <input style={S.inp} type="number" placeholder="Kosongkan jika tidak ada"
                      value={pj.max??""} min={0} max={maksSiswa??undefined}
                      onChange={e=>updPJ(j.id,"max",e.target.value||null)}/>
                  </div>
                </div>
              </div>
            );
          })}
          {(()=>{const g=calcGlobal(); return g.max>0?(
            <div style={{background: targetMelebihi?"#450A0A":"#0F172A",border:"1px solid "+(targetMelebihi?"#EF444466":"#1E3A5F"),borderRadius:10,padding:"10px 14px",fontSize:13,color:"#94A3B8",marginBottom:6}}>
              📊 Total semua jenjang: <strong style={{color:targetMelebihi?"#EF4444":"#60A5FA"}}>{g.min}–{g.max} siswa</strong>
              {targetMelebihi && <span style={{color:"#EF4444",marginLeft:8}}>⚠️ Melebihi batas paket ({maksSiswa})</span>}
            </div>
          ):null;})()}
          <button style={{...S.cta,width:"100%",opacity:targetMelebihi?0.5:1}} onClick={()=>setStep(2)} disabled={targetMelebihi}>Lanjut: Atur Kelas →</button>
          <button style={{...S.ghost,width:"100%",marginTop:8}} onClick={()=>setStep(0)}>← Kembali ke Jenjang</button>
        </div>
      )}
      {step===2&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Banner kuota paket */}
          {maksSiswa !== null && (
            <div style={{background: kapMelebihi?"#450A0A":"#0B1120", border:"1px solid "+(kapMelebihi?"#EF444466":"#1E3A5F"), borderRadius:12, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8}}>
              <div style={{fontSize:13, color: kapMelebihi?"#FCA5A5":"#94A3B8"}}>
                📦 Kuota paket: <strong style={{color: kapMelebihi?"#EF4444":"#60A5FA"}}>{maksSiswa} siswa maks</strong>
              </div>
              <div style={{fontSize:13, fontWeight:700, color: kapMelebihi?"#EF4444": totalKap>= maksSiswa*0.9?"#F97316":"#10B981"}}>
                {totalKap}/{maksSiswa} kursi
              </div>
            </div>
          )}
          <div style={{background:"#0F172A",border:"1px solid "+stColor+"44",borderRadius:14,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}>
              <span style={{color:"#94A3B8"}}>Total: <strong style={{color:stColor}}>{totalKap} kursi</strong></span>
              <span style={{color:stColor,fontWeight:700}}>{stMsg}</span>
            </div>
            <div style={{height:9,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
              <div style={{width:Math.min((totalKap/(maksSiswa||totalMax||1))*100,110)+"%",height:"100%",background:stColor,borderRadius:99}}/>
            </div>
          </div>
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <h3 style={S.cardTitle}>🏫 Kelas ({lk.length})</h3>
              <button style={{...S.cta,padding:"7px 14px",fontSize:13}} onClick={addK} disabled={lk.length>=16}>+ Kelas</button>
            </div>
            {/* Kelas dikelompokkan per jenjang */}
            {JENJANG_LIST.map(j => {
              const kelasjList = lk.filter(k=>(k.jenjang||"sma_x")===j.id);
              return (
                <div key={j.id} style={{marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:"#0B1120",borderRadius:9,marginBottom:8,border:"1px solid #1E293B"}}>
                    <span style={{fontSize:18}}>{j.icon}</span>
                    <span style={{fontWeight:700,color:"#94A3B8",fontSize:13}}>{j.label}</span>
                    <span style={{fontSize:11,color:"#334155",marginLeft:"auto"}}>{kelasjList.length} kelas</span>
                    <button
                      style={{...S.ghost,padding:"3px 10px",fontSize:11,marginLeft:8}}
                      onClick={()=>setLk(prev=>[...prev,{id:"k"+Date.now(),nama:"",bidang:"sains",kapasitas:30,wali:"",jenjang:j.id}])}
                    >+ Tambah ke {j.label.split(" ")[0]}</button>
                  </div>
                  {kelasjList.length===0 && (
                    <div style={{fontSize:12,color:"#334155",paddingLeft:14,paddingBottom:4,fontStyle:"italic"}}>Belum ada kelas untuk jenjang ini.</div>
                  )}
                  {lk.map((k,i)=>{
                    if((k.jenjang||"sma_x")!==j.id) return null;
                    const cat=CAT.find(c=>c.id===k.bidang);
                    return (
                      <div key={k.id} style={{background:"#0B1120",border:"1px solid "+(cat?.color||"#334155")+"44",borderRadius:11,padding:12,marginBottom:8,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontSize:20}}>{cat?.icon}</span>
                        <div className="kelas-row-grid" style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1.5fr 80px auto",gap:8,alignItems:"center"}}>
                          <input style={{...S.inp,padding:"6px 9px",fontSize:13}} placeholder="Nama kelas" value={k.nama} onChange={e=>updK(i,"nama",e.target.value)}/>
                          <select style={{...S.inp,padding:"6px 9px",fontSize:13}} value={k.bidang} onChange={e=>updK(i,"bidang",e.target.value)}>
                            {CAT.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                          </select>
                          <input style={{...S.inp,padding:"6px 8px",fontSize:13}} type="number" value={k.kapasitas} min={1} max={50} onChange={e=>updK(i,"kapasitas",e.target.value)}/>
                          <button style={{...S.ghost,padding:"5px 9px",fontSize:12,color:"#EF4444",borderColor:"#EF444433"}} onClick={()=>delK(i)} disabled={lk.length<=1}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={S.ghost} onClick={()=>setStep(1)}>← Kembali</button>
            <button style={{...S.cta,flex:1,opacity:dbLoading?0.6:1}} onClick={finish} disabled={dbLoading}>{dbLoading?"Menyimpan...":"✅ Simpan & Mulai PPDB"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// LANDING
// ══════════════════════════════════════════
function Landing({onMulai}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:26}}>
      <div style={{textAlign:"center",padding:"38px 16px"}}>
        <div style={S.badge}>✦ PPDB 2025/2026</div>
        <h1 className="landing-h1" style={{fontWeight:900,lineHeight:1.1,margin:"14px 0 14px",
          background:"linear-gradient(135deg,#60A5FA,#A78BFA)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          Temukan Bakat<br/>&amp; Minatmu
        </h1>
        <p style={{fontSize:15,color:"#94A3B8",maxWidth:480,margin:"0 auto 22px",lineHeight:1.7}}>60 pertanyaan mendalam · 6 bidang minat · Analisis instan</p>
        <button style={S.cta} onClick={onMulai}>Mulai Asesmen →</button>
      </div>
      <div className="grid-cat">
        {CAT.map(c=>(
          <div key={c.id} style={{background:"#0F172A",border:"1px solid "+c.color+"44",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{width:38,height:38,borderRadius:10,background:c.color+"22",color:c.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.icon}</span>
            <span style={{fontSize:13,fontWeight:600,color:"#CBD5E1"}}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// FORM SISWA
// ══════════════════════════════════════════
// ══════════════════════════════════════════
// INPUT KODE SEKOLAH (siswa mandiri)
// ══════════════════════════════════════════
function InputKodeSekolah({onValid, onBatal}) {
  const [kode, setKode]     = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState("");

  async function handleCek() {
    if (!kode.trim()) return;
    setLoading(true); setErr("");
    try {
      const sekolah = await fetchSekolahByKode(kode.trim());
      if (!sekolah) {
        setErr("Kode sekolah tidak ditemukan. Periksa kembali kode dari pihak sekolah.");
      } else if (!sekolah.aktif) {
        setErr("Sekolah ini belum aktif. Hubungi pihak sekolah Anda.");
      } else {
        onValid(sekolah);
      }
    } catch(e) {
      setErr("Gagal verifikasi: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{display:"flex",justifyContent:"center"}}>
      <div style={{...S.card,maxWidth:460,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:10}}>🏫</div>
        <h2 style={{...S.cardTitle,textAlign:"center",marginBottom:6}}>Kode Sekolah</h2>
        <p style={{color:"#475569",fontSize:13,marginBottom:22,lineHeight:1.6}}>
          Masukkan kode unik yang diberikan oleh pihak sekolah tujuan Anda.
        </p>
        <div style={S.fg}>
          <label style={S.lbl}>Kode Sekolah</label>
          <input
            style={{...S.inp,textAlign:"center",fontSize:18,fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}
            placeholder="Contoh: SMA-001"
            value={kode}
            onChange={e=>{setKode(e.target.value.toUpperCase());setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&handleCek()}
            maxLength={20}
          />
        </div>
        {err && (
          <div style={{background:"#EF444422",border:"1px solid #EF444466",borderRadius:10,padding:"10px 14px",color:"#FCA5A5",fontSize:13,marginBottom:14,textAlign:"left"}}>
            ⚠️ {err}
          </div>
        )}
        <button
          style={{...S.cta,width:"100%",opacity:kode.trim()&&!loading?1:0.4}}
          disabled={!kode.trim()||loading}
          onClick={handleCek}
        >
          {loading?"Memeriksa...":"Verifikasi Kode →"}
        </button>
        <button style={{...S.ghost,width:"100%",marginTop:10}} onClick={onBatal}>← Kembali</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// FORM SISWA
// ══════════════════════════════════════════
function FormSiswa({siswa,onChange,onLanjut,siswaSchool,jenjangAdmin}) {
  const valid = siswa.nama && siswa.nisn && siswa.sekolah && siswa.jenjang;
  return (
    <div style={{display:"flex",justifyContent:"center"}}>
      <div style={{...S.card,maxWidth:520,width:"100%"}}>
        <h2 style={S.cardTitle}>Data Peserta</h2>
        <p style={{color:"#475569",fontSize:13,marginBottom:18}}>Lengkapi identitas sebelum memulai asesmen</p>
        {siswaSchool && (
          <div style={{background:"#10B98122",border:"1px solid #10B98166",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>🏫</span>
            <div>
              <div style={{fontSize:12,color:"#6EE7B7",fontWeight:700}}>Sekolah Tujuan</div>
              <div style={{fontSize:14,color:"#E2E8F0",fontWeight:600}}>{siswaSchool.nama}</div>
              <div style={{fontSize:11,color:"#475569"}}>Kode: {siswaSchool.kode}</div>
            </div>
          </div>
        )}
        {[["Nama Lengkap *","text","Masukkan nama lengkap","nama"],
          ["NISN *","text","Nomor Induk Siswa Nasional","nisn"],
          ["Asal Sekolah *","text","Nama SMP/MTs asal","sekolah"],
          ["Tanggal Lahir","date","","tgl"]].map(([label,type,ph,key])=>(
          <div key={key} style={S.fg}>
            <label style={S.lbl}>{label}</label>
            <input style={S.inp} type={type} placeholder={ph} value={siswa[key]}
              onChange={e=>onChange({...siswa,[key]:e.target.value})} maxLength={key==="nisn"?10:undefined}/>
          </div>
        ))}
        <div style={S.fg}>
          <label style={S.lbl}>🎓 Jenjang / Program *</label>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:4}}>
            {JENJANG_LIST.map(j=>(
              <div key={j.id} onClick={()=>onChange({...siswa,jenjang:j.id})} style={{
                border:"2px solid "+(siswa.jenjang===j.id?"#3B82F6":"#1E293B"),
                background:siswa.jenjang===j.id?"#1E3A5F":"#0B1120",
                borderRadius:10,padding:"10px 14px",cursor:"pointer",
                display:"flex",alignItems:"center",gap:12,transition:"all 0.15s"
              }}>
                <span style={{fontSize:22}}>{j.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:siswa.jenjang===j.id?"#60A5FA":"#CBD5E1",fontSize:13}}>{j.label}</div>
                  <div style={{fontSize:11,color:"#475569",marginTop:1}}>{j.subtitle}</div>
                </div>
                {siswa.jenjang===j.id&&<span style={{color:"#3B82F6",fontWeight:900,fontSize:16}}>✓</span>}
              </div>
            ))}
          </div>
        </div>
        <button style={{...S.cta,width:"100%",marginTop:14,opacity:valid?1:0.4,cursor:valid?"pointer":"not-allowed"}}
          disabled={!valid} onClick={onLanjut}>Lanjutkan ke Asesmen →</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ASESMEN
// ══════════════════════════════════════════
function Asesmen({questions,current,answers,animIn,onAnswer,onNext,onPrev,onSelesai}) {
  const q = questions[current];
  const cat = CAT.find(c=>c.id===q.cat);
  const progress = (Object.keys(answers).length/questions.length)*100;
  const allDone  = Object.keys(answers).length===questions.length;
  const sudahJawab = answers[q.id] !== undefined;
  const isLast = current === questions.length - 1;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:700,margin:"0 auto"}}>
      <div style={{height:6,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
        <div style={{width:progress+"%",height:"100%",background:"linear-gradient(90deg,#3B82F6,#8B5CF6)",borderRadius:99,transition:"width 0.4s"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
        <span style={{color:"#94A3B8"}}>Soal {current+1} / {questions.length}</span>
        <span style={{color:cat.color,fontWeight:700}}>{cat.icon} {cat.label}</span>
        <span style={{color:"#94A3B8"}}>{Math.round(progress)}%</span>
      </div>
      <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:18,padding:28,
        opacity:animIn?1:0,transform:animIn?"translateY(0)":"translateY(8px)",transition:"all 0.18s"}}>
        <div style={{display:"inline-block",background:cat.color+"22",color:cat.color,borderRadius:20,padding:"3px 14px",fontSize:12,fontWeight:700,marginBottom:14}}>
          {cat.icon} {cat.label} — {q.grp}
        </div>
        <p style={{fontSize:18,fontWeight:700,lineHeight:1.55,color:"#E2E8F0",marginBottom:24}}>{q.text}</p>
        <div style={{display:"flex",gap:7}}>
          {SCALE.map(sc=>(
            <button key={sc.val} onClick={()=>onAnswer(q.id,sc.val)} style={{
              flex:1,border:"1px solid",borderRadius:12,padding:"9px 3px",cursor:"pointer",transition:"all 0.15s",
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              background:answers[q.id]===sc.val?cat.color:"#1E293B",
              borderColor:answers[q.id]===sc.val?cat.color:"#334155",
              color:answers[q.id]===sc.val?"#fff":"#94A3B8",
              transform:answers[q.id]===sc.val?"scale(1.06)":"scale(1)",
            }}>
              <span style={{fontSize:17,fontWeight:900}}>{sc.val}</span>
              <span style={{fontSize:9,textAlign:"center",lineHeight:1.3}}>{sc.label}</span>
            </button>
          ))}
        </div>
        {sudahJawab && !isLast && (
          <button
            style={{...S.cta,width:"100%",marginTop:16,fontSize:15}}
            onClick={onNext}
          >
            Lanjut →
          </button>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <button style={S.ghost} onClick={onPrev} disabled={current===0}>← Sebelumnya</button>
        <span style={{fontSize:11,color:"#475569"}}>
          {sudahJawab ? "Kamu bisa mengubah jawaban sebelum lanjut" : "Pilih salah satu jawaban"}
        </span>
        {allDone&&<button style={{...S.cta,padding:"9px 20px",fontSize:14}} onClick={onSelesai}>Lihat Hasil ✦</button>}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:3,justifyContent:"center"}}>
        {questions.map((qs,i)=>{
          const qc=CAT.find(c=>c.id===qs.cat);
          return <div key={qs.id} style={{width:8,height:8,borderRadius:2,transition:"all 0.15s",
            background:answers[qs.id]?qc.color:i===current?"#F59E0B":"#1E293B",
            border:i===current?"2px solid #F59E0B":"2px solid transparent"}}/>;
        })}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════
// KELOLA ADMIN
// ══════════════════════════════════════════
// PENGATURAN LOGO SEKOLAH
// ══════════════════════════════════════════
function PengaturanLogo({ auth, logoSekolah, onSaveLogo, tahunAjaran, onSaveTahun }) {
  const [preview, setPreview] = useState(logoSekolah || null);
  const [saving, setSaving] = useState(false);
  const [savingTahun, setSavingTahun] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgTahun, setMsgTahun] = useState("");
  const [tahunVal, setTahunVal] = useState(tahunAjaran || "");
  const fileRef = useRef();

  useEffect(() => { setPreview(logoSekolah || null); }, [logoSekolah]);
  useEffect(() => { setTahunVal(tahunAjaran || ""); }, [tahunAjaran]);

  // Generate pilihan tahun ajaran: 3 tahun ke belakang s/d 3 tahun ke depan
  const currentYear = new Date().getFullYear();
  const tahunOptions = Array.from({length: 7}, (_, i) => {
    const y = currentYear - 2 + i;
    return `${y}/${y+1}`;
  });

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setMsg("❌ Ukuran logo maks 500KB."); return; }
    if (!file.type.startsWith("image/")) { setMsg("❌ File harus berupa gambar."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setPreview(ev.target.result); setMsg(""); };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!preview) { setMsg("❌ Pilih logo terlebih dahulu."); return; }
    setSaving(true); setMsg("");
    try {
      await onSaveLogo(preview);
      setMsg("✅ Logo berhasil disimpan!");
    } catch(e) { setMsg("❌ Gagal simpan: " + e.message); }
    setSaving(false);
  }

  async function handleHapus() {
    if (!window.confirm("Hapus logo sekolah?")) return;
    setSaving(true);
    try {
      await onSaveLogo(null);
      setPreview(null);
      setMsg("✅ Logo dihapus.");
    } catch(e) { setMsg("❌ Gagal hapus: " + e.message); }
    setSaving(false);
  }

  async function handleSaveTahun() {
    if (!tahunVal) { setMsgTahun("❌ Pilih tahun ajaran."); return; }
    setSavingTahun(true); setMsgTahun("");
    try {
      await onSaveTahun(tahunVal);
      setMsgTahun("✅ Tahun ajaran disimpan!");
    } catch(e) { setMsgTahun("❌ Gagal simpan: " + e.message); }
    setSavingTahun(false);
  }

  return (
    <div style={{maxWidth:560,display:"flex",flexDirection:"column",gap:20}}>
      <h2 style={S.cardTitle}>🏫 Identitas Sekolah</h2>

      {/* ── Tahun Ajaran ── */}
      <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:14,padding:20}}>
        <div style={{fontWeight:700,fontSize:14,color:"#E2E8F0",marginBottom:4}}>📅 Tahun Ajaran PPDB</div>
        <div style={{fontSize:12,color:"#475569",marginBottom:14}}>Muncul di kop surat hasil cetak asesmen siswa.</div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <select
            value={tahunVal}
            onChange={e=>setTahunVal(e.target.value)}
            style={{...S.inp, width:"auto", minWidth:160, cursor:"pointer"}}
          >
            <option value="">-- Pilih Tahun --</option>
            {tahunOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button style={{...S.cta,padding:"9px 20px",fontSize:14,opacity:savingTahun?0.6:1}} onClick={handleSaveTahun} disabled={savingTahun}>
            {savingTahun?"Menyimpan...":"💾 Simpan"}
          </button>
        </div>
        {msgTahun && (
          <div style={{background:msgTahun.startsWith("✅")?"#052e16":"#450A0A",color:msgTahun.startsWith("✅")?"#4ade80":"#F87171",borderRadius:8,padding:"7px 12px",fontSize:13,marginTop:10}}>
            {msgTahun}
          </div>
        )}
      </div>

      {/* ── Logo Sekolah ── */}
      <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:14,padding:20}}>
        <div style={{fontWeight:700,fontSize:14,color:"#E2E8F0",marginBottom:4}}>🖼️ Logo Sekolah</div>
        <div style={{fontSize:12,color:"#475569",marginBottom:14}}>Format: JPG/PNG/WebP · Maks 500KB · Disarankan persegi (1:1).</div>
        <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
          {preview ? (
            <img src={preview} alt="Logo Sekolah"
              style={{width:90,height:90,objectFit:"contain",borderRadius:10,border:"2px solid #1E3A5F",background:"#fff",padding:5,flexShrink:0}} />
          ) : (
            <div style={{width:90,height:90,borderRadius:10,border:"2px dashed #334155",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:4,color:"#475569",flexShrink:0}}>
              <span style={{fontSize:28}}>🏫</span>
              <span style={{fontSize:10}}>Belum ada logo</span>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
            <button style={{...S.ghost,marginTop:0}} onClick={()=>fileRef.current.click()}>📁 Pilih Gambar</button>
            <button style={{...S.cta,padding:"9px 20px",fontSize:14,opacity:saving?0.6:1}} onClick={handleSave} disabled={saving}>
              {saving?"Menyimpan...":"💾 Simpan Logo"}
            </button>
            {preview && (
              <button style={{...S.ghost,marginTop:0,color:"#F87171",borderColor:"#F8717155"}} onClick={handleHapus} disabled={saving}>
                🗑 Hapus Logo
              </button>
            )}
          </div>
        </div>
        {msg && (
          <div style={{background:msg.startsWith("✅")?"#052e16":"#450A0A",color:msg.startsWith("✅")?"#4ade80":"#F87171",borderRadius:8,padding:"7px 12px",fontSize:13,marginTop:12}}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════
function KelolAdmin({ auth }) {
  const [adminList, setAdminList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ username:"", password:"", nama:"", email:"" });
  const [msg, setMsg]             = useState("");
  const [kuota, setKuota]         = useState(0);

  const paket = auth?.paket || "starter";
  const MAKS = { starter:1, growth:2, professional:4, enterprise:6, lifetime:null };
  const maksAdmin = MAKS[paket] ?? 1;

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const list = await getAdminSekolah(auth.school_id);
      const admins = list.filter(a => a.role === "admin");
      setAdminList(list);
      setKuota(admins.length);
    } catch(e) { setMsg("❌ Gagal memuat: " + e.message); }
    setLoading(false);
  }

  async function handleTambah() {
    if (!form.username || !form.password || !form.nama) { setMsg("❌ Nama, username & password wajib diisi."); return; }
    if (form.password.length < 6) { setMsg("❌ Password minimal 6 karakter."); return; }
    if (maksAdmin !== null && kuota >= maksAdmin) { setMsg(`❌ Paket ${paket} hanya bisa tambah ${maksAdmin} admin.`); return; }
    setLoading(true); setMsg("");
    try {
      const res = await tambahAdmin({
        schoolId: auth.school_id, username: form.username,
        password: form.password, nama: form.nama,
        email: form.email, dibuatOleh: auth.id,
      });
      if (res?.berhasil) {
        setMsg("✅ Admin berhasil ditambahkan!");
        setForm({ username:"", password:"", nama:"", email:"" });
        setShowForm(false);
        await load();
      } else { setMsg("❌ " + (res?.pesan || "Gagal.")); }
    } catch(e) { setMsg("❌ " + e.message); }
    setLoading(false);
  }

  async function handleHapus(adminId, nama) {
    if (!window.confirm(`Hapus admin "${nama}"?`)) return;
    setLoading(true);
    try {
      await hapusAdmin(adminId, auth.school_id);
      setMsg("✅ Admin dihapus.");
      await load();
    } catch(e) { setMsg("❌ " + e.message); }
    setLoading(false);
  }

  const sisaKuota = maksAdmin === null ? "∞" : maksAdmin - kuota;

  return (
    <div style={{maxWidth:680,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:800,color:"#E2E8F0",margin:0}}>👥 Kelola Admin</h2>
          <div style={{fontSize:12,color:"#475569",marginTop:4}}>
            Paket <b style={{color:"#60A5FA"}}>{paket}</b> · Sisa kuota:
            <b style={{color: sisaKuota===0?"#EF4444":"#4ade80",marginLeft:4}}>{sisaKuota} admin</b>
          </div>
        </div>
        {(maksAdmin===null||kuota<maksAdmin) && (
          <button style={{...S.cta,padding:"8px 16px",fontSize:13}} onClick={()=>{setShowForm(s=>!s);setMsg("");}}>
            {showForm?"✕ Batal":"➕ Tambah Admin"}
          </button>
        )}
      </div>

      {msg && (
        <div style={{background:msg.startsWith("✅")?"#052e16":"#2d0a0a",border:"1px solid "+(msg.startsWith("✅")?"#16a34a":"#ef4444"),borderRadius:10,padding:"10px 14px",fontSize:13,color:msg.startsWith("✅")?"#4ade80":"#f87171"}}>
          {msg}
        </div>
      )}

      {showForm && (
        <div style={{background:"#0F172A",border:"1px solid #1E3A5F",borderRadius:14,padding:20}}>
          <div style={{fontWeight:700,fontSize:14,color:"#60A5FA",marginBottom:14}}>➕ Tambah Admin Baru</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <label style={{fontSize:12,color:"#94A3B8",display:"block",marginBottom:5}}>Nama Lengkap *</label>
              <input style={{...S.inp}} placeholder="Nama admin" value={form.nama} onChange={e=>setForm({...form,nama:e.target.value})}/>
            </div>
            <div>
              <label style={{fontSize:12,color:"#94A3B8",display:"block",marginBottom:5}}>Email</label>
              <input style={{...S.inp}} type="email" placeholder="email@sekolah.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
            </div>
            <div>
              <label style={{fontSize:12,color:"#94A3B8",display:"block",marginBottom:5}}>Username *</label>
              <input style={{...S.inp}} placeholder="Username unik" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/>
            </div>
            <div>
              <label style={{fontSize:12,color:"#94A3B8",display:"block",marginBottom:5}}>Password *</label>
              <input style={{...S.inp}} type="password" placeholder="Min. 6 karakter" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
            </div>
          </div>
          <div style={{background:"#0B1120",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#475569",marginBottom:12}}>
            ℹ️ Admin tambahan bisa: lihat & input siswa, cetak PDF, edit kelas & soal. Tidak bisa: hapus siswa, setup sistem, kelola admin lain.
          </div>
          <button style={{...S.cta,width:"100%"}} onClick={handleTambah} disabled={loading}>
            {loading?"Menyimpan...":"Simpan Admin →"}
          </button>
        </div>
      )}

      {loading && !showForm ? (
        <div style={{textAlign:"center",color:"#475569",padding:24}}>Memuat...</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {adminList.map(a => (
            <div key={a.id} style={{background:"#0F172A",border:"1px solid "+(a.role==="admin_utama"?"#3B82F633":"#1E293B"),borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:38,height:38,borderRadius:10,background:a.role==="admin_utama"?"#1E3A5F":"#1E293B",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                {a.role==="admin_utama"?"👑":"👤"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:"#E2E8F0",fontSize:14}}>{a.nama}</div>
                <div style={{fontSize:12,color:"#475569",marginTop:2}}>@{a.username} {a.email?`· ${a.email}`:""}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <span style={{background:a.role==="admin_utama"?"#1E3A5F":"#1E293B",color:a.role==="admin_utama"?"#60A5FA":"#94A3B8",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>
                  {a.role==="admin_utama"?"Admin Utama":"Admin"}
                </span>
                {a.role==="admin" && (
                  <button style={{...S.ghost,padding:"4px 10px",fontSize:12,color:"#EF4444",borderColor:"#EF444433",marginTop:0}} onClick={()=>handleHapus(a.id,a.nama)}>
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// ASESMEN GAYA BELAJAR
// ══════════════════════════════════════════
function AsesmenGayaBelajar({questions,current,answers,animIn,onAnswer,onNext,onPrev,onSelesai}) {
  const q = questions[current];
  const cat = GAYA_BELAJAR_CAT.find(c=>c.id===q.cat);
  const progress = (Object.keys(answers).length/questions.length)*100;
  const allDone  = Object.keys(answers).length===questions.length;
  const sudahJawab = answers[q.id] !== undefined;
  const isLast = current === questions.length - 1;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:700,margin:"0 auto"}}>
      <div style={{background:"#0F172A",border:"1px solid #1E3A5F",borderRadius:12,padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>🧠</span>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:"#60A5FA"}}>Bagian 2 dari 2 — Gaya Belajar</div>
          <div style={{fontSize:11,color:"#475569"}}>Bantu kami memahami cara kamu belajar paling efektif</div>
        </div>
      </div>
      <div style={{height:6,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
        <div style={{width:progress+"%",height:"100%",background:"linear-gradient(90deg,#10B981,#3B82F6)",borderRadius:99,transition:"width 0.4s"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
        <span style={{color:"#94A3B8"}}>Soal {current+1} / {questions.length}</span>
        <span style={{color:cat.color,fontWeight:700}}>{cat.icon} {cat.label}</span>
        <span style={{color:"#94A3B8"}}>{Math.round(progress)}%</span>
      </div>
      <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:18,padding:28,
        opacity:animIn?1:0,transform:animIn?"translateY(0)":"translateY(8px)",transition:"all 0.18s"}}>
        <div style={{display:"inline-block",background:cat.color+"22",color:cat.color,borderRadius:20,padding:"3px 14px",fontSize:12,fontWeight:700,marginBottom:14}}>
          {cat.icon} {cat.label}
        </div>
        <p style={{fontSize:18,fontWeight:700,lineHeight:1.55,color:"#E2E8F0",marginBottom:24}}>{q.text}</p>
        <div style={{display:"flex",gap:7}}>
          {SCALE.map(sc=>(
            <button key={sc.val} onClick={()=>onAnswer(q.id,sc.val)} style={{
              flex:1,border:"1px solid",borderRadius:12,padding:"9px 3px",cursor:"pointer",transition:"all 0.15s",
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              background:answers[q.id]===sc.val?cat.color:"#1E293B",
              borderColor:answers[q.id]===sc.val?cat.color:"#334155",
              color:answers[q.id]===sc.val?"#fff":"#94A3B8",
              transform:answers[q.id]===sc.val?"scale(1.06)":"scale(1)",
            }}>
              <span style={{fontSize:17,fontWeight:900}}>{sc.val}</span>
              <span style={{fontSize:9,textAlign:"center",lineHeight:1.3}}>{sc.label}</span>
            </button>
          ))}
        </div>
        {sudahJawab && !isLast && (
          <button style={{...S.cta,width:"100%",marginTop:16,fontSize:15,background:"linear-gradient(135deg,#10B981,#3B82F6)"}} onClick={onNext}>
            Lanjut →
          </button>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <button style={S.ghost} onClick={onPrev} disabled={current===0}>← Sebelumnya</button>
        <span style={{fontSize:11,color:"#475569"}}>
          {sudahJawab ? "Kamu bisa mengubah jawaban sebelum lanjut" : "Pilih salah satu jawaban"}
        </span>
        {allDone&&<button style={{...S.cta,padding:"9px 20px",fontSize:14,background:"linear-gradient(135deg,#10B981,#3B82F6)"}} onClick={onSelesai}>Lihat Hasil ✦</button>}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:3,justifyContent:"center"}}>
        {questions.map((qs,i)=>{
          const qc=GAYA_BELAJAR_CAT.find(c=>c.id===qs.cat);
          return <div key={qs.id} style={{width:8,height:8,borderRadius:2,transition:"all 0.15s",
            background:answers[qs.id]?qc.color:i===current?"#F59E0B":"#1E293B",
            border:i===current?"2px solid #F59E0B":"2px solid transparent"}}/>;
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// HASIL
// ══════════════════════════════════════════
function Hasil({siswa,onBaru,onDaftar,auth,logoSekolah,tahunAjaran,kelasList}) {
  const top = siswa.top; const t0 = top[0];
  const gb  = siswa.gayaBelajar;
  const jurusan = siswa.jurusan || JURUSAN_PER_JENJANG["sma_x"];
  const jenjangInfo = JENJANG_LIST.find(j => j.id === siswa.jenjang);

  // Hitung skor kesesuaian mapel siswa dengan kelas yang ditetapkan (bukan skor bakat mentah)
  const kelasObj = (kelasList||[]).find(k => k.id === siswa.kelasId);
  const kesesuaianMapel = kelasObj
    ? (hitungKesesuaianMapel(top, kelasObj.mapel || []) ?? 0)
    : null;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18,maxWidth:860,margin:"0 auto"}}>
      <div style={{textAlign:"center",padding:"16px 0"}}>
        <div style={S.badge}>✦ Hasil Asesmen</div>
        <h2 style={{fontSize:28,fontWeight:900,margin:"10px 0 4px",color:"#E2E8F0"}}>{siswa.nama}</h2>
        <p style={{color:"#475569",fontSize:13,margin:0}}>{siswa.nisn} · {siswa.sekolah} · {siswa.tanggalAsesmen}</p>
      </div>
      {siswa.kelasNama && auth?.role==="panitia" &&(
        <div style={{background:siswa.kelasOverflow?"#F59E0B15":t0.color+"15",border:"2px solid "+(siswa.kelasOverflow?"#F59E0B88":t0.color+"55"),borderRadius:16,padding:"16px 22px",display:"flex",flexDirection:"column",gap:10}}>
          {siswa.kelasOverflow&&(
            <div style={{display:"flex",alignItems:"center",gap:8,background:"#F59E0B22",border:"1px solid #F59E0B66",borderRadius:10,padding:"8px 12px"}}>
              <span style={{fontSize:18}}>⚠️</span>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#D97706",marginBottom:2}}>KELAS MELEBIHI KAPASITAS — PERLU DITINJAU</div>
                <div style={{fontSize:11,color:"#92400E",lineHeight:1.5}}>
                  Siswa ini ditempatkan di kelas penuh karena kesesuaian mapelnya sangat tinggi ({kesesuaianMapel}%).
                  Panitia dapat memindahkan siswa ke kelas lain atau menambah kapasitas kelas ini.
                </div>
              </div>
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <span style={{fontSize:34}}>🏫</span>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:siswa.kelasOverflow?"#D97706":t0.color,fontWeight:700,letterSpacing:1,marginBottom:3}}>
                KELAS YANG DITETAPKAN{siswa.kelasOverflow?" (OVERFLOW)":""}
              </div>
              <div style={{fontSize:22,fontWeight:900,color:"#E2E8F0"}}>{siswa.kelasNama}</div>
              {kelasObj?.mapel?.length>0&&(
                <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
                  {kelasObj.mapel.map(mp=>(
                    <span key={mp} style={{fontSize:10,background:t0.color+"22",color:t0.color,borderRadius:20,padding:"2px 8px",fontWeight:600}}>{mp}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:"#475569",marginBottom:2}}>KESESUAIAN MAPEL</div>
              {kesesuaianMapel !== null
                ? <div style={{fontSize:24,fontWeight:900,color:siswa.kelasOverflow?"#F59E0B":t0.color}}>{kesesuaianMapel}%</div>
                : <div style={{fontSize:13,color:"#475569"}}>—</div>
              }
              {kesesuaianMapel !== null && kelasObj?.mapel?.length===0&&(
                <div style={{fontSize:10,color:"#F59E0B",marginTop:2}}>mapel belum diisi</div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="grid-top3">
        {top.map((t,i)=>(
          <div key={t.id} style={{background:"#0F172A",border:"2px solid "+t.color,borderRadius:16,padding:18,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <div style={{fontSize:10,fontWeight:800,color:"#475569",letterSpacing:2}}>#{i+1}</div>
            <div style={{fontSize:32}}>{t.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:t.color}}>{t.label}</div>
            <div style={{fontSize:26,fontWeight:900,color:t.color}}>{t.pct}%</div>
            <div style={{width:"100%",height:5,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
              <div style={{width:t.pct+"%",height:"100%",background:t.color,borderRadius:99}}/>
            </div>
            <div style={{width:"100%",marginTop:5}}>
              <div style={{fontSize:10,color:"#94A3B8",marginBottom:4}}>Rekomendasi:</div>
              {(jurusan[t.id]||[]).slice(0,3).map(j=>(
                <div key={j} style={{border:"1px solid "+t.color+"66",color:t.color,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600,marginBottom:3}}>{j}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <h3 style={S.cardTitle}>📊 Profil Lengkap</h3>
        <div style={{display:"flex",flexDirection:"column",gap:11,marginTop:12}}>
          {CAT.map(c=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{minWidth:186,fontSize:13,color:"#CBD5E1"}}>{c.icon} {c.label}</span>
              <div style={{flex:1,height:9,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
                <div style={{width:siswa.scores[c.id]+"%",height:"100%",background:c.color,borderRadius:99,transition:"width 1.2s"}}/>
              </div>
              <span style={{minWidth:34,textAlign:"right",fontSize:13,color:c.color,fontWeight:700}}>{siswa.scores[c.id]}%</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{...S.card,borderColor:t0.color+"55"}}>
        <h3 style={{...S.cardTitle,color:t0.color}}>📝 Analisis Psikologi Pendidikan</h3>
        <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:14}}>
          {(siswa.narasi||"").split("\n\n").map((para,i)=>(
            <p key={i} style={{color:"#CBD5E1",fontSize:14,lineHeight:1.9,margin:0,paddingLeft:14,borderLeft:"3px solid "+([t0.color,top[1]?.color,top[2]?.color][i]||t0.color+"66")}}>
              {para}
            </p>
          ))}
        </div>
      </div>
      <div style={{background:t0.color+"0D",border:"1px solid "+t0.color+"33",borderRadius:16,padding:20}}>
        <h3 style={{...S.cardTitle,color:t0.color}}>{t0.icon} Rekomendasi — {t0.label}</h3>
        {jenjangInfo&&<div style={{fontSize:12,color:"#475569",marginBottom:10}}>🎓 {jenjangInfo.label} · {jenjangInfo.subtitle}</div>}
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:6}}>
          {(jurusan[t0.id]||[]).map(j=>(
            <div key={j} style={{border:"1px solid "+t0.color+"55",background:t0.color+"22",color:t0.color,borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:600}}>✓ {j}</div>
          ))}
        </div>
      </div>
      {gb&&(
        <div style={{background:"#0F172A",border:"2px solid "+gb.color+"55",borderRadius:16,padding:20}}>
          <h3 style={{...S.cardTitle,color:gb.color}}>{gb.icon} Gaya Belajar Dominan — {gb.label}</h3>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12,marginBottom:16}}>
            {GAYA_BELAJAR_CAT.map(c=>(
              <div key={c.id} style={{flex:1,minWidth:100,background:"#0B1120",border:"1px solid "+c.color+(gb.dominan===c.id?"":"22"),borderRadius:12,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:20}}>{c.icon}</div>
                <div style={{fontSize:12,fontWeight:700,color:gb.dominan===c.id?c.color:"#475569",marginTop:4}}>{c.label}</div>
                <div style={{fontSize:16,fontWeight:900,color:gb.dominan===c.id?c.color:"#334155",marginTop:2}}>{gb.scores[c.id]}%</div>
              </div>
            ))}
          </div>
          <div style={{background:"#0B1120",borderRadius:12,padding:14}}>
            <div style={{fontSize:13,fontWeight:700,color:gb.color,marginBottom:10}}>💡 Tips Belajar untuk Gaya {gb.label}:</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {(gb.tips||[]).map((tip,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <span style={{color:gb.color,fontWeight:900,flexShrink:0}}>{i+1}.</span>
                  <span style={{fontSize:13,color:"#CBD5E1",lineHeight:1.6}}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",paddingBottom:8}}>
        {auth.role==="panitia"&&<button style={S.ghost} onClick={onDaftar}>← Data Siswa</button>}
        <button style={S.ghost} onClick={()=>doPrintSiswa(siswa, logoSekolah, auth?.namaSekolah, tahunAjaran)}>🖨 Cetak / PDF</button>
        <button style={S.cta} onClick={onBaru}>Asesmen Baru ✦</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
// ══════════════════════════════════════════
// KODE BANNER (tampil di dashboard sekolah)
// ══════════════════════════════════════════
function KodeBanner({kode, namaSekolah}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(kode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }
  return (
    <div style={{background:"linear-gradient(135deg,#1E3A5F,#0F172A)",border:"1px solid #1E3A5F",borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div style={{fontSize:32}}>🔑</div>
      <div style={{flex:1}}>
        <div style={{fontSize:12,color:"#60A5FA",fontWeight:700,marginBottom:2}}>KODE SEKOLAH — Bagikan ke calon siswa</div>
        <div style={{fontSize:28,fontWeight:900,color:"#E2E8F0",letterSpacing:4}}>{kode}</div>
        <div style={{fontSize:12,color:"#475569",marginTop:2}}>{namaSekolah} · Siswa wajib input kode ini sebelum asesmen</div>
      </div>
      <button
        onClick={copy}
        style={{background:copied?"#10B981":"#1E293B",border:"1px solid "+(copied?"#10B981":"#334155"),color:copied?"#fff":"#60A5FA",borderRadius:10,padding:"10px 20px",cursor:"pointer",fontSize:13,fontWeight:700,transition:"all 0.2s",whiteSpace:"nowrap"}}
      >
        {copied ? "✅ Tersalin!" : "📋 Salin Kode"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
function Dashboard({daftar,setDaftar,kelas,target,tab,setTab,questions,auth,maksSiswa,onDetail,onBaru,onExport,onSetupUlang,onSaveKelas,onDeleteKelas,onUpdateKelasSiswa,onRefresh,onBulkAssign,dbLoading,logoSekolah,onSaveLogo,tahunAjaran,onSaveTahun}) {
  const isUtama = auth?.role_admin === "admin_utama";
  if(tab==="data")  return <DaftarSiswa daftar={daftar} kelas={kelas} onDetail={onDetail} onBaru={onBaru} onExport={onExport} onUpdateKelasSiswa={onUpdateKelasSiswa} isUtama={isUtama} logoSekolah={logoSekolah} tahunAjaran={tahunAjaran} auth={auth} maksSiswa={maksSiswa}/>;
  if(tab==="soal")  return (
    <ManajemenSoal
      soal={questions}
      onAdd={async (s) => { await insertSoal(s, auth.school_id); await onRefresh(); }}
      onUpdate={async (id, s) => { await updateSoal(id, s); await onRefresh(); }}
      onDelete={async (id) => { await deleteSoal(id); await onRefresh(); }}
    />
  );
  if(tab==="kelas") return <ManajemenKelas kelas={kelas} daftar={daftar} setDaftar={setDaftar} target={target} onSaveKelas={onSaveKelas} onDeleteKelas={onDeleteKelas} onBulkAssign={onBulkAssign} dbLoading={dbLoading}/>;
  if(tab==="admin" && isUtama) return <KelolAdmin auth={auth}/>;
  if(tab==="logo"  && isUtama) return <PengaturanLogo auth={auth} logoSekolah={logoSekolah} onSaveLogo={onSaveLogo} tahunAjaran={tahunAjaran} onSaveTahun={onSaveTahun}/>;

  // ── Kuota siswa ──
  const kuotaPenuh  = maksSiswa !== null && daftar.length >= maksSiswa;
  const kuotaHampir = maksSiswa !== null && !kuotaPenuh && daftar.length >= Math.floor(maksSiswa * 0.9);
  const sisaKuota   = maksSiswa !== null ? maksSiswa - daftar.length : null;

  const counts={}; CAT.forEach(c=>counts[c.id]=0);
  daftar.forEach(s=>{if(s.top[0])counts[s.top[0].id]++;});
  const avg={};
  CAT.forEach(c=>{avg[c.id]=daftar.length?Math.round(daftar.reduce((s,x)=>s+x.scores[c.id],0)/daftar.length):0;});
  const totalKap=kelas.reduce((s,k)=>s+k.kapasitas,0);
  const topCat=daftar.length?CAT.find(c=>c.id===Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0])?.label||"-":"-";

  // Statistik per jenjang
  const statsPerJenjang = JENJANG_LIST.map(j => {
    const siswaj = daftar.filter(s => (s.jenjang||"sma_x") === j.id);
    const kelasj  = kelas.filter(k => (k.jenjang||"sma_x") === j.id);
    const kapj    = kelasj.reduce((s,k)=>s+k.kapasitas,0);
    const terisi  = siswaj.filter(s=>s.kelasId).length;
    const tgt     = target.perJenjang?.[j.id];
    return { ...j, jumlahSiswa: siswaj.length, kapasitas: kapj, terisi, kelasCount: kelasj.length, tgt };
  }).filter(j => j.jumlahSiswa > 0 || j.kelasCount > 0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      {auth?.kodeSekolah && (
        <KodeBanner kode={auth.kodeSekolah} namaSekolah={auth.namaSekolah} />
      )}

      {/* ── Banner kuota paket ── */}
      {kuotaPenuh && (
        <div style={{background:"#450A0A",border:"1px solid #EF444466",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>🔒</span>
            <div>
              <div style={{fontWeight:800,color:"#FCA5A5",fontSize:14}}>Kuota Paket Penuh</div>
              <div style={{fontSize:12,color:"#F87171"}}>Sudah {daftar.length}/{maksSiswa} siswa — tidak bisa tambah asesmen baru</div>
            </div>
          </div>
          <div style={{fontSize:12,color:"#FCA5A5",background:"#7F1D1D",borderRadius:8,padding:"6px 12px",fontWeight:700}}>
            Hubungi admin untuk upgrade paket
          </div>
        </div>
      )}
      {kuotaHampir && (
        <div style={{background:"#431407",border:"1px solid #F9731666",borderRadius:12,padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div style={{fontSize:13,color:"#FD9A6A"}}>
            Kuota hampir penuh — sisa <strong style={{color:"#FB923C"}}>{sisaKuota} siswa</strong> dari {maksSiswa} (paket aktif)
          </div>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={S.cardTitle}>Dashboard Sekolah PPDB</h2>
          <p style={{color:"#475569",fontSize:13,margin:0}}>Statistik real-time asesmen bakat & minat siswa
            {maksSiswa !== null && <span style={{color: kuotaPenuh?"#EF4444":kuotaHampir?"#F97316":"#475569"}}> · Kuota: {daftar.length}/{maksSiswa}</span>}
          </p>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button style={S.ghost} onClick={onRefresh} disabled={dbLoading}>🔄 {dbLoading?"Memuat...":"Refresh"}</button>
          {auth?.role_admin==="admin_utama" && (
            <button style={S.ghost} onClick={onSetupUlang}>⚙️ Setup Ulang</button>
          )}
          <button
            style={{...S.ghost, opacity: kuotaPenuh ? 0.45 : 1, cursor: kuotaPenuh ? "not-allowed" : "pointer",
              ...(kuotaPenuh ? {} : {}),
              borderColor: kuotaHampir ? "#F9731688" : undefined,
              color: kuotaHampir ? "#FB923C" : undefined,
            }}
            onClick={onBaru}
            disabled={kuotaPenuh}
            title={kuotaPenuh ? `Kuota penuh (${maksSiswa} siswa)` : undefined}
          >
            {kuotaPenuh ? "🔒 Kuota Penuh" : kuotaHampir ? `⚠️ + Asesmen Baru (sisa ${sisaKuota})` : "+ Asesmen Baru"}
          </button>
          <button style={{...S.cta,padding:"9px 16px",fontSize:14}} onClick={onExport} disabled={daftar.length===0}>📥 Excel</button>
        </div>
      </div>

      {/* ── Progress total ── */}
      <div style={{background:"#0F172A",border:"1px solid #1E3A5F",borderRadius:14,padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#E2E8F0"}}>🎯 Progress Penerimaan — Semua Jenjang</div>
            <div style={{fontSize:12,color:"#475569",marginTop:2}}>Target: {target.min}–{target.max} siswa · {kelas.length} kelas · {totalKap} kursi</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20,fontWeight:900,color:daftar.length>=target.min?"#10B981":"#3B82F6"}}>
              {daftar.length} <span style={{fontSize:13,color:"#475569"}}>/ {target.max}</span>
            </div>
          </div>
        </div>
        <div style={{height:11,background:"#1E293B",borderRadius:99,overflow:"hidden",position:"relative"}}>
          <div style={{width:Math.min((daftar.length/target.max)*100,100)+"%",height:"100%",borderRadius:99,transition:"width 0.6s",
            background:daftar.length>=target.max?"#EF4444":daftar.length>=target.min?"#10B981":"#3B82F6"}}/>
        </div>
      </div>

      {/* ── Progress per jenjang ── */}
      {statsPerJenjang.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:14,fontWeight:700,color:"#94A3B8"}}>📊 Progress Per Jenjang</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:10}}>
            {statsPerJenjang.map(j => {
              const pct = j.kapasitas > 0 ? Math.min(Math.round((j.jumlahSiswa/j.kapasitas)*100),100) : 0;
              const col = pct >= 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#10B981";
              return (
                <div key={j.id} style={{background:"#0B1120",border:"1px solid #1E293B",borderRadius:12,padding:14}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:20}}>{j.icon}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#E2E8F0"}}>{j.label}</div>
                        <div style={{fontSize:11,color:"#475569"}}>{j.kelasCount} kelas · {j.kapasitas} kursi</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:18,fontWeight:900,color:col}}>{j.jumlahSiswa}</div>
                      <div style={{fontSize:10,color:"#475569"}}>siswa</div>
                    </div>
                  </div>
                  <div style={{height:7,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
                    <div style={{width:pct+"%",height:"100%",background:col,borderRadius:99,transition:"width 0.6s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#475569",marginTop:4}}>
                    <span>Ditempatkan: {j.terisi}</span>
                    <span style={{color:col,fontWeight:700}}>{pct}% terisi</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid-stats4">
        {[["Total Peserta",daftar.length,"#3B82F6","👥"],
          ["Hari Ini",daftar.filter(s=>s.tanggalAsesmen===new Date().toLocaleDateString("id-ID",{dateStyle:"long"})).length,"#10B981","📅"],
          ["Bakat Terbanyak",topCat,"#8B5CF6","🏆"],
          ["Rata-rata",daftar.length?Math.round(CAT.reduce((s,c)=>s+avg[c.id],0)/CAT.length)+"%":"-","#F59E0B","📈"]
        ].map(([lbl,val,col,icon])=>(
          <div key={lbl} style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:14,padding:16}}>
            <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:col}}>{val}</div>
            <div style={{fontSize:12,color:"#475569",marginTop:3}}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h3 style={S.cardTitle}>🏫 Status Kelas</h3>
          <button style={S.ghost} onClick={()=>setTab("kelas")}>Kelola →</button>
        </div>
        <div className="grid-kelas">
          {kelas.map(k=>{
            const terisi=daftar.filter(s=>s.kelasId===k.id).length;
            const pct=Math.round((terisi/k.kapasitas)*100);
            const cat=CAT.find(c=>c.id===k.bidang);
            const col=pct>=100?"#EF4444":pct>=80?"#F59E0B":cat?.color||"#3B82F6";
            // Hitung berapa siswa di kelas ini yang pilih mapel yang tersedia
            const siswaDiKelas = daftar.filter(s=>s.kelasId===k.id);
            const mapelList = k.mapel || [];
            return (
              <div key={k.id} style={{background:"#0B1120",border:"1px solid "+col+"44",borderRadius:12,padding:13}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#E2E8F0"}}>{k.nama}</span>
                  <span style={{fontSize:11,fontWeight:800,color:col}}>{pct>=100?"PENUH":pct>=80?"HAMPIR":"TERSEDIA"}</span>
                </div>
                <div style={{height:7,background:"#1E293B",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                  <div style={{width:Math.min(pct,100)+"%",height:"100%",background:col,borderRadius:99}}/>
                </div>
                <div style={{fontSize:11,color:"#475569",marginBottom:mapelList.length>0?6:0}}>{cat?.icon} {terisi}/{k.kapasitas} ({pct}%)</div>
                {mapelList.length>0&&(
                  <div style={{borderTop:"1px solid #1E293B",paddingTop:6,marginTop:2}}>
                    <div style={{fontSize:10,color:"#475569",fontWeight:700,marginBottom:5}}>📚 MAPEL PILIHAN</div>
                    {mapelList.map((mp,mi)=>{
                      // Hitung seberapa cocok bakat siswa di kelas ini dengan mapel
                      const totalSiswa = siswaDiKelas.length;
                      const matchSkor = totalSiswa > 0
                        ? Math.round(siswaDiKelas.reduce((sum,s)=>{
                            const top3Labels = s.top.map(t=>t.label.toLowerCase());
                            const mpLow = mp.toLowerCase();
                            const hit = top3Labels.some(l=>mpLow.includes(l.split(" ")[0].toLowerCase())||l.includes(mpLow.split(" ")[0].toLowerCase()));
                            return sum + (hit ? 1 : 0);
                          }, 0) / totalSiswa * 100)
                        : null;
                      return (
                        <div key={mi} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                          <span style={{flex:1,fontSize:11,color:"#CBD5E1",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{mp}</span>
                          {matchSkor!==null&&(
                            <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                              <div style={{width:40,height:5,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
                                <div style={{width:matchSkor+"%",height:"100%",background:matchSkor>=60?cat?.color||"#3B82F6":"#475569",borderRadius:99}}/>
                              </div>
                              <span style={{fontSize:10,color:matchSkor>=60?cat?.color||"#60A5FA":"#475569",fontWeight:700,minWidth:26}}>{matchSkor}%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {terisi===0&&<div style={{fontSize:10,color:"#334155",fontStyle:"italic"}}>Belum ada siswa untuk perbandingan</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div style={S.card}>
        <h3 style={S.cardTitle}>Distribusi Bakat</h3>
        <div style={{display:"flex",flexDirection:"column",gap:11,marginTop:12}}>
          {CAT.map(c=>{
            const pct=daftar.length?Math.round((counts[c.id]/daftar.length)*100):0;
            return (
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:10}}>
                <span className="dist-label">{c.icon} {c.label}</span>
                <div style={{flex:1,height:12,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
                  <div style={{width:pct+"%",height:"100%",background:c.color,borderRadius:99,transition:"width 1s"}}/>
                </div>
                <span style={{minWidth:68,textAlign:"right",fontSize:12,color:"#94A3B8"}}>{counts[c.id]} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
      {daftar.length>0?(
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h3 style={S.cardTitle}>5 Asesmen Terbaru</h3>
            <button style={S.ghost} onClick={()=>setTab("data")}>Lihat Semua →</button>
          </div>
          <div className="tbl-wrap"><table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Nama","NISN","Bakat Utama","Kelas","Skor",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {[...daftar].reverse().slice(0,5).map(s=>{
                const t=s.top[0]; const k=kelas.find(x=>x.id===s.kelasId);
                return (
                  <tr key={s.id} style={S.tr}>
                    <td style={{...S.td,fontWeight:600,color:"#E2E8F0"}}>{s.nama}</td>
                    <td style={S.td}>{s.nisn}</td>
                    <td style={S.td}><span style={{border:"1px solid "+t.color+"66",color:t.color,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{t.icon} {t.label}</span></td>
                    <td style={{...S.td,color:"#60A5FA"}}>{k?.nama||"-"}</td>
                    <td style={{...S.td,color:t.color,fontWeight:700}}>{t.pct}%</td>
                    <td style={S.td}><button style={S.detBtn} onClick={()=>onDetail(s)}>Detail</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      ):(
        <div style={{textAlign:"center",padding:56,background:"#0F172A",borderRadius:16,border:"1px solid #1E293B"}}>
          <div style={{fontSize:42,marginBottom:10}}>📋</div>
          <p style={{color:"#475569"}}>Belum ada data. Mulai rekam siswa pertama!</p>
          <button style={{...S.cta,marginTop:14}} onClick={onBaru}>Mulai Asesmen Pertama</button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// MANAJEMEN KELAS
// ══════════════════════════════════════════

// Komponen input mata pelajaran per kelas
// ── Daftar mapel pilihan sekolah (sesuai konfigurasi kelas XI) ──
const MAPEL_OPTIONS = [
  { id: "mat_lanjut",  label: "Matematika Lanjut" },
  { id: "matematika",  label: "Matematika" },
  { id: "fisika",      label: "Fisika" },
  { id: "biologi",     label: "Biologi" },
  { id: "sosiologi",   label: "Sosiologi" },
  { id: "bing_l",      label: "Bahasa Inggris Lanjutan" },
  { id: "informatika", label: "Informatika" },
  { id: "jerman",      label: "Bahasa Jerman" },
  { id: "geografi",    label: "Geografi" },
];

function MapelEditor({ mapel, onChange }) {
  const list = mapel || [];
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");

  function toggle(label) {
    if (list.includes(label)) onChange(list.filter(mp => mp !== label));
    else onChange([...list, label]);
  }

  function tambahCustom() {
    const val = customInput.trim();
    if (!val || list.includes(val)) return;
    onChange([...list, val]);
    setCustomInput("");
  }

  // mapel kustom = yang tidak ada di MAPEL_OPTIONS
  const customMapel = list.filter(mp => !MAPEL_OPTIONS.some(o => o.label === mp));

  return (
    <div style={{marginTop:4}}>
      <label style={S.lbl}>📚 Mata Pelajaran Pilihan</label>
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",
        gap:5,
        marginBottom:8,
        background:"#0B1829",
        borderRadius:10,
        padding:"10px 12px",
        border:"1px solid #1E293B",
      }}>
        {MAPEL_OPTIONS.map(opt => {
          const checked = list.includes(opt.label);
          return (
            <label key={opt.id} style={{
              display:"flex",alignItems:"center",gap:8,cursor:"pointer",
              padding:"6px 8px",borderRadius:8,
              background: checked ? "#1E3A5F" : "transparent",
              border: checked ? "1px solid #3B82F6" : "1px solid transparent",
              transition:"all 0.15s",
            }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt.label)}
                style={{width:15,height:15,accentColor:"#3B82F6",cursor:"pointer",flexShrink:0}}
              />
              <span style={{fontSize:13,fontWeight:checked?700:400,color:checked?"#60A5FA":"#94A3B8"}}>
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>

      {/* Mapel kustom yang sudah tersimpan */}
      {customMapel.length > 0 && (
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:7}}>
          {customMapel.map((mp,i) => (
            <span key={i} style={{background:"#1E3A5F",color:"#60A5FA",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5}}>
              {mp}
              <button onClick={()=>onChange(list.filter(x=>x!==mp))} style={{background:"none",border:"none",color:"#94A3B8",cursor:"pointer",padding:0,lineHeight:1,fontSize:13}}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Tambah mapel di luar daftar */}
      {!showCustom ? (
        <button style={{...S.ghost,padding:"5px 12px",fontSize:12,color:"#64748B",borderColor:"#1E293B"}} onClick={()=>setShowCustom(true)}>
          + Mapel lainnya…
        </button>
      ) : (
        <div style={{display:"flex",gap:6,alignItems:"center",marginTop:4}}>
          <input
            style={{...S.inp,padding:"6px 10px",fontSize:13}}
            placeholder="Nama mapel lain…"
            value={customInput}
            autoFocus
            onChange={e=>setCustomInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&tambahCustom()}
          />
          <button style={{...S.cta,padding:"6px 12px",fontSize:13,whiteSpace:"nowrap"}} onClick={tambahCustom} disabled={!customInput.trim()}>+ Tambah</button>
          <button style={{...S.ghost,padding:"6px 10px",fontSize:13}} onClick={()=>{setShowCustom(false);setCustomInput("");}}>Batal</button>
        </div>
      )}

      {list.length === 0 && (
        <div style={{fontSize:11,color:"#475569",marginTop:4}}>Belum ada mata pelajaran dipilih</div>
      )}
    </div>
  );
}

function ManajemenKelas({kelas,daftar,setDaftar,target,onSaveKelas,onDeleteKelas,onBulkAssign,dbLoading}) {
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({});
  const [showAdd,setShowAdd]=useState(false);
  const [newK,setNewK]=useState({nama:"",bidang:"sains",kapasitas:30,wali:"",mapel:[],jenjang:"sma_x"});
  const [expandMapel,setExpandMapel]=useState({});
  const [exportKelasId,setExportKelasId]=useState("__semua__");
  const totalKap=kelas.reduce((s,k)=>s+k.kapasitas,0);
  const totalTerisi=daftar.filter(s=>s.kelasId).length;
  const belum=daftar.filter(s=>!s.kelasId).length;
  const tMin=target?.min||0; const tMax=target?.max||totalKap;

  // Kelompokkan kelas per jenjang
  const kelasByJenjang = JENJANG_LIST.reduce((acc, j) => {
    acc[j.id] = kelas.filter(k => (k.jenjang || "sma_x") === j.id);
    return acc;
  }, {});
  const jenjangAktif = JENJANG_LIST.filter(j => kelasByJenjang[j.id].length > 0 || true);

  async function save(){ const updated=kelas.map(k=>k.id===editId?{...k,...form,kapasitas:parseInt(form.kapasitas)||30}:k); await onSaveKelas(updated); setEditId(null); }
  async function del(kid){ if(!window.confirm("Hapus kelas?"))return; await onDeleteKelas(kid); setDaftar(prev=>prev.map(s=>s.kelasId===kid?{...s,kelasId:null,kelasNama:null}:s)); }
  async function add(){ const newKelas=[...kelas,{...newK,id:"k"+Date.now(),kapasitas:parseInt(newK.kapasitas)||30}]; await onSaveKelas(newKelas); setNewK({nama:"",bidang:"sains",kapasitas:30,wali:"",mapel:[],jenjang:"sma_x"}); setShowAdd(false); }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={S.cardTitle}>🏫 Manajemen Kelas</h2>
          <p style={{color:"#475569",fontSize:13,margin:0}}>{kelas.length} kelas · {totalKap} kursi · target {tMin}–{tMax}</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {belum > 0 && (
            <button
              style={{
                ...S.cta,
                background:"linear-gradient(135deg,#10B981,#059669)",
                boxShadow:"0 0 12px #10B98144",
                display:"flex",alignItems:"center",gap:7,
                opacity:dbLoading?0.6:1,
              }}
              onClick={onBulkAssign}
              disabled={dbLoading}
            >
              🎯 Proses Penempatan
              <span style={{background:"#ffffff33",borderRadius:99,padding:"1px 8px",fontSize:11,fontWeight:800}}>
                {belum} siswa
              </span>
            </button>
          )}
          <button style={S.cta} onClick={()=>setShowAdd(!showAdd)}>+ Tambah Kelas</button>
          {totalTerisi > 0 && (
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <select
                value={exportKelasId}
                onChange={e=>setExportKelasId(e.target.value)}
                style={{...S.inp,padding:"7px 10px",fontSize:13,minWidth:120,cursor:"pointer"}}
              >
                <option value="__semua__">Semua Kelas</option>
                {kelas.map(k=>(
                  <option key={k.id} value={k.id}>
                    {k.nama} ({daftar.filter(s=>s.kelasId===k.id).length} siswa)
                  </option>
                ))}
              </select>
              <button
                style={{...S.ghost,padding:"7px 13px",fontSize:13,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}
                onClick={()=>{
                  const target = exportKelasId==="__semua__" ? kelas : kelas.filter(k=>k.id===exportKelasId);
                  doExcelExportPerKelas(daftar, target);
                }}
              >
                Download Excel
              </button>
            </div>
          )}
        </div>
      </div>
      <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:14,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}>
          <span style={{color:"#94A3B8"}}>Ditempatkan: <strong style={{color:"#60A5FA"}}>{totalTerisi}/{totalKap}</strong></span>
          <span style={{color:"#94A3B8"}}>Target: <strong style={{color:"#10B981"}}>{tMin}–{tMax}</strong></span>
        </div>
        <div style={{height:9,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
          <div style={{width:Math.min((totalTerisi/(tMax||1))*100,100)+"%",height:"100%",background:"linear-gradient(90deg,#3B82F6,#10B981)",borderRadius:99}}/>
        </div>
        {belum>0&&<div style={{marginTop:8,background:"#451A03",borderRadius:7,padding:"6px 10px",fontSize:12,color:"#F97316"}}>⚠️ {belum} siswa belum mendapat kelas</div>}
      </div>

      {showAdd&&(
        <div style={{...S.card,borderColor:"#3B82F655"}}>
          <h3 style={S.cardTitle}>Tambah Kelas Baru</h3>
          {/* Pilih Jenjang */}
          <div style={S.fg}>
            <label style={S.lbl}>🎓 Jenjang</label>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:4}}>
              {JENJANG_LIST.map(j=>(
                <div key={j.id} onClick={()=>setNewK({...newK,jenjang:j.id})} style={{
                  border:"2px solid "+(newK.jenjang===j.id?"#3B82F6":"#1E293B"),
                  background:newK.jenjang===j.id?"#1E3A5F":"#0B1120",
                  borderRadius:10,padding:"8px 14px",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:8,transition:"all 0.15s"
                }}>
                  <span style={{fontSize:18}}>{j.icon}</span>
                  <span style={{fontWeight:700,color:newK.jenjang===j.id?"#60A5FA":"#CBD5E1",fontSize:13}}>{j.label}</span>
                  {newK.jenjang===j.id&&<span style={{color:"#3B82F6",fontWeight:900}}>✓</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="grid-soal-kelas">
            <div style={S.fg}><label style={S.lbl}>Nama Kelas</label><input style={S.inp} value={newK.nama} onChange={e=>setNewK({...newK,nama:e.target.value})} placeholder="XI-1"/></div>
            <div style={S.fg}><label style={S.lbl}>Kapasitas</label><input style={S.inp} type="number" value={newK.kapasitas} onChange={e=>setNewK({...newK,kapasitas:e.target.value})}/></div>
            <div style={S.fg}><label style={S.lbl}>Bidang</label><select style={S.inp} value={newK.bidang} onChange={e=>setNewK({...newK,bidang:e.target.value})}>{CAT.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
            <div style={S.fg}><label style={S.lbl}>Wali Kelas</label><input style={S.inp} value={newK.wali} onChange={e=>setNewK({...newK,wali:e.target.value})}/></div>
          </div>
          {newK.jenjang !== "sma_x" && (
            <div style={{gridColumn:"1/-1"}}><MapelEditor mapel={newK.mapel} onChange={v=>setNewK({...newK,mapel:v})}/></div>
          )}
          <div style={{display:"flex",gap:8,marginTop:8}}><button style={S.cta} onClick={add} disabled={!newK.nama}>Tambah</button><button style={S.ghost} onClick={()=>setShowAdd(false)}>Batal</button></div>
        </div>
      )}

      {/* ── Kelas dikelompokkan per jenjang ── */}
      {JENJANG_LIST.map(j => {
        const kelasList = kelasByJenjang[j.id] || [];
        const kapJenjang = kelasList.reduce((s,k)=>s+k.kapasitas,0);
        const terisiJenjang = daftar.filter(s=>s.kelasId && kelasList.some(k=>k.id===s.kelasId)).length;
        const pctJenjang = kapJenjang > 0 ? Math.round((terisiJenjang/kapJenjang)*100) : 0;
        return (
          <div key={j.id} style={{display:"flex",flexDirection:"column",gap:10}}>
            {/* Header jenjang */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 16px",background:"#0B1120",borderRadius:12,border:"1px solid #1E293B"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{j.icon}</span>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:"#E2E8F0"}}>{j.label}</div>
                  <div style={{fontSize:11,color:"#475569"}}>{j.subtitle}</div>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:12,color:"#60A5FA",fontWeight:700}}>{kelasList.length} kelas · {kapJenjang} kursi</div>
                <div style={{fontSize:11,color:"#475569",marginTop:2}}>Terisi: {terisiJenjang} ({pctJenjang}%)</div>
              </div>
            </div>

            {kelasList.length === 0 ? (
              <div style={{textAlign:"center",padding:"20px",background:"#0F172A",borderRadius:12,border:"1px dashed #1E293B",color:"#334155",fontSize:13}}>
                Belum ada kelas untuk jenjang ini. Klik "Tambah Kelas" di atas.
              </div>
            ) : (
              <div className="grid-kelas-tab">
                {kelasList.map(k=>{
                  const terisi=daftar.filter(s=>s.kelasId===k.id).length;
                  const pct=Math.round((terisi/k.kapasitas)*100);
                  const cat=CAT.find(c=>c.id===k.bidang);
                  const col=pct>=100?"#EF4444":pct>=80?"#F59E0B":cat?.color||"#3B82F6";
                  const isEd=editId===k.id;
                  return (
                    <div key={k.id} style={{background:"#0F172A",border:"1px solid "+col+"44",borderRadius:14,padding:15,display:"flex",flexDirection:"column",gap:8}}>
                      {isEd?(
                        <>
                          {/* Edit jenjang */}
                          <div style={S.fg}>
                            <label style={S.lbl}>Jenjang</label>
                            <select style={S.inp} value={form.jenjang||"sma_x"} onChange={e=>setForm({...form,jenjang:e.target.value})}>
                              {JENJANG_LIST.map(j=><option key={j.id} value={j.id}>{j.icon} {j.label}</option>)}
                            </select>
                          </div>
                          <input style={S.inp} value={form.nama||""} onChange={e=>setForm({...form,nama:e.target.value})}/>
                          <select style={S.inp} value={form.bidang||"sains"} onChange={e=>setForm({...form,bidang:e.target.value})}>{CAT.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
                          <input style={S.inp} type="number" value={form.kapasitas||30} onChange={e=>setForm({...form,kapasitas:e.target.value})}/>
                          <input style={S.inp} value={form.wali||""} onChange={e=>setForm({...form,wali:e.target.value})} placeholder="Wali kelas"/>
                          {(form.jenjang||"sma_x") !== "sma_x" && (
                            <MapelEditor mapel={form.mapel||[]} onChange={v=>setForm({...form,mapel:v})}/>
                          )}
                          <div style={{display:"flex",gap:6,marginTop:4}}>
                            <button style={{...S.cta,padding:"6px 13px",fontSize:12,opacity:dbLoading?0.6:1}} onClick={save} disabled={dbLoading}>✓ Simpan</button>
                            <button style={{...S.ghost,padding:"6px 11px",fontSize:12}} onClick={()=>setEditId(null)}>Batal</button>
                          </div>
                        </>
                      ):(
                        <>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div>
                              <div style={{fontSize:14,fontWeight:800,color:"#E2E8F0"}}>{k.nama}</div>
                              <div style={{fontSize:12,color:cat?.color,marginTop:2}}>{cat?.icon} {cat?.label}</div>
                            </div>
                            <span style={{fontSize:11,fontWeight:800,color:col}}>{pct>=100?"PENUH 🔴":pct>=80?"HAMPIR 🟡":"TERSEDIA 🟢"}</span>
                          </div>
                          <div style={{height:7,background:"#1E293B",borderRadius:99,overflow:"hidden"}}><div style={{width:Math.min(pct,100)+"%",height:"100%",background:col,borderRadius:99}}/></div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{color:"#94A3B8"}}>{terisi}/{k.kapasitas}</span><span style={{color:col,fontWeight:700}}>{pct}%</span></div>
                          {k.wali&&<div style={{fontSize:11,color:"#475569"}}>👤 {k.wali}</div>}
                          {k.mapel&&k.mapel.length>0&&(
                            <div>
                              <div style={{fontSize:10,color:"#475569",marginBottom:4,fontWeight:700}}>📚 MAPEL PILIHAN ({k.mapel.length})</div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                {k.mapel.map((mp,i)=>(
                                  <span key={i} style={{background:"#1E3A5F",color:"#60A5FA",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600}}>{mp}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{display:"flex",gap:6,marginTop:2}}>
                            <button style={{...S.ghost,flex:1,padding:"5px",fontSize:12}} onClick={()=>{setEditId(k.id);setForm({...k});}}>✏️ Edit</button>
                            <button style={{...S.ghost,padding:"5px 9px",fontSize:12,color:"#EF4444",borderColor:"#EF444433"}} onClick={()=>del(k.id)}>🗑</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════
// DAFTAR SISWA
// ══════════════════════════════════════════
function DaftarSiswa({daftar,kelas,onDetail,onBaru,onExport,onUpdateKelasSiswa,isUtama,logoSekolah,tahunAjaran,auth,maksSiswa}) {
  const kuotaPenuh = maksSiswa !== null && daftar.length >= maksSiswa;
  const [search,setSearch]=useState("");
  const [fCat,setFCat]=useState("all");
  const [fKelas,setFKelas]=useState("all");
  const filtered=daftar.filter(s=>{
    const ms=s.nama.toLowerCase().includes(search.toLowerCase())||s.nisn.includes(search)||s.sekolah.toLowerCase().includes(search.toLowerCase());
    const mc=fCat==="all"||s.top[0]?.id===fCat;
    const mk=fKelas==="all"||(fKelas==="none"?!s.kelasId:s.kelasId===fKelas);
    return ms&&mc&&mk;
  }).sort((a,b)=>(b.top?.[0]?.pct??0)-(a.top?.[0]?.pct??0));
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div><h2 style={S.cardTitle}>Data Peserta Asesmen</h2><p style={{color:"#475569",fontSize:13,margin:0}}>{daftar.length} siswa · {filtered.length} ditampilkan</p></div>
        <div style={{display:"flex",gap:7}}>
          <button style={{...S.ghost, opacity: kuotaPenuh?0.45:1, cursor: kuotaPenuh?"not-allowed":"pointer"}} onClick={onBaru} disabled={kuotaPenuh} title={kuotaPenuh?`Kuota penuh (${maksSiswa} siswa)`:undefined}>
            {kuotaPenuh ? "🔒 Kuota Penuh" : "+ Siswa Baru"}
          </button>
          <button style={{...S.cta,padding:"8px 14px",fontSize:13}} onClick={onExport} disabled={daftar.length===0}>📥 Excel</button>
          <button style={S.ghost} onClick={()=>daftar.forEach(s=>doPrintSiswa(s, logoSekolah, auth?.namaSekolah, tahunAjaran, true))} disabled={daftar.length===0}>🖨 Cetak</button>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <input style={{...S.inp,maxWidth:240,padding:"8px 11px"}} placeholder="🔍 Cari nama/NISN/sekolah..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select style={{...S.inp,maxWidth:185,padding:"8px 11px"}} value={fCat} onChange={e=>setFCat(e.target.value)}>
          <option value="all">Semua Bidang</option>{CAT.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        <select style={{...S.inp,maxWidth:165,padding:"8px 11px"}} value={fKelas} onChange={e=>setFKelas(e.target.value)}>
          <option value="all">Semua Kelas</option><option value="none">Belum Ada Kelas</option>{kelas.map(k=><option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>
      {filtered.length===0?(
        <div style={{textAlign:"center",padding:52,background:"#0F172A",borderRadius:16,border:"1px solid #1E293B"}}>
          <div style={{fontSize:34,marginBottom:8}}>🔍</div><p style={{color:"#475569"}}>Tidak ada data yang sesuai.</p>
        </div>
      ):(
        <div className="tbl-wrap" style={{background:"#0F172A"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["No","Nama","NISN","Sekolah","Bakat Utama","Skor","Kelas","Aksi"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((s,i)=>{
                const t=s.top[0]; const k=kelas.find(x=>x.id===s.kelasId);
                return (
                  <tr key={s.id} style={S.tr}>
                    <td style={S.td}>{i+1}</td>
                    <td style={{...S.td,fontWeight:600,color:"#E2E8F0"}}>{s.nama}</td>
                    <td style={S.td}>{s.nisn}</td>
                    <td style={S.td}>{s.sekolah}</td>
                    <td style={S.td}><span style={{border:"1px solid "+t.color+"66",color:t.color,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600,display:"inline-block"}}>{t.icon} {t.label}</span></td>
                    <td style={{...S.td,color:t.color,fontWeight:700}}>{t.pct}%</td>
                    <td style={S.td}>
                      {(() => {
                        const jenjangSiswa = s.jenjang || "sma_x";
                        // Kandidat: kelas sesuai jenjang siswa
                        const kelasFiltred = kelas.filter(kx => !kx.jenjang || kx.jenjang === jenjangSiswa);
                        const kelasCandidates = kelasFiltred.length > 0 ? kelasFiltred : kelas;
                        // Pastikan kelas yang sudah ter-assign selalu masuk list meski tidak ada di filter
                        const assignedKelas = s.kelasId && !kelasCandidates.find(kx=>kx.id===s.kelasId)
                          ? kelas.find(kx=>kx.id===s.kelasId) : null;
                        const allOptions = assignedKelas ? [assignedKelas, ...kelasCandidates] : kelasCandidates;
                        const k = kelas.find(x=>x.id===s.kelasId);
                        return (
                          <select style={{background:"#1E293B",border:"1px solid #334155",color:k?"#60A5FA":"#EF4444",borderRadius:8,padding:"4px 7px",fontSize:12,cursor:"pointer"}}
                            value={s.kelasId||""} onChange={e=>{const kid=e.target.value||null;const kn=kelas.find(x=>x.id===kid)?.nama||null;onUpdateKelasSiswa(s.id,kid,kn);}}>
                            <option value="">— Pilih —</option>
                            {[...allOptions]
                              .map(kx=>({
                                ...kx,
                                terisi:daftar.filter(ss=>ss.kelasId===kx.id).length,
                                skor:hitungKesesuaianMapel(s.top, kx.mapel||[]),
                              }))
                              .sort((a,b)=>(b.skor||0)-(a.skor||0))
                              .map(kx=>{
                                const penuh=kx.terisi>=kx.kapasitas&&s.kelasId!==kx.id;
                                const skorLabel=kx.skor!==null?` [cocok ${kx.skor}%]`:"";
                                return <option key={kx.id} value={kx.id} disabled={penuh}>{kx.nama} ({kx.terisi}/{kx.kapasitas}){skorLabel}{penuh?" PENUH":""}</option>;
                              })
                            }
                          </select>
                        );
                      })()}
                    </td>
                    <td style={S.td}>
                      <div style={{display:"flex",gap:5}}>
                        <button style={S.detBtn} onClick={()=>onDetail(s)}>Detail</button>
                        <button style={{...S.detBtn,color:"#10B981",borderColor:"#10B98155"}} onClick={()=>doPrintSiswa(s, logoSekolah, auth?.namaSekolah, tahunAjaran, true)}>PDF</button>
                        {isUtama && (
                          <button style={{...S.detBtn,color:"#EF4444",borderColor:"#EF444433"}}
                            onClick={async()=>{ if(!window.confirm("Hapus siswa ini?"))return; await deleteSiswa(s.id); setDaftar(p=>p.filter(x=>x.id!==s.id)); }}>🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// MANAJEMEN SOAL
// ══════════════════════════════════════════
function ManajemenSoal({ soal, onAdd, onUpdate, onDelete }) {
  const [fCat, setFCat] = useState("all");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newSoal, setNewSoal] = useState({ cat: "logika", grp: "", text: "" });
  const [loading, setLoading] = useState(false);
  const filtered = soal.filter(s => fCat === "all" || s.cat === fCat);
  async function handleUpdate() { setLoading(true); await onUpdate(editId, editForm); setEditId(null); setLoading(false); }
  async function handleAdd() { if (!newSoal.text || !newSoal.grp) return; setLoading(true); await onAdd(newSoal); setNewSoal({ cat: "logika", grp: "", text: "" }); setShowAdd(false); setLoading(false); }
  async function handleDelete(id) { if (!window.confirm("Hapus soal ini?")) return; setLoading(true); await onDelete(id); setLoading(false); }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div><h2 style={S.cardTitle}>📝 Manajemen Bank Soal</h2><p style={{ color: "#475569", fontSize: 13, margin: 0 }}>{soal.length} soal aktif</p></div>
        <button style={S.cta} onClick={() => setShowAdd(!showAdd)}>+ Tambah Soal</button>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <button style={{ ...S.ghost, ...(fCat === "all" ? S.navAct : {}) }} onClick={() => setFCat("all")}>Semua ({soal.length})</button>
        {CAT.map(c => (
          <button key={c.id} style={{ ...S.ghost, ...(fCat === c.id ? { background: c.color + "22", color: c.color, borderColor: c.color + "55" } : {}) }} onClick={() => setFCat(c.id)}>
            {c.icon} {c.label} ({soal.filter(s => s.cat === c.id).length})
          </button>
        ))}
      </div>
      {showAdd && (
        <div style={{ ...S.card, borderColor: "#3B82F655" }}>
          <h3 style={S.cardTitle}>Tambah Soal Baru</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginTop: 12 }}>
            <div style={S.fg}><label style={S.lbl}>Kategori</label><select style={S.inp} value={newSoal.cat} onChange={e => setNewSoal({ ...newSoal, cat: e.target.value })}>{CAT.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
            <div style={S.fg}><label style={S.lbl}>Kelompok</label><input style={S.inp} value={newSoal.grp} onChange={e => setNewSoal({ ...newSoal, grp: e.target.value })} placeholder="Contoh: Penalaran" /></div>
          </div>
          <div style={S.fg}><label style={S.lbl}>Teks Soal</label><textarea style={{ ...S.inp, minHeight: 90, resize: "vertical" }} value={newSoal.text} onChange={e => setNewSoal({ ...newSoal, text: e.target.value })} placeholder="Tulis pernyataan soal di sini..." /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.cta, opacity: loading ? 0.6 : 1 }} onClick={handleAdd} disabled={loading || !newSoal.text || !newSoal.grp}>{loading ? "Menyimpan..." : "✅ Tambah Soal"}</button>
            <button style={S.ghost} onClick={() => setShowAdd(false)}>Batal</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((s, i) => {
          const cat = CAT.find(c => c.id === s.cat);
          const isEd = editId === s.id;
          return (
            <div key={s.id} style={{ background: "#0F172A", border: "1px solid " + (cat?.color || "#334155") + "33", borderRadius: 12, padding: 14 }}>
              {isEd ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={S.fg}><label style={S.lbl}>Kategori</label><select style={S.inp} value={editForm.cat} onChange={e => setEditForm({ ...editForm, cat: e.target.value })}>{CAT.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
                    <div style={S.fg}><label style={S.lbl}>Kelompok</label><input style={S.inp} value={editForm.grp} onChange={e => setEditForm({ ...editForm, grp: e.target.value })} /></div>
                  </div>
                  <div style={S.fg}><label style={S.lbl}>Teks Soal</label><textarea style={{ ...S.inp, minHeight: 80, resize: "vertical" }} value={editForm.text} onChange={e => setEditForm({ ...editForm, text: e.target.value })} /></div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94A3B8", cursor: "pointer" }}><input type="checkbox" checked={editForm.aktif} onChange={e => setEditForm({ ...editForm, aktif: e.target.checked })} />Aktif</label>
                    <button style={{ ...S.cta, padding: "6px 14px", fontSize: 13, opacity: loading ? 0.6 : 1 }} onClick={handleUpdate} disabled={loading}>{loading ? "..." : "✓ Simpan"}</button>
                    <button style={{ ...S.ghost, padding: "6px 12px", fontSize: 13 }} onClick={() => setEditId(null)}>Batal</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 28, height: 28, borderRadius: 8, background: cat?.color + "22", color: cat?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{cat?.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ background: cat?.color + "22", color: cat?.color, borderRadius: 20, padding: "1px 9px", fontSize: 11, fontWeight: 700 }}>{cat?.label}</span>
                      <span style={{ background: "#1E293B", color: "#475569", borderRadius: 20, padding: "1px 9px", fontSize: 11 }}>{s.grp}</span>
                      <span style={{ fontSize: 11, color: "#334155" }}>#{i + 1}</span>
                    </div>
                    <p style={{ color: "#CBD5E1", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{s.text}</p>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <button style={{ ...S.ghost, padding: "4px 10px", fontSize: 12 }} onClick={() => { setEditId(s.id); setEditForm({ cat: s.cat, grp: s.grp, text: s.text, aktif: s.aktif }); }}>✏️</button>
                    <button style={{ ...S.ghost, padding: "4px 9px", fontSize: 12, color: "#EF4444", borderColor: "#EF444433" }} onClick={() => handleDelete(s.id)}>🗑</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════
const S = {
  root:       {minHeight:"100vh",background:"#080E1A",color:"#E2E8F0",fontFamily:"'DM Sans','Segoe UI',sans-serif"},
  header:     {background:"#0B1120",borderBottom:"1px solid #1A2744",position:"sticky",top:0,zIndex:100},
  headerInner:{maxWidth:1200,margin:"0 auto",padding:"11px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"},
  main:       {maxWidth:1200,margin:"0 auto",padding:"26px 18px"},
  loginRoot:  {minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#080E1A"},
  card:       {background:"#0F172A",border:"1px solid #1E293B",borderRadius:16,padding:24},
  cardTitle:  {fontSize:18,fontWeight:800,color:"#E2E8F0",marginTop:0,marginBottom:4},
  badge:      {display:"inline-block",background:"#1E3A5F",color:"#60A5FA",borderRadius:20,padding:"4px 16px",fontSize:12,fontWeight:700,letterSpacing:1},
  tabRow:     {display:"flex",gap:4,background:"#1E293B",borderRadius:10,padding:4,marginBottom:20},
  tabBtn:     {flex:1,border:"none",background:"transparent",color:"#94A3B8",borderRadius:8,padding:"8px",cursor:"pointer",fontSize:13,fontWeight:600},
  tabAct:     {background:"#0F172A",color:"#E2E8F0"},
  fg:         {marginBottom:13},
  lbl:        {display:"block",fontSize:12,color:"#94A3B8",marginBottom:5,fontWeight:600},
  inp:        {width:"100%",boxSizing:"border-box",background:"#1E293B",border:"1px solid #334155",borderRadius:10,padding:"10px 12px",color:"#E2E8F0",fontSize:14,outline:"none"},
  cta:        {background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",color:"#fff",border:"none",borderRadius:12,padding:"11px 28px",fontSize:15,fontWeight:700,cursor:"pointer"},
  ghost:      {background:"transparent",border:"1px solid #1E293B",color:"#94A3B8",borderRadius:10,padding:"8px 15px",cursor:"pointer",fontSize:13},
  navBtn:     {background:"transparent",border:"1px solid #1E293B",color:"#94A3B8",borderRadius:8,padding:"6px 13px",cursor:"pointer",fontSize:13},
  navAct:     {background:"#1E3A5F",color:"#60A5FA",borderColor:"#1E3A5F"},
  th:         {padding:"11px 12px",textAlign:"left",fontSize:11,color:"#475569",fontWeight:700,letterSpacing:.5,borderBottom:"1px solid #1E293B",whiteSpace:"nowrap"},
  tr:         {borderBottom:"1px solid #0B112088"},
  td:         {padding:"10px 12px",fontSize:13,color:"#94A3B8",whiteSpace:"nowrap"},
  detBtn:     {background:"#1E293B",border:"1px solid #334155",color:"#60A5FA",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:600},
};

const _s=document.createElement("style");
_s.textContent=`
@keyframes spin{to{transform:rotate(360deg)}}
input:focus,select:focus{border-color:#3B82F6!important}

/* ── RESPONSIVE BASE ── */
*{box-sizing:border-box}

/* Table scroll wrapper */
.tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:14px;border:1px solid #1E293B}
.tbl-wrap table{min-width:520px}

/* Nav responsive */
.nav-btns{display:flex;gap:6px;align-items:center;flex-wrap:wrap}

/* Grid helpers */
.grid-cat{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.grid-top3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.grid-stats4{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}
.grid-kelas{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
.grid-kelas-tab{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
.grid-soal-kelas{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:12px}

/* Distribusi bakat label */
.dist-label{min-width:192px;font-size:13px;color:#CBD5E1}

/* Header inner */
.header-inner{max-width:1200px;margin:0 auto;padding:11px 18px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.header-brand{display:flex;align-items:center;gap:12px;cursor:pointer}

/* Landing h1 */
.landing-h1{font-size:46px;font-weight:900;line-height:1.1;margin:14px 0 14px;background:linear-gradient(135deg,#60A5FA,#A78BFA);-webkit-background-clip:text;-webkit-text-fill-color:transparent}

@media(max-width:639px){
  /* Header */
  .header-inner{padding:10px 12px;gap:6px}
  .header-brand span:last-child div:first-child{font-size:12px}
  .nav-btns{gap:4px}
  .nav-btns button{padding:5px 9px!important;font-size:11px!important}

  /* Landing */
  .landing-h1{font-size:28px!important}

  /* Grids → 2 or 1 col */
  .grid-cat{grid-template-columns:repeat(2,1fr)!important}
  .grid-top3{grid-template-columns:repeat(3,1fr)!important;gap:8px!important}
  .grid-stats4{grid-template-columns:repeat(2,1fr)!important}
  .grid-kelas{grid-template-columns:repeat(2,1fr)!important}
  .grid-kelas-tab{grid-template-columns:1fr!important}
  .grid-soal-kelas{grid-template-columns:1fr!important}

  /* Distribusi */
  .dist-label{min-width:130px!important;font-size:12px!important}

  /* Card padding */
  .card-resp{padding:14px!important}

  /* Form kelas input row */
  .kelas-row-grid{grid-template-columns:1fr 1fr!important;min-width:0!important}

  /* Main padding */
  .main-resp{padding:14px 10px!important}

  /* Table: hide less important columns on mobile via class */
  .col-hide-mobile{display:none!important}
}

@media(min-width:640px) and (max-width:1023px){
  .grid-cat{grid-template-columns:repeat(3,1fr)}
  .grid-stats4{grid-template-columns:repeat(2,1fr)}
  .grid-kelas{grid-template-columns:repeat(2,1fr)}
  .landing-h1{font-size:36px}
}
`;
document.head.appendChild(_s);
