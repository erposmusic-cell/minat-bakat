import { useState, useEffect, useCallback } from "react";
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
  updateKelasSiswa,
} from "./supabaseClient";
import * as XLSX from "xlsx";

// ══════════════════════════════════════════
// KONSTANTA
// ══════════════════════════════════════════
const ADMIN = { username: "panitia_ppdb", password: "ppdb2025" };
const DEFAULT_TARGET = { min: 120, max: 175 };
const DEFAULT_KELAS = [
  { id:"k1", nama:"X-A", bidang:"sains",    kapasitas:35, wali:"" },
  { id:"k2", nama:"X-B", bidang:"sosial",   kapasitas:35, wali:"" },
  { id:"k3", nama:"X-C", bidang:"logika",   kapasitas:32, wali:"" },
  { id:"k4", nama:"X-D", bidang:"bahasa",   kapasitas:30, wali:"" },
];

const CAT = [
  { id:"logika",   label:"Logika & Analitik",     icon:"🧮", color:"#3B82F6" },
  { id:"bahasa",   label:"Bahasa & Sastra",        icon:"📚", color:"#10B981" },
  { id:"sains",    label:"Sains & Teknologi",      icon:"🔬", color:"#8B5CF6" },
  { id:"seni",     label:"Seni & Kreativitas",     icon:"🎨", color:"#F59E0B" },
  { id:"sosial",   label:"Sosial & Kepemimpinan",  icon:"🤝", color:"#EF4444" },
  { id:"olahraga", label:"Olahraga & Kinestetik",  icon:"⚽", color:"#06B6D4" },
];

const JURUSAN = {
  logika:   ["Teknik Informatika","Matematika","Teknik Sipil","Akuntansi","Statistika","Sistem Informasi"],
  bahasa:   ["Sastra Indonesia","Sastra Inggris","Jurnalistik","Hukum","Hub. Internasional","Pend. Bahasa"],
  sains:    ["Kedokteran","Farmasi","Biologi","Fisika","Teknik Kimia","Kesehatan Masyarakat"],
  seni:     ["Desain Grafis","Seni Rupa","Arsitektur","Film & TV","Musik","Animasi"],
  sosial:   ["Psikologi","Ilmu Sosial","Manajemen","Ilmu Politik","Komunikasi","Sosiologi"],
  olahraga: ["Ilmu Keolahragaan","Pend. Jasmani","Fisioterapi","Gizi & Kesehatan","Kepelatihan","Kes. Olahraga"],
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

function autoAssign(top0, daftar, kelas) {
  const bid = top0?.id;
  const candidates = kelas
    .map(k=>({...k, terisi:daftar.filter(s=>s.kelasId===k.id).length}))
    .filter(k=>k.bidang===bid && k.terisi<k.kapasitas)
    .sort((a,b)=>a.terisi-b.terisi);
  if(candidates.length>0) return candidates[0].id;
  const fallback = kelas
    .map(k=>({...k, terisi:daftar.filter(s=>s.kelasId===k.id).length}))
    .filter(k=>k.terisi<k.kapasitas)
    .sort((a,b)=>a.terisi-b.terisi);
  return fallback[0]?.id || null;
}

// ══════════════════════════════════════════
// GENERATOR NARASI PROFESIONAL (TANPA API)
// ══════════════════════════════════════════
const NARASI_DB = {
  // ── PARAGRAF 1: Gambaran Umum Profil ──
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

  // ── PARAGRAF 2: Kombinasi & Potensi ──
  p2_kombinasi: {
    "logika-bahasa":   "Kombinasi logika dan bahasa yang dimilikinya menciptakan profil yang sangat langka: kemampuan berpikir analitik yang tajam dipadukan dengan kefasihan verbal yang memukau. Individu dengan kombinasi ini mampu tidak hanya memahami konsep kompleks, tetapi juga mengkomunikasikannya dengan sangat efektif kepada audiens yang beragam. Kekuatan ini sangat bernilai di bidang hukum, jurnalisme investigatif, akademisi, dan konsultansi, di mana argumentasi berbasis data harus disajikan dengan narasi yang meyakinkan. Ia memiliki potensi besar untuk menjadi pemikir yang sekaligus orator handal, mampu memengaruhi kebijakan dan opini publik melalui tulisan maupun pidato. Perpaduan ini juga memberinya keunggulan dalam penelitian kualitatif dan analisis wacana, bidang yang membutuhkan ketajaman logis sekaligus kepekaan linguistik. Dengan pengembangan yang tepat, kombinasi ini dapat mengantarkannya menjadi pemimpin intelektual yang disegani di bidang yang dipilihnya.",
    "logika-sains":    "Kombinasi logika analitik dan minat sains yang sama-sama tinggi menjadikannya kandidat ideal untuk jalur karier riset dan teknologi tinggi. Kedua kekuatan ini saling memperkuat: logika menyediakan kerangka berpikir yang sistematis, sementara semangat sains mendorongnya untuk terus menguji, membuktikan, dan menemukan hal baru. Ia memiliki kapasitas untuk menjalani proses ilmiah yang panjang dan penuh ketidakpastian tanpa kehilangan fokus dan motivasi, suatu kualitas yang sangat langka. Potensi ini sangat relevan di era revolusi industri 4.0, di mana dibutuhkan ilmuwan-teknologis yang tidak hanya memahami teori, tetapi juga mampu merancang solusi inovatif berbasis data. Kombinasi ini juga membuka peluang besar di bidang kecerdasan buatan, bioinformatika, dan fisika komputasi yang saat ini menjadi garis terdepan kemajuan peradaban. Dengan bimbingan yang tepat, ia berpotensi memberikan kontribusi nyata bagi perkembangan ilmu pengetahuan nasional maupun global.",
    "logika-seni":     "Perpaduan logika dan seni yang ada dalam dirinya menciptakan profil yang sangat unik: seorang pemikir kreatif yang mampu mendekati masalah dari sudut pandang analitik sekaligus estetik. Kombinasi ini adalah fondasi ideal untuk bidang desain berbasis data, arsitektur, animasi teknis, dan pengembangan antarmuka pengguna yang membutuhkan presisi sekaligus keindahan. Ia mampu menciptakan karya yang tidak hanya indah secara visual, tetapi juga fungsional, terstruktur, dan dapat dipertanggungjawabkan secara teknis. Kekuatan dualitas ini juga sangat berharga dalam dunia kreatif modern yang semakin bergantung pada teknologi, di mana seniman yang memahami logika komputasi memiliki nilai yang sangat tinggi. Potensi untuk berkarier di industri game, film animasi, atau desain produk teknologi sangatlah besar dengan kombinasi kemampuan yang ia miliki.",
    "logika-sosial":   "Integrasi antara kemampuan analitik dan kecerdasan sosial yang tinggi menjadikannya individu yang sangat efektif dalam peran kepemimpinan berbasis data dan kebijakan publik. Ia tidak hanya mampu menganalisis masalah sosial secara objektif dan terstruktur, tetapi juga memiliki kepekaan interpersonal untuk mengimplementasikan solusi dengan cara yang diterima dan didukung oleh banyak pihak. Kombinasi ini sangat relevan untuk bidang manajemen, kebijakan publik, ilmu politik, dan psikologi organisasi. Kemampuannya untuk menjembatani antara data dan manusia menjadikannya aset yang sangat berharga dalam organisasi modern yang kompleks. Dengan latar belakang ini, ia memiliki potensi besar untuk menjadi pemimpin transformatif yang mampu mendorong perubahan sistemik yang berdampak luas.",
    "logika-olahraga": "Kombinasi logika yang kuat dan minat olahraga yang tinggi menciptakan profil yang sangat cocok untuk menjadi atlet cerdas, pelatih berbasis sains, atau ahli sport science yang mengintegrasikan data dalam pelatihan fisik. Kemampuan analitiknya memungkinkan ia untuk memahami biomekanik, pola permainan, dan strategi kompetisi secara mendalam, jauh melampaui atlet yang hanya mengandalkan intuisi fisik semata. Perpaduan ini sangat bernilai di era olahraga modern yang semakin bergantung pada analisis performa, di mana data menjadi senjata utama untuk meraih kemenangan. Ia juga memiliki potensi untuk berkarier di bidang manajemen olahraga, coaching science, atau pengembangan teknologi pelatihan yang saat ini berkembang sangat pesat.",
    "bahasa-sains":    "Kombinasi bahasa dan sains yang dimilikinya menciptakan profil komunikator ilmiah yang sangat dibutuhkan dunia saat ini. Kemampuan untuk memahami konsep sains yang kompleks sekaligus mengkomunikasikannya dalam bahasa yang mudah dipahami adalah keterampilan yang sangat langka dan bernilai tinggi. Perpaduan ini sangat ideal untuk karier di bidang jurnalisme sains, penulisan akademis, komunikasi kesehatan, dan divisi edukasi di lembaga riset atau perusahaan teknologi. Di era banjir informasi seperti sekarang, individu yang mampu menjembatani dunia ilmiah dengan masyarakat umum melalui narasi yang akurat dan menarik memiliki peran yang sangat strategis. Dengan kombinasi ini, ia berpotensi menjadi agen literasi sains yang mampu membentuk opini publik berbasis fakta ilmiah.",
    "bahasa-seni":     "Perpaduan bahasa dan seni yang tinggi mengindikasikan jiwa seniman sekaligus sastrawan yang memiliki kepekaan estetika menyeluruh, baik dalam medium verbal maupun visual. Kombinasi ini adalah fondasi terkuat untuk karier di dunia kreatif: penulisan kreatif, sinematografi, desain komunikasi visual, atau kurasi seni yang membutuhkan pemahaman mendalam terhadap narasi dan estetika sekaligus. Ia memiliki kemampuan unik untuk menciptakan karya yang menyentuh pada banyak level sekaligus: intelektual, emosional, dan sensori, sebuah pencapaian yang hanya dimiliki oleh seniman terbaik. Potensi ini sangat relevan di industri konten digital yang tumbuh pesat, di mana kreator yang memiliki kedalaman sastra sekaligus kepekaan visual menjadi yang paling dicari dan diapresiasi.",
    "bahasa-sosial":   "Integrasi kemampuan bahasa dan kecerdasan sosial yang tinggi menjadikannya komunikator sosial yang luar biasa efektif, mampu memengaruhi, memotivasi, dan menginspirasi orang-orang di sekitarnya melalui kekuatan kata. Kombinasi ini adalah fondasi ideal untuk karier di bidang konseling, diplomasi, hubungan masyarakat, pengajaran, atau advokasi sosial yang membutuhkan kemampuan memahami manusia sekaligus mengkomunikasikan pesan dengan tepat. Ia memiliki bakat alami sebagai mediator dan fasilitator, mampu menciptakan dialog yang produktif bahkan di tengah konflik dan perbedaan pendapat yang tajam. Perpaduan ini juga sangat relevan untuk kepemimpinan organisasi nirlaba, gerakan sosial, dan komunikasi krisis yang membutuhkan empati sekaligus ketepatan pesan.",
    "bahasa-olahraga": "Kombinasi bahasa dan olahraga menciptakan profil yang unik sebagai komunikator dunia olahraga: komentator, jurnalis olahraga, atau motivator atlet yang mampu menginspirasi melalui kekuatan kata sekaligus pemahaman mendalam tentang dunia fisik. Ia memiliki kemampuan untuk menceritakan kisah di balik kompetisi dengan cara yang menyentuh dan menginspirasi, sebuah keterampilan yang sangat dibutuhkan industri media olahraga. Perpaduan ini juga membuka peluang di bidang manajemen olahraga, di mana kemampuan komunikasi yang kuat sangat dibutuhkan untuk negosiasi, branding atlet, dan hubungan dengan media.",
    "sains-seni":      "Perpaduan sains dan seni yang sama-sama tinggi menciptakan profil inovator yang mampu menciptakan solusi yang sekaligus fungsional dan indah. Kombinasi ini adalah fondasi terkuat untuk bidang desain produk, arsitektur, biologi seni, atau teknologi kreatif yang berada di persimpangan antara ilmu pengetahuan dan ekspresi artistik. Ia memiliki kemampuan untuk melihat keindahan dalam ilmu pengetahuan dan presisi dalam seni, sebuah perspektif yang sangat jarang dan sangat berharga. Di era di mana batas antara teknologi dan seni semakin kabur, individu dengan kombinasi ini berada di posisi yang sangat strategis untuk menciptakan terobosan di bidang bioteknologi seni, desain berbasis data, atau inovasi material kreatif.",
    "sains-sosial":    "Integrasi minat sains dan kecerdasan sosial yang tinggi menjadikannya ilmuwan yang peduli pada dampak sosial dari pekerjaannya, sebuah kualitas yang sangat langka dan sangat dibutuhkan dunia saat ini. Ia tidak hanya tertarik pada penemuan ilmiah, tetapi juga pada bagaimana ilmu pengetahuan dapat digunakan untuk meningkatkan kualitas hidup manusia secara nyata dan merata. Kombinasi ini sangat ideal untuk bidang kesehatan masyarakat, ilmu lingkungan, kebijakan sains, atau pengembangan teknologi untuk kelompok yang terpinggirkan. Dengan latar belakang ini, ia berpotensi menjadi ilmuwan-aktivis yang mampu mengintegrasikan rigor ilmiah dengan kepekaan kemanusiaan.",
    "sains-olahraga":  "Kombinasi sains dan olahraga yang tinggi menjadikannya kandidat ideal untuk bidang sport science, kedokteran olahraga, fisioterapi, atau nutrisi olahraga yang membutuhkan pemahaman mendalam tentang tubuh manusia sekaligus semangat aktif. Ia memiliki keunggulan unik: memahami fisiologi olahraga tidak hanya dari buku, tetapi juga dari pengalaman dan kecintaan langsung terhadap aktivitas fisik. Perpaduan ini juga sangat relevan untuk pengembangan teknologi peralatan olahraga, analisis performa atlet berbasis sains, dan rehabilitasi cedera olahraga yang semakin maju.",
    "seni-sosial":     "Perpaduan seni dan kecerdasan sosial yang tinggi menciptakan seniman-aktivis yang menggunakan karyanya sebagai medium untuk menyentuh hati, menggerakkan empati, dan mendorong perubahan sosial yang nyata. Kombinasi ini adalah fondasi terkuat untuk seni pertunjukan, seni komunitas, desain sosial, atau terapi seni yang menempatkan dampak kemanusiaan sebagai tujuan utama karya. Ia memiliki kemampuan luar biasa untuk menciptakan karya yang tidak hanya indah, tetapi juga bermakna dan berdampak bagi komunitas di sekitarnya. Potensi ini sangat relevan di era di mana seni semakin diakui sebagai instrumen penting untuk dialog sosial, rekonsiliasi, dan pemberdayaan masyarakat.",
    "seni-olahraga":   "Kombinasi seni dan olahraga yang tinggi menciptakan profil yang sangat cocok untuk bidang seni pertunjukan fisik: tari, senam artistik, akrobatik, atau koreografi yang membutuhkan keindahan gerakan sekaligus kemampuan fisik yang prima. Ia memiliki keunggulan unik dalam mengintegrasikan ekspresi artistik dengan disiplin fisik, menciptakan performa yang menakjubkan sekaligus bermakna estetik. Perpaduan ini juga membuka peluang di bidang desain kostum olahraga, fotografi olahraga, atau produksi konten media olahraga yang membutuhkan mata seni sekaligus pemahaman tentang dunia fisik.",
    "sosial-olahraga": "Integrasi kecerdasan sosial dan minat olahraga yang tinggi menjadikannya pemimpin tim yang luar biasa efektif, mampu tidak hanya berprestasi secara individual tetapi juga mengangkat performa seluruh anggota tim melalui motivasi, empati, dan strategi kepemimpinan yang matang. Ia memiliki bakat alami sebagai kapten tim, pelatih, atau manajer olahraga yang memahami dinamika manusia di balik kompetisi. Kombinasi ini juga sangat relevan untuk bidang psikologi olahraga, manajemen tim profesional, atau pengembangan program olahraga berbasis komunitas.",
  },

  // ── PARAGRAF 3: Rekomendasi & Pengembangan Diri ──
  p3: {
    logika:   (nama, j1, j2, j3, pct) => `Berdasarkan profil bakat yang komprehensif ini, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling selaras dengan kekuatan analitiknya yang berada di angka ${pct}%. Untuk memaksimalkan potensi ini, sangat disarankan agar ia aktif mengikuti olimpiade matematika, kompetisi pemrograman, atau turnamen debat ilmiah yang dapat mengasah kemampuan logika dalam konteks kompetitif yang sehat. Membaca buku-buku tentang pemikiran kritis, filsafat ilmu, dan pemecahan masalah kompleks secara rutin akan memberikan fondasi intelektual yang semakin kuat. Mengembangkan kebiasaan membuat jurnal refleksi dan analisis terhadap isu-isu sehari-hari juga akan mempertajam kemampuan berpikirnya secara signifikan. Bergabung dengan komunitas atau klub yang berfokus pada diskusi intelektual dan inovasi teknologi akan memperluas wawasan sekaligus membangun jaringan dengan individu-individu berpengaruh di bidangnya. Penting juga untuk menyeimbangkan kekuatan logika dengan pengembangan kecerdasan emosional, karena pemimpin terbaik di bidang apapun adalah mereka yang mampu mengintegrasikan ketajaman analitik dengan kepekaan terhadap kebutuhan manusia di sekitarnya.`,
    bahasa:   (nama, j1, j2, j3, pct) => `Berdasarkan profil bakat yang telah dianalisis secara menyeluruh, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling sesuai dengan kecerdasan linguistiknya yang mencapai ${pct}%. Untuk memaksimalkan potensi ini, sangat disarankan agar ia mengembangkan kebiasaan membaca lintas genre secara luas dan menulis setiap hari, baik dalam bentuk esai, cerpen, maupun jurnal refleksi personal. Mengikuti lomba menulis, debat, atau orasi di berbagai tingkatan akan memberikannya pengalaman berharga dalam mengaplikasikan kemampuan bahasanya di hadapan publik secara nyata. Mempelajari minimal satu bahasa asing secara serius akan membuka cakrawala berpikir yang jauh lebih luas dan meningkatkan nilai kompetitifnya secara signifikan di era global. Bergabung dengan komunitas literasi, klub bahasa, atau kelompok diskusi sastra akan memperkaya perspektifnya sekaligus membangun jaringan dengan para pemikir dan penulis yang inspiratif. Ia juga disarankan untuk mulai membangun portofolio tulisan dari sekarang, karena rekam jejak karya tulis yang konsisten akan menjadi aset yang sangat berharga dalam perjalanan akademik dan profesionalnya ke depan.`,
    sains:    (nama, j1, j2, j3, pct) => `Berdasarkan hasil asesmen yang komprehensif ini, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling selaras dengan minat sainsnya yang mencapai ${pct}%. Untuk memaksimalkan potensi ini, sangat disarankan agar ia aktif terlibat dalam kegiatan eksperimen mandiri, proyek sains sekolah, atau program magang di laboratorium penelitian yang dapat memberikan pengalaman riil dalam dunia ilmiah. Mengikuti olimpiade sains di bidang fisika, kimia, atau biologi akan memberikannya tantangan intelektual sekaligus pengakuan atas kemampuan yang dimilikinya. Membiasakan diri membaca jurnal ilmiah, menonton dokumenter sains, dan mengikuti perkembangan penemuan terbaru akan menjaga rasa ingin tahunya tetap hidup dan terus berkembang. Bergabung dengan komunitas ilmiah muda, menghadiri seminar penelitian, atau bahkan mencoba mempublikasikan karya ilmiah sederhana akan memberikan pengalaman akademis yang sangat berharga sejak dini. Ia juga disarankan untuk mulai membangun kesadaran tentang etika ilmiah dan dampak sosial dari sains, karena ilmuwan terbaik bukan hanya mereka yang cerdas secara teknis, tetapi juga mereka yang memiliki tanggung jawab moral yang kuat terhadap kemanusiaan.`,
    seni:     (nama, j1, j2, j3, pct) => `Berdasarkan profil bakat yang telah diidentifikasi secara mendalam, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling sesuai dengan jiwa kreatifnya yang mencapai ${pct}%. Untuk memaksimalkan potensi ini, sangat disarankan agar ia membangun rutinitas berkarya setiap hari, karena konsistensi adalah kunci utama dalam pengembangan kemampuan seni yang berkelanjutan. Mengikuti workshop, kelas masterclass, atau berguru langsung kepada seniman-seniman berpengalaman akan memberikan teknik dan perspektif baru yang tidak bisa didapat hanya dari buku atau tutorial daring. Membangun portofolio karya sejak dini dan aktif memamerkannya melalui platform digital akan memperkenalkan bakatnya kepada audiens yang lebih luas sekaligus membangun personal branding yang kuat. Mengunjungi pameran seni, pertunjukan, dan festival kreatif secara rutin akan memperluas referensi estetikanya dan menginspirasi arah pengembangan karya yang lebih matang. Penting juga untuk tidak mengabaikan aspek bisnis seni, karena seniman yang sukses di era modern adalah mereka yang tidak hanya berbakat secara artistik, tetapi juga memiliki pemahaman tentang pasar, hak cipta, dan strategi keberlanjutan karier kreatif.`,
    sosial:   (nama, j1, j2, j3, pct) => `Berdasarkan hasil asesmen yang menyeluruh ini, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling selaras dengan kecerdasan interpersonalnya yang mencapai ${pct}%. Untuk memaksimalkan potensi ini, sangat disarankan agar ia aktif mengambil peran kepemimpinan dalam berbagai organisasi, mulai dari OSIS, komunitas sosial, hingga kelompok relawan yang memberikan pengalaman nyata dalam mengelola orang dan memimpin perubahan. Mengembangkan kemampuan mendengarkan aktif, resolusi konflik, dan komunikasi nonverbal akan melengkapi kecerdasan sosialnya dengan keterampilan praktis yang sangat dibutuhkan pemimpin masa depan. Membaca biografi tokoh-tokoh pemimpin besar, buku tentang psikologi sosial, dan karya-karya tentang perubahan sosial akan memberikan inspirasi dan perspektif yang memperkaya cara pandangnya terhadap dunia. Terlibat langsung dalam kegiatan pelayanan masyarakat dan advokasi sosial akan mengasah empatinya sekaligus memberikan pemahaman mendalam tentang tantangan nyata yang dihadapi berbagai kelompok dalam masyarakat. Ia juga disarankan untuk mulai membangun jaringan sosial yang luas dan beragam, karena pemimpin yang efektif adalah mereka yang mampu bergerak di lintas batas sosial, budaya, dan profesi untuk mewujudkan visi yang lebih besar dari dirinya sendiri.`,
    olahraga: (nama, j1, j2, j3, pct) => `Berdasarkan profil bakat yang komprehensif ini, ${nama} sangat direkomendasikan untuk mendalami bidang ${j1}, ${j2}, atau ${j3} yang paling sesuai dengan kecerdasan kinestetiknya yang mencapai ${pct}%. Untuk memaksimalkan potensi ini, sangat disarankan agar ia mengembangkan program latihan yang terstruktur dan progresif, idealnya di bawah bimbingan pelatih profesional yang dapat mengoptimalkan potensi fisiknya secara sistematis. Membangun kebiasaan menjaga nutrisi, tidur yang cukup, dan pemulihan yang tepat adalah fondasi utama bagi atlet yang ingin berprestasi dalam jangka panjang tanpa mengalami cedera berulang. Mengikuti kompetisi secara rutin di berbagai tingkatan akan memberikan pengalaman berharga dalam mengelola tekanan, membangun mentalitas juara, dan mengidentifikasi area yang masih perlu ditingkatkan. Mempelajari aspek ilmiah dari olahraga yang ditekuninya, seperti biomekanik, fisiologi latihan, dan psikologi performa, akan memberikan keunggulan kompetitif yang signifikan dibanding atlet yang hanya mengandalkan latihan fisik semata. Penting juga untuk mulai memikirkan jalur karier jangka panjang di dunia olahraga, karena peluang tidak terbatas pada menjadi atlet profesional saja, melainkan juga mencakup pelatih, analis performa, pengusaha di industri olahraga, atau pejabat dalam lembaga keolahragaan nasional yang membutuhkan individu berpengalaman dan berpengetahuan luas.`,
  },

  // ── Level Kata Sifat Berdasarkan Skor ──
  levelKata: (pct) => {
    if (pct >= 85) return "sangat dominan dan menonjol";
    if (pct >= 70) return "kuat dan konsisten";
    if (pct >= 55) return "cukup berkembang";
    return "masih dalam tahap berkembang";
  },

  // ── Kata Pembuka Nama Variatif ──
  pembuka: ["Berdasarkan hasil asesmen yang telah dilaksanakan, ", "Melalui serangkaian pengukuran psikometri yang komprehensif, ", "Hasil analisis mendalam terhadap profil psikologis menunjukkan bahwa ", "Setelah melalui proses asesmen bakat dan minat yang terstandarisasi, "],
};

function generateNarasi(nama, scores, top) {
  const t0 = top[0]; const t1 = top[1]; const t2 = top[2];
  const isHigh = (id) => scores[id] >= 65;
  const lvl = (id) => isHigh(id) ? "tinggi" : "sedang";

  // Paragraf 1 — Gambaran Umum
  const p1db  = NARASI_DB.p1[t0.id];
  const p1arr = p1db ? (isHigh(t0.id) ? p1db.tinggi : p1db.sedang) : [];
  const p1core = p1arr[Math.floor((scores[t0.id] + scores[t1.id]) % p1arr.length)] || p1arr[0] || "memiliki profil bakat yang unik dan beragam.";
  const pembuka = NARASI_DB.pembuka[Math.floor(scores[t0.id] % NARASI_DB.pembuka.length)];
  const lvlWord = NARASI_DB.levelKata(t0.pct);

  const p1 = `${pembuka}${nama} ${p1core} Kecenderungan bakat pada bidang ${t0.label} teridentifikasi sebagai yang paling ${lvlWord}, dengan skor mencapai ${t0.pct}% dari total maksimum yang dimungkinkan dalam instrumen asesmen ini. Selain itu, bidang ${t1.label} (${t1.pct}%) dan ${t2.label} (${t2.pct}%) turut membentuk profil multi-dimensi yang kaya dan saling melengkapi satu sama lain. Keberagaman kekuatan ini menunjukkan bahwa ${nama} bukan individu yang hanya menonjol dalam satu aspek semata, melainkan seseorang yang memiliki kapasitas untuk berkembang secara holistik di berbagai bidang kehidupan. Profil ini mengindikasikan kepribadian yang dinamis, adaptif, dan memiliki kedalaman intelektual yang akan menjadi modalitas besar dalam perjalanan akademik dan profesionalnya ke depan. Penting untuk dipahami bahwa hasil asesmen ini merupakan potret kecenderungan alami pada saat ini, bukan batas tetap dari potensi yang sebenarnya, karena bakat sejati akan terus berkembang seiring dengan pengalaman, pendidikan, dan refleksi diri yang konsisten.`;

  // Paragraf 2 — Kombinasi & Potensi
  const kombiKey = [t0.id, t1.id].sort().join("-");
  const p2base = NARASI_DB.p2_kombinasi[kombiKey] || NARASI_DB.p2_kombinasi[[t0.id, t2.id].sort().join("-")] || `${nama} memiliki kombinasi bakat yang unik antara ${t0.label} dan ${t1.label} yang saling memperkuat dan membuka peluang yang sangat luas di berbagai bidang.`;
  const scoreContext = `Secara keseluruhan, distribusi skor yang diperoleh — dengan ${t0.label} di posisi teratas (${t0.pct}%), diikuti ${t1.label} (${t1.pct}%) dan ${t2.label} (${t2.pct}%) — mencerminkan seorang individu yang tidak hanya memiliki bakat dominan yang jelas, tetapi juga kedalaman potensi di bidang-bidang pendukung yang memperkaya perspektifnya secara keseluruhan.`;
  const p2 = `${p2base} ${scoreContext}`;

  // Paragraf 3 — Rekomendasi
  const j = JURUSAN[t0.id] || [];
  const p3fn = NARASI_DB.p3[t0.id];
  const p3 = p3fn ? p3fn(nama, j[0]||"-", j[1]||"-", j[2]||"-", t0.pct) : `${nama} disarankan untuk mendalami bidang-bidang yang selaras dengan kekuatan utamanya demi mengoptimalkan potensi yang luar biasa ini.`;

  return `${p1}\n\n${p2}\n\n${p3}`;
}

function doExcelExport(daftar, kelas) {
  const rows = daftar.map((s,i)=>{
    const k=kelas.find(x=>x.id===s.kelasId);
    return {
      "No":i+1,"Nama":s.nama,"NISN":s.nisn,"Sekolah":s.sekolah,
      "Tgl Lahir":s.tgl||"-","Tgl Asesmen":s.tanggalAsesmen,
      "Bakat Utama":s.top[0]?.label||"-","Skor (%)":s.top[0]?.pct||0,
      "Kelas":k?.nama||"-",
      "Logika":s.scores.logika,"Bahasa":s.scores.bahasa,"Sains":s.scores.sains,
      "Seni":s.scores.seni,"Sosial":s.scores.sosial,"Olahraga":s.scores.olahraga,
      "Rekomendasi 1":JURUSAN[s.top[0]?.id]?.[0]||"-",
      "Rekomendasi 2":JURUSAN[s.top[0]?.id]?.[1]||"-",
      "Rekomendasi 3":JURUSAN[s.top[0]?.id]?.[2]||"-",
    };
  });
  const kelasRows = kelas.map(k=>{
    const terisi=daftar.filter(s=>s.kelasId===k.id).length;
    return {
      "Kelas":k.nama,
      "Bidang":CAT.find(c=>c.id===k.bidang)?.label||k.bidang,
      "Kapasitas":k.kapasitas,"Terisi":terisi,"Sisa":k.kapasitas-terisi,
      "% Penuh":Math.round((terisi/k.kapasitas)*100)+"%",
      "Wali Kelas":k.wali||"-"
    };
  });
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"Data Siswa");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(kelasRows),"Rekapitulasi Kelas");
  XLSX.writeFile(wb,"PPDB_"+new Date().toLocaleDateString("id-ID").replace(/\//g,"-")+".xlsx");
}

function doPrintSiswa(siswa) {
  const t0 = siswa.top[0];
  const bars = CAT.map(c=>`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="min-width:180px;font-size:13px">${c.icon} ${c.label}</span>
      <div style="flex:1;height:10px;background:#e2e8f0;border-radius:99px">
        <div style="width:${siswa.scores[c.id]}%;height:100%;background:${c.color};border-radius:99px"></div>
      </div>
      <strong style="min-width:36px;color:${c.color}">${siswa.scores[c.id]}%</strong>
    </div>`).join("");
  const narasiText = siswa.narasi || siswa.aiAnalisis || "Analisis belum tersedia.";
  const narasiHtml = narasiText.split("\n\n").map(p=>
    `<p style="margin:0 0 14px;line-height:1.85;font-size:13.5px">${p}</p>`).join("");
  const topCards = siswa.top.map((t,i)=>`
    <div style="border-radius:12px;padding:16px;text-align:center;border:2px solid ${t.color};background:${t.color}15">
      <div style="font-size:11px;color:#94a3b8;font-weight:800">#${i+1}</div>
      <div style="font-size:26px">${t.icon}</div>
      <div style="font-size:12px;font-weight:700;color:${t.color}">${t.label}</div>
      <div style="font-size:24px;font-weight:900;color:${t.color}">${t.pct}%</div>
    </div>`).join("");
  const html = `<!DOCTYPE html>
<html lang="id"><head>
  <meta charset="utf-8">
  <title>Laporan Asesmen — ${siswa.nama}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; max-width: 780px; margin: 0 auto; padding: 32px; color: #1e293b; }
    h2 { border-left: 4px solid #3b82f6; padding-left: 10px; margin: 20px 0 10px; font-size: 15px; }
    ul { margin: 8px 0; padding-left: 20px; } ul li { margin-bottom: 4px; font-size: 14px; }
    .narasi { background: #f8fafc; border-radius: 10px; padding: 16px; }
    .footer { margin-top: 32px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head><body>
  <div style="text-align:center;border-bottom:3px solid #3b82f6;padding-bottom:16px;margin-bottom:20px">
    <div style="background:#eff6ff;color:#1d4ed8;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;display:inline-block;margin-bottom:10px">
      PPDB 2025/2026 — ASESMEN BAKAT &amp; MINAT
    </div>
    <h1 style="margin:0 0 4px;font-size:22px">${siswa.nama}</h1>
    <p style="color:#64748b;margin:0;font-size:13px">${siswa.nisn} · ${siswa.sekolah} · ${siswa.tanggalAsesmen}</p>
    ${siswa.kelasNama ? `<p style="color:#3b82f6;font-weight:700;margin:6px 0 0">Kelas yang Ditetapkan: ${siswa.kelasNama}</p>` : ""}
  </div>
  <h2>📊 Top 3 Bidang Bakat</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0">${topCards}</div>
  <h2>📈 Profil Lengkap</h2>
  ${bars}
  <h2>🎓 Rekomendasi Jurusan</h2>
  <ul>${(JURUSAN[t0.id]||[]).map(j=>`<li>${j}</li>`).join("")}</ul>
  <h2>📝 Analisis Psikologi Pendidikan</h2>
  <div class="narasi">${narasiHtml}</div>
  <div class="footer">Sistem PPDB SMA · ${siswa.tanggalAsesmen} · Dokumen Resmi</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const w    = window.open(url, "_blank");
  if (w) {
    w.addEventListener("load", () => w.print());
  } else {
    // fallback: download sebagai file HTML jika popup diblokir browser
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_${siswa.nama.replace(/\s+/g,"_")}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}


// ══════════════════════════════════════════
// APP ROOT — dengan Supabase
// ══════════════════════════════════════════
export default function App() {
  const [auth, setAuth]           = useState(null);
  const [phase, setPhase]         = useState("landing");
  const [tab, setTab]             = useState("dashboard");
  const [formSiswa, setFormSiswa] = useState({nama:"",nisn:"",sekolah:"",tgl:""});
  const [answers, setAnswers]     = useState({});
  const [current, setCurrent]     = useState(0);
  const [animIn, setAnimIn]       = useState(true);
  const [daftar, setDaftar]       = useState([]);
  const [viewSiswa, setViewSiswa] = useState(null);
  const [kelas, setKelas]         = useState(DEFAULT_KELAS);
  const [target, setTarget]       = useState(DEFAULT_TARGET);
  const [setupDone, setSetupDone] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError]     = useState(null);

  // ── Load data dari Supabase saat pertama kali masuk sebagai panitia ──
  const loadAllData = useCallback(async () => {
    setDbLoading(true); setDbError(null);
    try {
      const [kelasData, targetData, siswaData] = await Promise.all([
        fetchKelas(),
        fetchTarget(),
        fetchSiswa(),
      ]);
      setKelas(kelasData.length > 0 ? kelasData : DEFAULT_KELAS);
      setTarget(targetData);
      setDaftar(siswaData);
      setSetupDone(true);
    } catch(e) {
      setDbError("Gagal memuat data: " + e.message);
    }
    setDbLoading(false);
  }, []);

  // ── Load saat login sebagai panitia ──
  useEffect(() => {
    if (auth?.role === "panitia") loadAllData();
  }, [auth, loadAllData]);

  function handleAnswer(qid, val) {
    setAnimIn(false);
    setTimeout(()=>{
      setAnswers(prev=>({...prev,[qid]:val}));
      if(current<QUESTIONS.length-1) setCurrent(c=>c+1);
      setAnimIn(true);
    },180);
  }

  async function handleSelesai() {
    const scores   = calcScores(answers);
    const top      = getTop(scores);
    const kelasId  = autoAssign(top[0], daftar, kelas);
    const kelasNama = kelas.find(k=>k.id===kelasId)?.nama||null;
    const narasi   = generateNarasi(formSiswa.nama, scores, top);
    const rec = {
      id: Date.now(), ...formSiswa, scores, top, kelasId, kelasNama,
      tanggalAsesmen: new Date().toLocaleDateString("id-ID",{dateStyle:"long"}),
      narasi,
    };
    // Simpan ke state lokal dulu (langsung tampil)
    setDaftar(prev=>[...prev, rec]);
    setViewSiswa(rec);
    setPhase("result");
    // Kemudian simpan ke Supabase (background)
    try {
      await insertSiswa(rec);
    } catch(e) {
      console.error("Gagal simpan ke Supabase:", e.message);
      // Tidak blok UI — data sudah ada di state lokal
    }
  }

  async function handleSaveKelas(kelasArr) {
    setDbLoading(true);
    try {
      await upsertKelas(kelasArr);
      setKelas(kelasArr);
    } catch(e) { setDbError("Gagal simpan kelas: " + e.message); }
    setDbLoading(false);
  }

  async function handleSaveTarget(min, max) {
    setDbLoading(true);
    try {
      await saveTarget(min, max);
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
    // Update state lokal dulu
    setDaftar(prev=>prev.map(s=>s.id===siswaId?{...s,kelasId,kelasNama}:s));
    // Sinkron ke Supabase
    try { await updateKelasSiswa(siswaId, kelasId, kelasNama); }
    catch(e) { console.error("Gagal update kelas siswa:", e.message); }
  }

  function resetAsesmen() {
    setAnswers({}); setCurrent(0);
    setFormSiswa({nama:"",nisn:"",sekolah:"",tgl:""});
    setPhase("landing");
  }

  if (!auth) return (
    <LoginPage onLogin={async (role, userData) => {
      setAuth({role, ...userData});
      setPhase(role==="panitia"?"dashboard":"landing");
    }}/>
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
        <Topbar auth={auth} phase={phase} setPhase={setPhase} setAuth={setAuth} daftar={daftar} tab={tab} setTab={setTab}/>
        <main style={S.main}>
          <SetupWizard
            kelas={kelas} target={target}
            onSaveKelas={handleSaveKelas}
            onSaveTarget={handleSaveTarget}
            onDone={()=>setSetupDone(true)}
            dbLoading={dbLoading}
          />
        </main>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <Topbar auth={auth} phase={phase} setPhase={setPhase} setAuth={setAuth} daftar={daftar} tab={tab} setTab={setTab}/>
      <main style={S.main}>
        {phase==="landing"   && <Landing onMulai={()=>setPhase("form")} />}
        {phase==="form"      && <FormSiswa siswa={formSiswa} onChange={setFormSiswa} onLanjut={()=>{setCurrent(0);setAnswers({});setPhase("asesmen");}}/>}
        {phase==="asesmen"   && <Asesmen questions={QUESTIONS} current={current} answers={answers} animIn={animIn} onAnswer={handleAnswer} onPrev={()=>setCurrent(c=>Math.max(0,c-1))} onSelesai={handleSelesai}/>}
        {phase==="result"    && viewSiswa && <Hasil siswa={viewSiswa} onBaru={resetAsesmen} onDaftar={()=>{setPhase("dashboard");setTab("data");}} auth={auth}/>}
        {phase==="dashboard" && auth.role==="panitia" && (
          <Dashboard
            daftar={daftar} setDaftar={setDaftar}
            kelas={kelas} target={target}
            tab={tab} setTab={setTab}
            onDetail={s=>{setViewSiswa(s);setPhase("result");}}
            onBaru={()=>setPhase("landing")}
            onExport={()=>doExcelExport(daftar,kelas)}
            onSetupUlang={()=>setSetupDone(false)}
            onSaveKelas={handleSaveKelas}
            onDeleteKelas={handleDeleteKelas}
            onUpdateKelasSiswa={handleUpdateKelasSiswa}
            onRefresh={loadAllData}
            dbLoading={dbLoading}
          />
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════
// LOGIN — autentikasi via Supabase RPC
// ══════════════════════════════════════════
function LoginPage({onLogin}) {
  const [mode,setMode]=useState("siswa");
  const [u,setU]=useState(""); const [p,setP]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);

  async function tryLogin(){
    setLoading(true); setErr("");
    try {
      const userData = await loginPanitia(u, p);
      if (!userData) { setErr("Username atau password salah."); }
      else { onLogin("panitia", userData); }
    } catch(e) {
      setErr("Koneksi gagal: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={S.loginRoot}>
      <div style={{...S.card,maxWidth:420,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:42,color:"#3B82F6"}}>◈</div>
          <h1 style={{fontSize:20,fontWeight:900,margin:"8px 0 4px",color:"#E2E8F0"}}>PPDB Asesmen Bakat & Minat</h1>
          <p style={{color:"#475569",fontSize:13,margin:0}}>Sistem Penjurusan Cerdas — SMA 2025/2026</p>
        </div>
        <div style={S.tabRow}>
          <button style={{...S.tabBtn,...(mode==="siswa"?S.tabAct:{})}} onClick={()=>{setMode("siswa");setErr("");}}>Siswa / Wali</button>
          <button style={{...S.tabBtn,...(mode==="panitia"?S.tabAct:{})}} onClick={()=>{setMode("panitia");setErr("");}}>Panitia PPDB</button>
        </div>
        {mode==="siswa"?(
          <div style={{textAlign:"center"}}>
            <p style={{color:"#94A3B8",fontSize:14,marginBottom:18}}>Ikuti asesmen untuk menemukan jurusan yang tepat.</p>
            <button style={S.cta} onClick={()=>onLogin("siswa",{})}>Mulai Asesmen →</button>
          </div>
        ):(
          <div>
            <div style={S.fg}><label style={S.lbl}>Username</label>
              <input style={S.inp} value={u} onChange={e=>setU(e.target.value)} placeholder="Username panitia"/></div>
            <div style={S.fg}><label style={S.lbl}>Password</label>
              <input style={S.inp} type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="Password" onKeyDown={e=>e.key==="Enter"&&tryLogin()}/></div>
            {err&&<div style={{background:"#450A0A",color:"#F87171",borderRadius:8,padding:"8px 12px",fontSize:13,marginBottom:10}}>{err}</div>}
            <button style={{...S.cta,width:"100%",opacity:loading?0.6:1}} onClick={tryLogin} disabled={loading}>
              {loading?"Memverifikasi...":"Login Panitia →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TOPBAR
// ══════════════════════════════════════════
function Topbar({auth,phase,setPhase,setAuth,daftar,tab,setTab}) {
  return (
    <header style={S.header}>
      <div style={S.headerInner}>
        <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}
          onClick={()=>setPhase(auth.role==="panitia"?"dashboard":"landing")}>
          <span style={{fontSize:26,color:"#3B82F6"}}>◈</span>
          <div>
            <div style={{fontWeight:800,fontSize:14}}>ASESMEN BAKAT & MINAT</div>
            <div style={{fontSize:11,color:"#475569"}}>Sistem PPDB SMA 2025/2026</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {auth.role==="panitia"&&<>
            <button style={{...S.navBtn,...(phase==="dashboard"&&tab==="dashboard"?S.navAct:{})}} onClick={()=>{setPhase("dashboard");setTab("dashboard");}}>Dashboard</button>
            <button style={{...S.navBtn,...(phase==="dashboard"&&tab==="kelas"?S.navAct:{})}} onClick={()=>{setPhase("dashboard");setTab("kelas");}}>🏫 Kelas</button>
            <button style={{...S.navBtn,...(phase==="dashboard"&&tab==="data"?S.navAct:{})}} onClick={()=>{setPhase("dashboard");setTab("data");}}>Data ({daftar.length})</button>
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
function SetupWizard({kelas,target,onSaveKelas,onSaveTarget,onDone,dbLoading}) {
  const [step,setStep]=useState(1);
  const [lt,setLt]=useState({...target});
  const [lk,setLk]=useState(kelas.map(k=>({...k})));

  const totalKap = lk.reduce((s,k)=>s+k.kapasitas,0);
  const stColor  = totalKap<lt.min?"#EF4444":totalKap>lt.max?"#F59E0B":"#10B981";
  const stMsg    = totalKap<lt.min
    ? "⚠️ Kurang "+(lt.min-totalKap)+" kursi dari target minimum"
    : totalKap>lt.max
    ? "⚠️ Kelebihan "+(totalKap-lt.max)+" kursi dari target maksimum"
    : "✅ Kapasitas ideal — "+totalKap+" kursi dalam rentang "+lt.min+"–"+lt.max;

  function updK(i,f,v){ setLk(prev=>prev.map((k,idx)=>idx===i?{...k,[f]:f==="kapasitas"?parseInt(v)||0:v}:k)); }
  function addK(){ setLk(prev=>[...prev,{id:"k"+Date.now(),nama:"X-"+(prev.length+1),bidang:"sains",kapasitas:30,wali:""}]); }
  function delK(i){ if(lk.length>1) setLk(prev=>prev.filter((_,idx)=>idx!==i)); }
  async function finish(){
    await onSaveKelas(lk);
    await onSaveTarget(lt.min, lt.max);
    onDone();
  }

  return (
    <div style={{maxWidth:660,margin:"0 auto",display:"flex",flexDirection:"column",gap:20}}>
      <div style={{textAlign:"center",padding:"18px 0 4px"}}>
        <div style={S.badge}>✦ Setup Awal PPDB</div>
        <h2 style={{fontSize:23,fontWeight:900,margin:"10px 0 4px",color:"#E2E8F0"}}>Konfigurasi Penerimaan Siswa Baru</h2>
        <p style={{color:"#475569",fontSize:13,margin:0}}>Atur target dan kelas sesuai kapasitas sekolah Anda</p>
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        {[["1","Target"],["2","Kelas"]].map(([n,lbl],i)=>(
          <div key={n} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:800,fontSize:14,
                background:step>=+n?"#3B82F6":"#1E293B",
                color:step>=+n?"#fff":"#475569",
                border:"2px solid "+(step>=+n?"#3B82F6":"#334155")}}>
                {n}
              </div>
              <span style={{fontSize:11,color:step>=+n?"#60A5FA":"#475569"}}>{lbl}</span>
            </div>
            {i===0&&<div style={{width:60,height:2,background:step>=2?"#3B82F6":"#1E293B",marginBottom:18}}/>}
          </div>
        ))}
      </div>

      {step===1&&(
        <div style={S.card}>
          <h3 style={S.cardTitle}>🎯 Target Penerimaan Siswa Baru</h3>
          <p style={{color:"#475569",fontSize:13,marginBottom:16}}>Masukkan rentang jumlah siswa yang akan diterima tahun ini.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
            <div style={S.fg}>
              <label style={S.lbl}>Minimum Siswa</label>
              <input style={S.inp} type="number" min={1} value={lt.min} onChange={e=>setLt({...lt,min:parseInt(e.target.value)||0})}/>
              <span style={{fontSize:11,color:"#475569",marginTop:3,display:"block"}}>Batas bawah penerimaan</span>
            </div>
            <div style={S.fg}>
              <label style={S.lbl}>Maksimum Siswa</label>
              <input style={S.inp} type="number" min={1} value={lt.max} onChange={e=>setLt({...lt,max:parseInt(e.target.value)||0})}/>
              <span style={{fontSize:11,color:"#475569",marginTop:3,display:"block"}}>Batas atas penerimaan</span>
            </div>
          </div>
          <div style={{background:"#1E3A5F22",border:"1px solid #1E3A5F55",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:13,color:"#94A3B8",marginBottom:5}}>💡 Panduan kapasitas kelas:</div>
            <div style={{fontSize:13,color:"#CBD5E1",lineHeight:1.8}}>
              • Ideal <strong style={{color:"#60A5FA"}}>30–36 siswa</strong> per kelas<br/>
              • 4 kelas × 30 = <strong style={{color:"#10B981"}}>120 siswa</strong><br/>
              • 5 kelas × 35 = <strong style={{color:"#10B981"}}>175 siswa</strong><br/>
              • Rentang Anda: <strong style={{color:"#F59E0B"}}>{lt.min} – {lt.max} siswa</strong>
            </div>
          </div>
          <button style={{...S.cta,width:"100%"}} onClick={()=>setStep(2)} disabled={lt.min<=0||lt.max<lt.min}>
            Lanjut: Atur Kelas →
          </button>
        </div>
      )}

      {step===2&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#0F172A",border:"1px solid "+stColor+"44",borderRadius:14,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8,flexWrap:"wrap",gap:6}}>
              <span style={{color:"#94A3B8"}}>Total Kapasitas: <strong style={{color:stColor}}>{totalKap} kursi</strong></span>
              <span style={{color:stColor,fontWeight:700}}>{stMsg}</span>
            </div>
            <div style={{height:9,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
              <div style={{width:Math.min((totalKap/lt.max)*100,110)+"%",height:"100%",
                background:totalKap<lt.min?"#EF4444":totalKap>lt.max?"#F59E0B":"#10B981",
                borderRadius:99,transition:"width 0.4s"}}/>
            </div>
            {totalKap<lt.min&&(
              <div style={{marginTop:8,background:"#450A0A",borderRadius:7,padding:"6px 10px",fontSize:12,color:"#FCA5A5"}}>
                💡 Tambah {Math.ceil((lt.min-totalKap)/30)} kelas lagi atau naikkan kapasitas agar mencapai minimum.
              </div>
            )}
          </div>

          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <h3 style={S.cardTitle}>🏫 Konfigurasi Kelas ({lk.length} kelas)</h3>
                <p style={{color:"#475569",fontSize:12,marginTop:2}}>Atur nama, bidang, dan kapasitas tiap kelas</p>
              </div>
              <button style={{...S.cta,padding:"7px 14px",fontSize:13}} onClick={addK} disabled={lk.length>=8}>+ Kelas</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {lk.map((k,i)=>{
                const cat=CAT.find(c=>c.id===k.bidang);
                return (
                  <div key={k.id} style={{background:"#0B1120",border:"1px solid "+(cat?.color||"#334155")+"44",
                    borderRadius:11,padding:12,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:20}}>{cat?.icon}</span>
                    <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1.5fr 80px auto",gap:8,alignItems:"center",minWidth:280}}>
                      <div>
                        <div style={{fontSize:10,color:"#475569",marginBottom:3}}>Nama Kelas</div>
                        <input style={{...S.inp,padding:"6px 9px",fontSize:13}} value={k.nama} onChange={e=>updK(i,"nama",e.target.value)}/>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:"#475569",marginBottom:3}}>Bidang Dominan</div>
                        <select style={{...S.inp,padding:"6px 9px",fontSize:13}} value={k.bidang} onChange={e=>updK(i,"bidang",e.target.value)}>
                          {CAT.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:"#475569",marginBottom:3}}>Kapasitas</div>
                        <input style={{...S.inp,padding:"6px 8px",fontSize:13}} type="number" value={k.kapasitas} min={1} max={50} onChange={e=>updK(i,"kapasitas",e.target.value)}/>
                      </div>
                      <div style={{paddingTop:15}}>
                        <button style={{...S.ghost,padding:"5px 9px",fontSize:12,color:"#EF4444",borderColor:"#EF444433"}} onClick={()=>delK(i)} disabled={lk.length<=1}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{display:"flex",gap:8}}>
            <button style={S.ghost} onClick={()=>setStep(1)}>← Kembali</button>
            <button style={{...S.cta,flex:1,opacity:dbLoading?0.6:1}} onClick={finish} disabled={dbLoading}>
              {dbLoading?"Menyimpan...":"✅ Simpan & Mulai PPDB"}
            </button>
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
        <h1 style={{fontSize:46,fontWeight:900,lineHeight:1.1,margin:"14px 0 14px",
          background:"linear-gradient(135deg,#60A5FA,#A78BFA)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          Temukan Bakat<br/>&amp; Minatmu
        </h1>
        <p style={{fontSize:15,color:"#94A3B8",maxWidth:480,margin:"0 auto 22px",lineHeight:1.7}}>
          60 pertanyaan mendalam · 6 bidang minat · Analisis AI instan
        </p>
        <button style={S.cta} onClick={onMulai}>Mulai Asesmen →</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {CAT.map(c=>(
          <div key={c.id} style={{background:"#0F172A",border:"1px solid "+c.color+"44",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{width:38,height:38,borderRadius:10,background:c.color+"22",color:c.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.icon}</span>
            <span style={{fontSize:13,fontWeight:600,color:"#CBD5E1"}}>{c.label}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
        {[["60","Pertanyaan"],["6","Bidang Minat"],["±20 mnt","Durasi"],["AI","Analisis"]].map(([v,l])=>(
          <div key={l} style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:12,padding:"16px 26px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:"#60A5FA"}}>{v}</div>
            <div style={{fontSize:12,color:"#475569",marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// FORM SISWA
// ══════════════════════════════════════════
function FormSiswa({siswa,onChange,onLanjut}) {
  const valid = siswa.nama && siswa.nisn && siswa.sekolah;
  return (
    <div style={{display:"flex",justifyContent:"center"}}>
      <div style={{...S.card,maxWidth:520,width:"100%"}}>
        <h2 style={S.cardTitle}>Data Peserta</h2>
        <p style={{color:"#475569",fontSize:13,marginBottom:18}}>Lengkapi identitas sebelum memulai asesmen</p>
        {[["Nama Lengkap *","text","Masukkan nama lengkap","nama"],
          ["NISN *","text","Nomor Induk Siswa Nasional","nisn"],
          ["Asal Sekolah *","text","Nama SMP/MTs asal","sekolah"],
          ["Tanggal Lahir","date","","tgl"]].map(([label,type,ph,key])=>(
          <div key={key} style={S.fg}>
            <label style={S.lbl}>{label}</label>
            <input style={S.inp} type={type} placeholder={ph} value={siswa[key]}
              onChange={e=>onChange({...siswa,[key]:e.target.value})}
              maxLength={key==="nisn"?10:undefined}/>
          </div>
        ))}
        <button style={{...S.cta,width:"100%",marginTop:14,opacity:valid?1:0.4,cursor:valid?"pointer":"not-allowed"}}
          disabled={!valid} onClick={onLanjut}>Lanjutkan ke Asesmen →</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ASESMEN
// ══════════════════════════════════════════
function Asesmen({questions,current,answers,animIn,onAnswer,onPrev,onSelesai}) {
  const q = questions[current];
  const cat = CAT.find(c=>c.id===q.cat);
  const progress = (Object.keys(answers).length/questions.length)*100;
  const allDone  = Object.keys(answers).length===questions.length;
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
        <div style={{display:"inline-block",background:cat.color+"22",color:cat.color,borderRadius:20,
          padding:"3px 14px",fontSize:12,fontWeight:700,marginBottom:14}}>
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
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <button style={S.ghost} onClick={onPrev} disabled={current===0}>← Sebelumnya</button>
        <span style={{fontSize:11,color:"#475569"}}>Klik pilihan untuk lanjut otomatis</span>
        {allDone&&<button style={{...S.cta,padding:"9px 20px",fontSize:14}} onClick={onSelesai}>Lihat Hasil ✦</button>}
      </div>

      <div style={{display:"flex",gap:7,justifyContent:"center",flexWrap:"wrap"}}>
        {CAT.map(c=>{
          const qs=questions.filter(x=>x.cat===c.id);
          const done=qs.filter(x=>answers[x.id]).length;
          return (
            <div key={c.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,opacity:c.id===q.cat?1:0.5}}>
              <span style={{fontSize:10,color:c.id===q.cat?c.color:"#475569",fontWeight:c.id===q.cat?700:400}}>
                {c.icon} {done}/{qs.length}
              </span>
              <div style={{width:54,height:4,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
                <div style={{width:(done/qs.length*100)+"%",height:"100%",background:c.color,borderRadius:99}}/>
              </div>
            </div>
          );
        })}
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
// HASIL
// ══════════════════════════════════════════
function Hasil({siswa,onBaru,onDaftar,auth}) {
  const top = siswa.top;
  const t0  = top[0];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:18,maxWidth:860,margin:"0 auto"}}>
      <div style={{textAlign:"center",padding:"16px 0"}}>
        <div style={S.badge}>✦ Hasil Asesmen</div>
        <h2 style={{fontSize:28,fontWeight:900,margin:"10px 0 4px",color:"#E2E8F0"}}>{siswa.nama}</h2>
        <p style={{color:"#475569",fontSize:13,margin:0}}>{siswa.nisn} · {siswa.sekolah} · {siswa.tanggalAsesmen}</p>
      </div>

      {siswa.kelasNama&&(
        <div style={{background:t0.color+"15",border:"2px solid "+t0.color+"55",borderRadius:16,
          padding:"16px 22px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <span style={{fontSize:34}}>🏫</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:t0.color,fontWeight:700,letterSpacing:1,marginBottom:3}}>KELAS YANG DITETAPKAN</div>
            <div style={{fontSize:22,fontWeight:900,color:"#E2E8F0"}}>{siswa.kelasNama}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"#475569",marginBottom:2}}>KESESUAIAN BAKAT</div>
            <div style={{fontSize:24,fontWeight:900,color:t0.color}}>{t0.pct}%</div>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {top.map((t,i)=>(
          <div key={t.id} style={{background:"#0F172A",border:"2px solid "+t.color,borderRadius:16,
            padding:18,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
            <div style={{fontSize:10,fontWeight:800,color:"#475569",letterSpacing:2}}>#{i+1}</div>
            <div style={{fontSize:32}}>{t.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:t.color}}>{t.label}</div>
            <div style={{fontSize:26,fontWeight:900,color:t.color}}>{t.pct}%</div>
            <div style={{width:"100%",height:5,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
              <div style={{width:t.pct+"%",height:"100%",background:t.color,borderRadius:99}}/>
            </div>
            <div style={{width:"100%",marginTop:5}}>
              <div style={{fontSize:10,color:"#94A3B8",marginBottom:4}}>Rekomendasi:</div>
              {JURUSAN[t.id].slice(0,3).map(j=>(
                <div key={j} style={{border:"1px solid "+t.color+"66",color:t.color,borderRadius:20,
                  padding:"2px 9px",fontSize:11,fontWeight:600,marginBottom:3}}>{j}</div>
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
          {(siswa.narasi||siswa.aiAnalisis||"").split("\n\n").map((para,i)=>(
            <p key={i} style={{color:"#CBD5E1",fontSize:14,lineHeight:1.9,margin:0,
              paddingLeft:14,borderLeft:"3px solid "+[t0.color,top[1]?.color,top[2]?.color][i]||t0.color+"66"}}>
              {para}
            </p>
          ))}
        </div>
      </div>

      <div style={{background:t0.color+"0D",border:"1px solid "+t0.color+"33",borderRadius:16,padding:20}}>
        <h3 style={{...S.cardTitle,color:t0.color}}>{t0.icon} Semua Rekomendasi — {t0.label}</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:10}}>
          {JURUSAN[t0.id].map(j=>(
            <div key={j} style={{border:"1px solid "+t0.color+"55",background:t0.color+"22",
              color:t0.color,borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:600}}>✓ {j}</div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",paddingBottom:8}}>
        {auth.role==="panitia"&&<button style={S.ghost} onClick={onDaftar}>← Data Siswa</button>}
        <button style={S.ghost} onClick={()=>doPrintSiswa(siswa)}>🖨 Cetak / PDF</button>
        <button style={S.cta} onClick={onBaru}>Asesmen Baru ✦</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════
function Dashboard({daftar,setDaftar,kelas,target,tab,setTab,onDetail,onBaru,onExport,onSetupUlang,onSaveKelas,onDeleteKelas,onUpdateKelasSiswa,onRefresh,dbLoading}) {
  if(tab==="data")  return <DaftarSiswa daftar={daftar} kelas={kelas} onDetail={onDetail} onBaru={onBaru} onExport={onExport} onUpdateKelasSiswa={onUpdateKelasSiswa}/>;
  if(tab==="kelas") return <ManajemenKelas kelas={kelas} daftar={daftar} setDaftar={setDaftar} target={target} onSaveKelas={onSaveKelas} onDeleteKelas={onDeleteKelas} dbLoading={dbLoading}/>;

  const counts={}; CAT.forEach(c=>counts[c.id]=0);
  daftar.forEach(s=>{if(s.top[0])counts[s.top[0].id]++;});
  const avg={};
  CAT.forEach(c=>{avg[c.id]=daftar.length?Math.round(daftar.reduce((s,x)=>s+x.scores[c.id],0)/daftar.length):0;});
  const totalKap=kelas.reduce((s,k)=>s+k.kapasitas,0);
  const topCat=daftar.length?CAT.find(c=>c.id===Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0])?.label||"-":"-";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={S.cardTitle}>Dashboard Panitia PPDB</h2>
          <p style={{color:"#475569",fontSize:13,margin:0}}>Statistik real-time asesmen bakat & minat siswa</p>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button style={S.ghost} onClick={onRefresh} disabled={dbLoading}>🔄 {dbLoading?"Memuat...":"Refresh"}</button>
          <button style={S.ghost} onClick={onSetupUlang}>⚙️ Setup Ulang</button>
          <button style={S.ghost} onClick={onBaru}>+ Asesmen Baru</button>
          <button style={{...S.cta,padding:"9px 16px",fontSize:14}} onClick={onExport} disabled={daftar.length===0}>📥 Excel</button>
        </div>
      </div>

      <div style={{background:"#0F172A",border:"1px solid #1E3A5F",borderRadius:14,padding:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#E2E8F0"}}>🎯 Progress Penerimaan Siswa Baru</div>
            <div style={{fontSize:12,color:"#475569",marginTop:2}}>Target: {target.min}–{target.max} siswa · {kelas.length} kelas · {totalKap} kursi</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20,fontWeight:900,color:daftar.length>=target.min?"#10B981":"#3B82F6"}}>
              {daftar.length} <span style={{fontSize:13,color:"#475569"}}>/ {target.max}</span>
            </div>
            <div style={{fontSize:11,color:"#475569"}}>siswa diasesemen</div>
          </div>
        </div>
        <div style={{height:11,background:"#1E293B",borderRadius:99,overflow:"hidden",position:"relative"}}>
          <div style={{width:Math.min((daftar.length/target.max)*100,100)+"%",height:"100%",borderRadius:99,transition:"width 0.6s",
            background:daftar.length>=target.max?"#EF4444":daftar.length>=target.min?"#10B981":"#3B82F6"}}/>
          <div style={{position:"absolute",top:0,left:(target.min/target.max*100)+"%",width:2,height:"100%",background:"#10B98166"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#475569",marginTop:5}}>
          <span style={{color:"#10B981"}}>▲ min ({target.min})</span>
          <span>{daftar.length>=target.min?"✅ Target minimum tercapai":"Butuh "+(target.min-daftar.length)+" siswa lagi"}</span>
          <span style={{color:"#F59E0B"}}>max ({target.max}) ▲</span>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:11}}>
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
          <h3 style={S.cardTitle}>🏫 Status Pemenuhan Kelas</h3>
          <button style={S.ghost} onClick={()=>setTab("kelas")}>Kelola Kelas →</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {kelas.map(k=>{
            const terisi=daftar.filter(s=>s.kelasId===k.id).length;
            const pct=Math.round((terisi/k.kapasitas)*100);
            const cat=CAT.find(c=>c.id===k.bidang);
            const col=pct>=100?"#EF4444":pct>=80?"#F59E0B":cat?.color||"#3B82F6";
            return (
              <div key={k.id} style={{background:"#0B1120",border:"1px solid "+col+"44",borderRadius:12,padding:13}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#E2E8F0"}}>{k.nama}</span>
                  <span style={{fontSize:11,fontWeight:800,color:col}}>{pct>=100?"PENUH":pct>=80?"HAMPIR":"TERSEDIA"}</span>
                </div>
                <div style={{height:7,background:"#1E293B",borderRadius:99,overflow:"hidden",marginBottom:4}}>
                  <div style={{width:Math.min(pct,100)+"%",height:"100%",background:col,borderRadius:99}}/>
                </div>
                <div style={{fontSize:11,color:"#475569"}}>{cat?.icon} {terisi}/{k.kapasitas} ({pct}%)</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={S.card}>
        <h3 style={S.cardTitle}>Distribusi Bakat Siswa</h3>
        <div style={{display:"flex",flexDirection:"column",gap:11,marginTop:12}}>
          {CAT.map(c=>{
            const pct=daftar.length?Math.round((counts[c.id]/daftar.length)*100):0;
            return (
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{minWidth:192,fontSize:13,color:"#CBD5E1"}}>{c.icon} {c.label}</span>
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
          <table style={{width:"100%",borderCollapse:"collapse"}}>
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
          </table>
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
function ManajemenKelas({kelas,daftar,setDaftar,target,onSaveKelas,onDeleteKelas,dbLoading}) {
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({});
  const [showAdd,setShowAdd]=useState(false);
  const [newK,setNewK]=useState({nama:"",bidang:"sains",kapasitas:30,wali:""});

  const totalKap=kelas.reduce((s,k)=>s+k.kapasitas,0);
  const totalTerisi=daftar.filter(s=>s.kelasId).length;
  const belum=daftar.filter(s=>!s.kelasId).length;
  const tMin=target?.min||0; const tMax=target?.max||totalKap;

  async function save(){
    const updated = kelas.map(k=>k.id===editId?{...k,...form,kapasitas:parseInt(form.kapasitas)||30}:k);
    await onSaveKelas(updated);
    setEditId(null);
  }
  async function del(kid){
    if(!window.confirm("Hapus kelas? Siswa yang terdaftar akan dilepas."))return;
    await onDeleteKelas(kid);
    setDaftar(prev=>prev.map(s=>s.kelasId===kid?{...s,kelasId:null,kelasNama:null}:s));
  }
  async function add(){
    const newKelas = [...kelas, {...newK,id:"k"+Date.now(),kapasitas:parseInt(newK.kapasitas)||30}];
    await onSaveKelas(newKelas);
    setNewK({nama:"",bidang:"sains",kapasitas:30,wali:""}); setShowAdd(false);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={S.cardTitle}>🏫 Manajemen Kelas & Pemenuhan</h2>
          <p style={{color:"#475569",fontSize:13,margin:0}}>{kelas.length} kelas · kapasitas {totalKap} kursi · target {tMin}–{tMax}</p>
        </div>
        <button style={S.cta} onClick={()=>setShowAdd(!showAdd)}>+ Tambah Kelas</button>
      </div>

      <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:14,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8,flexWrap:"wrap",gap:6}}>
          <span style={{color:"#94A3B8"}}>Ditempatkan: <strong style={{color:"#60A5FA"}}>{totalTerisi}/{totalKap}</strong></span>
          <span style={{color:"#94A3B8"}}>Target: <strong style={{color:"#10B981"}}>{tMin}–{tMax}</strong></span>
          <span style={{color:"#94A3B8",fontWeight:700}}>{Math.round((totalTerisi/(tMax||1))*100)}% dari maks</span>
        </div>
        <div style={{height:9,background:"#1E293B",borderRadius:99,overflow:"hidden",position:"relative"}}>
          <div style={{width:Math.min((totalTerisi/(tMax||1))*100,100)+"%",height:"100%",
            background:"linear-gradient(90deg,#3B82F6,#10B981)",borderRadius:99,transition:"width 0.8s"}}/>
          {tMin>0&&<div style={{position:"absolute",top:0,left:(tMin/(tMax||1)*100)+"%",width:2,height:"100%",background:"#10B98166"}}/>}
        </div>
        {belum>0&&(
          <div style={{marginTop:8,background:"#451A03",borderRadius:7,padding:"6px 10px",fontSize:12,color:"#F97316"}}>
            ⚠️ {belum} siswa belum mendapat kelas
          </div>
        )}
      </div>

      {showAdd&&(
        <div style={{...S.card,borderColor:"#3B82F655"}}>
          <h3 style={S.cardTitle}>Tambah Kelas Baru</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginTop:12}}>
            <div style={S.fg}><label style={S.lbl}>Nama Kelas</label><input style={S.inp} value={newK.nama} onChange={e=>setNewK({...newK,nama:e.target.value})} placeholder="Contoh: X-E"/></div>
            <div style={S.fg}><label style={S.lbl}>Kapasitas</label><input style={S.inp} type="number" value={newK.kapasitas} onChange={e=>setNewK({...newK,kapasitas:e.target.value})} placeholder="30"/></div>
            <div style={S.fg}><label style={S.lbl}>Bidang Dominan</label>
              <select style={S.inp} value={newK.bidang} onChange={e=>setNewK({...newK,bidang:e.target.value})}>
                {CAT.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select></div>
            <div style={S.fg}><label style={S.lbl}>Wali Kelas</label><input style={S.inp} value={newK.wali} onChange={e=>setNewK({...newK,wali:e.target.value})} placeholder="Nama wali kelas"/></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button style={S.cta} onClick={add} disabled={!newK.nama}>Tambah</button>
            <button style={S.ghost} onClick={()=>setShowAdd(false)}>Batal</button>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11}}>
        {kelas.map(k=>{
          const terisi=daftar.filter(s=>s.kelasId===k.id).length;
          const pct=Math.round((terisi/k.kapasitas)*100);
          const cat=CAT.find(c=>c.id===k.bidang);
          const col=pct>=100?"#EF4444":pct>=80?"#F59E0B":cat?.color||"#3B82F6";
          const isEd=editId===k.id;
          return (
            <div key={k.id} style={{background:"#0F172A",border:"1px solid "+col+"44",borderRadius:14,padding:15,display:"flex",flexDirection:"column",gap:8}}>
              {isEd?(
                <>
                  <input style={S.inp} value={form.nama||""} onChange={e=>setForm({...form,nama:e.target.value})} placeholder="Nama kelas"/>
                  <select style={S.inp} value={form.bidang||"sains"} onChange={e=>setForm({...form,bidang:e.target.value})}>
                    {CAT.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}</select>
                  <input style={S.inp} type="number" value={form.kapasitas||30} onChange={e=>setForm({...form,kapasitas:e.target.value})} placeholder="Kapasitas"/>
                  <input style={S.inp} value={form.wali||""} onChange={e=>setForm({...form,wali:e.target.value})} placeholder="Wali kelas"/>
                  <div style={{display:"flex",gap:6}}>
                    <button style={{...S.cta,padding:"6px 13px",fontSize:12,opacity:dbLoading?0.6:1}} onClick={save} disabled={dbLoading}>✓ {dbLoading?"Menyimpan...":"Simpan"}</button>
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
                  <div style={{height:7,background:"#1E293B",borderRadius:99,overflow:"hidden"}}>
                    <div style={{width:Math.min(pct,100)+"%",height:"100%",background:col,borderRadius:99,transition:"width 0.6s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                    <span style={{color:"#94A3B8"}}>{terisi} / {k.kapasitas} siswa</span>
                    <span style={{color:col,fontWeight:700}}>{pct}%</span>
                  </div>
                  {k.wali&&<div style={{fontSize:11,color:"#475569"}}>👤 {k.wali}</div>}
                  {terisi>0&&(
                    <div style={{background:"#0B1120",borderRadius:7,padding:"6px 9px",maxHeight:88,overflowY:"auto"}}>
                      {daftar.filter(s=>s.kelasId===k.id).map(s=>(
                        <div key={s.id} style={{fontSize:11,color:"#94A3B8",padding:"1px 0",borderBottom:"1px solid #1E293B22"}}>
                          {s.nama} <span style={{color:s.top[0]?.color,fontSize:10}}>({s.top[0]?.pct}%)</span>
                        </div>
                      ))}
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
    </div>
  );
}

// ══════════════════════════════════════════
// DAFTAR SISWA
// ══════════════════════════════════════════
function DaftarSiswa({daftar,kelas,onDetail,onBaru,onExport,onUpdateKelasSiswa}) {
  const [search,setSearch]=useState("");
  const [fCat,setFCat]=useState("all");
  const [fKelas,setFKelas]=useState("all");

  const filtered=daftar.filter(s=>{
    const ms=s.nama.toLowerCase().includes(search.toLowerCase())||s.nisn.includes(search)||s.sekolah.toLowerCase().includes(search.toLowerCase());
    const mc=fCat==="all"||s.top[0]?.id===fCat;
    const mk=fKelas==="all"||(fKelas==="none"?!s.kelasId:s.kelasId===fKelas);
    return ms&&mc&&mk;
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={S.cardTitle}>Data Peserta Asesmen</h2>
          <p style={{color:"#475569",fontSize:13,margin:0}}>{daftar.length} siswa · {filtered.length} ditampilkan</p>
        </div>
        <div style={{display:"flex",gap:7}}>
          <button style={S.ghost} onClick={onBaru}>+ Siswa Baru</button>
          <button style={{...S.cta,padding:"8px 14px",fontSize:13}} onClick={onExport} disabled={daftar.length===0}>📥 Excel</button>
          <button style={S.ghost} onClick={()=>daftar.forEach(s=>doPrintSiswa(s))} disabled={daftar.length===0}>🖨 Cetak</button>
        </div>
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <input style={{...S.inp,maxWidth:240,padding:"8px 11px"}} placeholder="🔍 Cari nama/NISN/sekolah..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select style={{...S.inp,maxWidth:185,padding:"8px 11px"}} value={fCat} onChange={e=>setFCat(e.target.value)}>
          <option value="all">Semua Bidang</option>
          {CAT.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        <select style={{...S.inp,maxWidth:165,padding:"8px 11px"}} value={fKelas} onChange={e=>setFKelas(e.target.value)}>
          <option value="all">Semua Kelas</option>
          <option value="none">Belum Ada Kelas</option>
          {kelas.map(k=><option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>

      {filtered.length===0?(
        <div style={{textAlign:"center",padding:52,background:"#0F172A",borderRadius:16,border:"1px solid #1E293B"}}>
          <div style={{fontSize:34,marginBottom:8}}>🔍</div>
          <p style={{color:"#475569"}}>Tidak ada data yang sesuai.</p>
        </div>
      ):(
        <div style={{overflowX:"auto",background:"#0F172A",borderRadius:14,border:"1px solid #1E293B"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["No","Nama","NISN","Sekolah","Bakat Utama","Skor","Kelas","Aksi"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((s,i)=>{
                const t=s.top[0];
                const k=kelas.find(x=>x.id===s.kelasId);
                return (
                  <tr key={s.id} style={S.tr}>
                    <td style={S.td}>{i+1}</td>
                    <td style={{...S.td,fontWeight:600,color:"#E2E8F0"}}>{s.nama}</td>
                    <td style={S.td}>{s.nisn}</td>
                    <td style={S.td}>{s.sekolah}</td>
                    <td style={S.td}><span style={{border:"1px solid "+t.color+"66",color:t.color,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600,display:"inline-block"}}>{t.icon} {t.label}</span></td>
                    <td style={{...S.td,color:t.color,fontWeight:700}}>{t.pct}%</td>
                    <td style={S.td}>
                      <select style={{background:"#1E293B",border:"1px solid #334155",color:k?"#60A5FA":"#EF4444",borderRadius:8,padding:"4px 7px",fontSize:12,cursor:"pointer"}}
                        value={s.kelasId||""}
                        onChange={e=>{
                          const kid=e.target.value||null;
                          const kn=kelas.find(x=>x.id===kid)?.nama||null;
                          onUpdateKelasSiswa(s.id, kid, kn);
                        }}>
                        <option value="">— Pilih —</option>
                        {kelas.map(kx=>{
                          const tr2=daftar.filter(ss=>ss.kelasId===kx.id).length;
                          const penuh=tr2>=kx.kapasitas&&s.kelasId!==kx.id;
                          return <option key={kx.id} value={kx.id} disabled={penuh}>{kx.nama} ({tr2}/{kx.kapasitas}){penuh?" PENUH":""}</option>;
                        })}
                      </select>
                    </td>
                    <td style={S.td}>
                      <div style={{display:"flex",gap:5}}>
                        <button style={S.detBtn} onClick={()=>onDetail(s)}>Detail</button>
                        <button style={{...S.detBtn,color:"#10B981",borderColor:"#10B98155"}} onClick={()=>doPrintSiswa(s)}>PDF</button>
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
_s.textContent="@keyframes spin{to{transform:rotate(360deg)}} input:focus,select:focus{border-color:#3B82F6!important}";
document.head.appendChild(_s);
