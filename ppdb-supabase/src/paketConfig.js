// src/paketConfig.js
// ══════════════════════════════════════════
// KONFIGURASI PAKET LISENSI
// ══════════════════════════════════════════

export const PAKET_LIST = [
  {
    id:         "starter",
    nama:       "🥉 Starter",
    durasi:     365,
    maksSiswa:  100,
    maksKelas:  4,
    maksAdmin:  1,
    harga:      250000,
    hargaStr:   "Rp 250.000 / tahun",
    deskripsi:  "Cocok untuk sekolah kecil",
    warna:      "#CD7F32",
    warnaLight: "#CD7F3222",
  },
  {
    id:         "growth",
    nama:       "🥈 Growth",
    durasi:     365,
    maksSiswa:  200,
    maksKelas:  6,
    maksAdmin:  2,
    harga:      350000,
    hargaStr:   "Rp 350.000 / tahun",
    deskripsi:  "Pilihan terbaik untuk sekolah berkembang",
    warna:      "#94A3B8",
    warnaLight: "#94A3B822",
  },
  {
    id:         "professional",
    nama:       "🥇 Professional",
    durasi:     365,
    maksSiswa:  350,
    maksKelas:  10,
    maksAdmin:  4,
    harga:      450000,
    hargaStr:   "Rp 450.000 / tahun",
    deskripsi:  "Untuk sekolah menengah aktif",
    warna:      "#F59E0B",
    warnaLight: "#F59E0B22",
  },
  {
    id:         "enterprise",
    nama:       "💎 Enterprise",
    durasi:     365,
    maksSiswa:  500,
    maksKelas:  15,
    maksAdmin:  6,
    harga:      600000,
    hargaStr:   "Rp 600.000 / tahun",
    deskripsi:  "Untuk sekolah besar & aktif",
    warna:      "#3B82F6",
    warnaLight: "#3B82F622",
  },
  {
    id:         "lifetime",
    nama:       "🚀 Lifetime",
    durasi:     null,        // null = unlimited
    maksSiswa:  null,        // null = unlimited
    maksKelas:  null,        // null = unlimited
    maksAdmin:  null,        // null = unlimited
    harga:      1000000,
    hargaStr:   "Rp 1.000.000 (selamanya)",
    deskripsi:  "Akses penuh tanpa batas waktu",
    warna:      "#8B5CF6",
    warnaLight: "#8B5CF622",
    popular:    true,
  },
];

export function getPaketById(id) {
  return PAKET_LIST.find(p => p.id === id) || null;
}

export function formatRupiah(angka) {
  return "Rp " + angka.toLocaleString("id-ID");
}
