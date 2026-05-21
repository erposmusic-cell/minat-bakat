// src/OwnerDashboard.jsx
import { useState, useEffect } from "react";
import { fetchAllSekolah, toggleAktifSekolah, deleteSekolah } from "./supabaseClient";

const S = {
  root:      { minHeight:"100vh", background:"#080E1A", color:"#E2E8F0", fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  header:    { background:"#0B1120", borderBottom:"1px solid #1A2744", position:"sticky", top:0, zIndex:100 },
  inner:     { maxWidth:1100, margin:"0 auto", padding:"11px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  main:      { maxWidth:1100, margin:"0 auto", padding:"26px 18px" },
  card:      { background:"#0F172A", border:"1px solid #1E293B", borderRadius:16, padding:24 },
  cardTitle: { fontSize:18, fontWeight:800, color:"#E2E8F0", marginTop:0, marginBottom:4 },
  badge:     { display:"inline-block", background:"#1E3A5F", color:"#60A5FA", borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:700 },
  cta:       { background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", color:"#fff", border:"none", borderRadius:10, padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer" },
  ghost:     { background:"transparent", border:"1px solid #1E293B", color:"#94A3B8", borderRadius:10, padding:"7px 14px", cursor:"pointer", fontSize:13 },
  th:        { padding:"10px 12px", textAlign:"left", fontSize:11, color:"#475569", fontWeight:700, borderBottom:"1px solid #1E293B", whiteSpace:"nowrap" },
  td:        { padding:"10px 12px", fontSize:13, color:"#94A3B8", whiteSpace:"nowrap" },
  tr:        { borderBottom:"1px solid #0B112088" },
};

export default function OwnerDashboard({ auth, onLogout }) {
  const [sekolah, setSekolah] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("semua"); // semua | aktif | pending

  async function load() {
    setLoading(true);
    try { setSekolah(await fetchAllSekolah()); }
    catch(e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(id, aktif) {
    await toggleAktifSekolah(id, aktif);
    setSekolah(prev => prev.map(s => s.id === id ? { ...s, aktif } : s));
  }

  async function handleDelete(id, nama) {
    if (!window.confirm(`Hapus sekolah "${nama}"? Semua data akan terhapus.`)) return;
    await deleteSekolah(id);
    setSekolah(prev => prev.filter(s => s.id !== id));
  }

  const filtered = sekolah.filter(s =>
    filter === "semua" ? true : filter === "aktif" ? s.aktif : !s.aktif
  );

  const totalAktif   = sekolah.filter(s => s.aktif).length;
  const totalPending = sekolah.filter(s => !s.aktif).length;

  return (
    <div style={S.root}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.inner}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:26, color:"#3B82F6" }}>◈</span>
            <div>
              <div style={{ fontWeight:800, fontSize:14 }}>OWNER DASHBOARD</div>
              <div style={{ fontSize:11, color:"#475569" }}>Manajemen Sekolah — Admin Master</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:13, color:"#475569" }}>Halo, {auth.nama}</span>
            <button style={S.ghost} onClick={onLogout}>Keluar</button>
          </div>
        </div>
      </header>

      <main style={S.main}>
        {/* Statistik */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
          {[
            ["Total Sekolah", sekolah.length, "#3B82F6", "🏫"],
            ["Aktif", totalAktif, "#10B981", "✅"],
            ["Menunggu", totalPending, "#F59E0B", "⏳"],
          ].map(([lbl, val, col, icon]) => (
            <div key={lbl} style={{ background:"#0F172A", border:"1px solid #1E293B", borderRadius:14, padding:18 }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
              <div style={{ fontSize:24, fontWeight:900, color:col }}>{val}</div>
              <div style={{ fontSize:12, color:"#475569", marginTop:3 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Notifikasi pending */}
        {totalPending > 0 && (
          <div style={{ background:"#451A03", border:"1px solid #F59E0B44", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div>
              <div style={{ color:"#F59E0B", fontWeight:700, fontSize:14 }}>{totalPending} sekolah menunggu aktivasi</div>
              <div style={{ color:"#92400e", fontSize:12 }}>Aktifkan sekolah yang sudah membayar</div>
            </div>
            <button style={{ ...S.cta, marginLeft:"auto", background:"#F59E0B" }} onClick={() => setFilter("pending")}>Lihat →</button>
          </div>
        )}

        {/* Tabel Sekolah */}
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <div>
              <h2 style={S.cardTitle}>🏫 Daftar Sekolah</h2>
              <p style={{ color:"#475569", fontSize:13, margin:0 }}>{filtered.length} sekolah ditampilkan</p>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {["semua","aktif","pending"].map(f => (
                <button key={f} style={{ ...S.ghost, ...(filter===f?{background:"#1E3A5F",color:"#60A5FA",borderColor:"#1E3A5F"}:{}) }}
                  onClick={() => setFilter(f)}>
                  {f==="semua"?"Semua":f==="aktif"?"Aktif":"Pending"}
                </button>
              ))}
              <button style={S.ghost} onClick={load} disabled={loading}>🔄 {loading?"Memuat...":"Refresh"}</button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:40, color:"#475569" }}>
              {loading ? "Memuat data..." : "Tidak ada data."}
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>{["No","Nama Sekolah","Kode","Alamat","Tgl Daftar","Status","Aksi"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} style={S.tr}>
                      <td style={S.td}>{i+1}</td>
                      <td style={{ ...S.td, fontWeight:600, color:"#E2E8F0" }}>{s.nama}</td>
                      <td style={S.td}>
                        <span style={{ background:"#1E293B", color:"#60A5FA", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{s.kode}</span>
                      </td>
                      <td style={{ ...S.td, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis" }}>{s.alamat||"-"}</td>
                      <td style={S.td}>{s.created_at ? new Date(s.created_at).toLocaleDateString("id-ID") : "-"}</td>
                      <td style={S.td}>
                        <span style={{
                          background: s.aktif ? "#052e16" : "#451A03",
                          color: s.aktif ? "#4ade80" : "#F59E0B",
                          borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700
                        }}>
                          {s.aktif ? "✅ Aktif" : "⏳ Pending"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <div style={{ display:"flex", gap:5 }}>
                          {s.aktif ? (
                            <button style={{ ...S.ghost, padding:"4px 10px", fontSize:11, color:"#F59E0B", borderColor:"#F59E0B44" }}
                              onClick={() => handleToggle(s.id, false)}>Nonaktifkan</button>
                          ) : (
                            <button style={{ ...S.cta, padding:"4px 12px", fontSize:11 }}
                              onClick={() => handleToggle(s.id, true)}>Aktifkan</button>
                          )}
                          <button style={{ ...S.ghost, padding:"4px 9px", fontSize:11, color:"#EF4444", borderColor:"#EF444433" }}
                            onClick={() => handleDelete(s.id, s.nama)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panduan */}
        <div style={{ ...S.card, marginTop:16, borderColor:"#1E3A5F" }}>
          <h3 style={{ ...S.cardTitle, fontSize:14 }}>📋 Panduan Aktivasi</h3>
          <div style={{ color:"#475569", fontSize:13, lineHeight:2 }}>
            1. Sekolah mendaftar → status otomatis <strong style={{ color:"#F59E0B" }}>Pending</strong><br/>
            2. Sekolah mengirim bukti pembayaran ke Anda<br/>
            3. Klik <strong style={{ color:"#10B981" }}>Aktifkan</strong> → sekolah bisa langsung login<br/>
            4. Jika masa berlangganan habis → klik <strong style={{ color:"#F59E0B" }}>Nonaktifkan</strong>
          </div>
        </div>
      </main>
    </div>
  );
}
