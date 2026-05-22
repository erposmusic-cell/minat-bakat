// src/OwnerDashboard.jsx
import { useState, useEffect } from "react";
import {
  fetchAllSekolah, toggleAktifSekolah, deleteSekolah,
  fetchAllLisensi, createLisensi, updateLisensi, deleteLisensi, generateLisensiKey,
} from "./supabaseClient";

const S = {
  root:      { minHeight:"100vh", background:"#080E1A", color:"#E2E8F0", fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  header:    { background:"#0B1120", borderBottom:"1px solid #1A2744", position:"sticky", top:0, zIndex:100 },
  inner:     { maxWidth:1200, margin:"0 auto", padding:"11px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  main:      { maxWidth:1200, margin:"0 auto", padding:"26px 18px" },
  card:      { background:"#0F172A", border:"1px solid #1E293B", borderRadius:16, padding:24 },
  cardTitle: { fontSize:18, fontWeight:800, color:"#E2E8F0", marginTop:0, marginBottom:4 },
  badge:     { display:"inline-block", background:"#1E3A5F", color:"#60A5FA", borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:700 },
  cta:       { background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", color:"#fff", border:"none", borderRadius:10, padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer" },
  ctaGreen:  { background:"linear-gradient(135deg,#10B981,#059669)", color:"#fff", border:"none", borderRadius:10, padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer" },
  ghost:     { background:"transparent", border:"1px solid #1E293B", color:"#94A3B8", borderRadius:10, padding:"7px 14px", cursor:"pointer", fontSize:13 },
  th:        { padding:"10px 12px", textAlign:"left", fontSize:11, color:"#475569", fontWeight:700, borderBottom:"1px solid #1E293B", whiteSpace:"nowrap" },
  td:        { padding:"10px 12px", fontSize:13, color:"#94A3B8", whiteSpace:"nowrap" },
  tr:        { borderBottom:"1px solid #0B112088" },
  inp:       { width:"100%", background:"#0B1120", border:"1px solid #1E293B", color:"#E2E8F0", borderRadius:8, padding:"8px 12px", fontSize:13, outline:"none", boxSizing:"border-box" },
  lbl:       { fontSize:12, color:"#475569", fontWeight:600, display:"block", marginBottom:4 },
  fg:        { marginBottom:12 },
};

// ── Helper: sisa hari ──
function sisaHari(tglExpired) {
  const diff = Math.ceil((new Date(tglExpired) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function statusLisensi(tglExpired) {
  const sisa = sisaHari(tglExpired);
  if (sisa < 0)  return { label:"Expired",     color:"#EF4444", bg:"#450a0a" };
  if (sisa <= 7) return { label:`⚠️ ${sisa}h lagi`, color:"#F59E0B", bg:"#451A03" };
  return { label:`✅ ${sisa}h lagi`, color:"#4ade80", bg:"#052e16" };
}

// ── Modal Tambah/Edit Lisensi ──
function ModalLisensi({ sekolahList, lisensiEdit, onSave, onClose }) {
  const isEdit = !!lisensiEdit;
  const defaultExpired = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [schoolId,    setSchoolId]    = useState(lisensiEdit?.school_id || "");
  const [lisensiKey,  setLisensiKey]  = useState(lisensiEdit?.lisensi_key || generateLisensiKey());
  const [tglMulai,    setTglMulai]    = useState(lisensiEdit?.tgl_mulai   || new Date().toISOString().slice(0, 10));
  const [tglExpired,  setTglExpired]  = useState(lisensiEdit?.tgl_expired || defaultExpired);
  const [catatan,     setCatatan]     = useState(lisensiEdit?.catatan      || "");
  const [loading,     setLoading]     = useState(false);
  const [err,         setErr]         = useState("");

  async function handleSave() {
    if (!isEdit && !schoolId) return setErr("Pilih sekolah terlebih dahulu.");
    if (!tglExpired)           return setErr("Tanggal expired wajib diisi.");
    setLoading(true); setErr("");
    try {
      await onSave({ schoolId, lisensiKey, tglMulai, tglExpired, catatan, id: lisensiEdit?.id });
      onClose();
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000088", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ ...S.card, width:"100%", maxWidth:460, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ ...S.cardTitle, margin:0 }}>{isEdit ? "✏️ Edit Lisensi" : "➕ Tambah Lisensi"}</h3>
          <button style={{ ...S.ghost, padding:"4px 10px" }} onClick={onClose}>✕</button>
        </div>

        {!isEdit && (
          <div style={S.fg}>
            <label style={S.lbl}>Sekolah</label>
            <select style={S.inp} value={schoolId} onChange={e => setSchoolId(e.target.value)}>
              <option value="">-- Pilih Sekolah --</option>
              {sekolahList.map(s => (
                <option key={s.id} value={s.id}>{s.nama} ({s.kode})</option>
              ))}
            </select>
          </div>
        )}

        <div style={S.fg}>
          <label style={S.lbl}>Lisensi Key</label>
          <div style={{ display:"flex", gap:8 }}>
            <input style={{ ...S.inp, fontFamily:"monospace", letterSpacing:2 }}
              value={lisensiKey} onChange={e => setLisensiKey(e.target.value.toUpperCase())} readOnly={isEdit} />
            {!isEdit && (
              <button style={{ ...S.ghost, whiteSpace:"nowrap", padding:"8px 12px" }}
                onClick={() => setLisensiKey(generateLisensiKey())}>🔄 Generate</button>
            )}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={S.fg}>
            <label style={S.lbl}>Tgl Mulai</label>
            <input style={S.inp} type="date" value={tglMulai} onChange={e => setTglMulai(e.target.value)} disabled={isEdit} />
          </div>
          <div style={S.fg}>
            <label style={S.lbl}>Tgl Expired</label>
            <input style={S.inp} type="date" value={tglExpired} onChange={e => setTglExpired(e.target.value)} />
          </div>
        </div>

        <div style={S.fg}>
          <label style={S.lbl}>Catatan (opsional)</label>
          <input style={S.inp} placeholder="misal: Paket 1 Tahun" value={catatan} onChange={e => setCatatan(e.target.value)} />
        </div>

        {err && <div style={{ background:"#450a0a", color:"#EF4444", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:12 }}>{err}</div>}

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button style={S.ghost} onClick={onClose}>Batal</button>
          <button style={S.ctaGreen} onClick={handleSave} disabled={loading}>
            {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Lisensi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function OwnerDashboard({ auth, onLogout }) {
  const [tab,       setTab]     = useState("sekolah"); // sekolah | lisensi
  const [sekolah,   setSekolah] = useState([]);
  const [lisensi,   setLisensi] = useState([]);
  const [loading,   setLoading] = useState(true);
  const [filter,    setFilter]  = useState("semua");
  const [showModal, setShowModal] = useState(false);
  const [lisensiEdit, setLisensiEdit] = useState(null);
  const [copied,    setCopied]  = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([fetchAllSekolah(), fetchAllLisensi()]);
      setSekolah(s);
      setLisensi(l);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(id, aktif) {
    await toggleAktifSekolah(id, aktif);
    setSekolah(prev => prev.map(s => s.id === id ? { ...s, aktif } : s));
  }

  async function handleDeleteSekolah(id, nama) {
    if (!window.confirm(`Hapus sekolah "${nama}"? Semua data termasuk lisensi akan terhapus.`)) return;
    await deleteSekolah(id);
    setSekolah(prev => prev.filter(s => s.id !== id));
    setLisensi(prev => prev.filter(l => l.school_id !== id));
  }

  async function handleSaveLisensi({ id, schoolId, lisensiKey, tglMulai, tglExpired, catatan }) {
    if (id) {
      await updateLisensi(id, { tglExpired, catatan });
    } else {
      await createLisensi({ schoolId, lisensiKey, tglMulai, tglExpired, catatan });
    }
    const l = await fetchAllLisensi();
    setLisensi(l);
  }

  async function handleDeleteLisensi(id, key) {
    if (!window.confirm(`Hapus lisensi "${key}"?`)) return;
    await deleteLisensi(id);
    setLisensi(prev => prev.filter(l => l.id !== id));
  }

  function copyKey(key) {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const filtered = sekolah.filter(s =>
    filter === "semua" ? true : filter === "aktif" ? s.aktif : !s.aktif
  );

  const totalAktif    = sekolah.filter(s => s.aktif).length;
  const totalPending  = sekolah.filter(s => !s.aktif).length;
  const totalExpired  = lisensi.filter(l => sisaHari(l.tgl_expired) < 0).length;
  const totalSegera   = lisensi.filter(l => { const s = sisaHari(l.tgl_expired); return s >= 0 && s <= 7; }).length;

  return (
    <div style={S.root}>
      {/* Modal */}
      {showModal && (
        <ModalLisensi
          sekolahList={sekolah}
          lisensiEdit={lisensiEdit}
          onSave={handleSaveLisensi}
          onClose={() => { setShowModal(false); setLisensiEdit(null); }}
        />
      )}

      {/* Header */}
      <header style={S.header}>
        <div style={S.inner}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:26, color:"#3B82F6" }}>◈</span>
            <div>
              <div style={{ fontWeight:800, fontSize:14 }}>OWNER DASHBOARD</div>
              <div style={{ fontSize:11, color:"#475569" }}>Manajemen Sekolah & Lisensi</div>
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
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:20 }}>
          {[
            ["Total Sekolah",  sekolah.length,  "#3B82F6", "🏫"],
            ["Aktif",          totalAktif,       "#10B981", "✅"],
            ["Pending",        totalPending,     "#F59E0B", "⏳"],
            ["Lisensi Expired",totalExpired,     "#EF4444", "❌"],
            ["Expired < 7hr",  totalSegera,      "#F97316", "⚠️"],
          ].map(([lbl, val, col, icon]) => (
            <div key={lbl} style={{ background:"#0F172A", border:"1px solid #1E293B", borderRadius:14, padding:18 }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:22, fontWeight:900, color:col }}>{val}</div>
              <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Alert pending */}
        {totalPending > 0 && (
          <div style={{ background:"#451A03", border:"1px solid #F59E0B44", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div>
              <div style={{ color:"#F59E0B", fontWeight:700, fontSize:14 }}>{totalPending} sekolah menunggu aktivasi</div>
              <div style={{ color:"#92400e", fontSize:12 }}>Aktifkan sekolah yang sudah membayar</div>
            </div>
            <button style={{ ...S.cta, marginLeft:"auto", background:"#F59E0B" }} onClick={() => { setTab("sekolah"); setFilter("pending"); }}>Lihat →</button>
          </div>
        )}

        {/* Alert lisensi expired */}
        {totalExpired > 0 && (
          <div style={{ background:"#450a0a", border:"1px solid #EF444444", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>❌</span>
            <div>
              <div style={{ color:"#EF4444", fontWeight:700, fontSize:14 }}>{totalExpired} lisensi sudah expired</div>
              <div style={{ color:"#7f1d1d", fontSize:12 }}>Sekolah tersebut tidak bisa login hingga lisensi diperbarui</div>
            </div>
            <button style={{ ...S.cta, marginLeft:"auto", background:"#EF4444" }} onClick={() => setTab("lisensi")}>Kelola →</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display:"flex", gap:6, marginBottom:20 }}>
          {[["sekolah","🏫 Sekolah"],["lisensi","🔑 Lisensi"]].map(([t, lbl]) => (
            <button key={t} style={{
              ...S.ghost, fontWeight:700, fontSize:14,
              ...(tab === t ? { background:"#1E3A5F", color:"#60A5FA", borderColor:"#1E3A5F" } : {})
            }} onClick={() => setTab(t)}>{lbl}</button>
          ))}
        </div>

        {/* ── TAB: SEKOLAH ── */}
        {tab === "sekolah" && (
          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <div>
                <h2 style={S.cardTitle}>🏫 Daftar Sekolah</h2>
                <p style={{ color:"#475569", fontSize:13, margin:0 }}>{filtered.length} sekolah ditampilkan</p>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
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
                    <tr>{["No","Nama Sekolah","Kode","Alamat","Tgl Daftar","Status","Lisensi","Aksi"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const lis = lisensi.filter(l => l.school_id === s.id).sort((a,b)=>new Date(b.tgl_expired)-new Date(a.tgl_expired))[0];
                      const st  = lis ? statusLisensi(lis.tgl_expired) : null;
                      return (
                        <tr key={s.id} style={S.tr}>
                          <td style={S.td}>{i+1}</td>
                          <td style={{ ...S.td, fontWeight:600, color:"#E2E8F0" }}>{s.nama}</td>
                          <td style={S.td}>
                            <span style={{ background:"#1E293B", color:"#60A5FA", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{s.kode}</span>
                          </td>
                          <td style={{ ...S.td, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis" }}>{s.alamat||"-"}</td>
                          <td style={S.td}>{s.created_at ? new Date(s.created_at).toLocaleDateString("id-ID") : "-"}</td>
                          <td style={S.td}>
                            <span style={{ background: s.aktif ? "#052e16" : "#451A03", color: s.aktif ? "#4ade80" : "#F59E0B", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                              {s.aktif ? "✅ Aktif" : "⏳ Pending"}
                            </span>
                          </td>
                          <td style={S.td}>
                            {st ? (
                              <span style={{ background:st.bg, color:st.color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{st.label}</span>
                            ) : (
                              <span style={{ color:"#475569", fontSize:11 }}>— Belum ada</span>
                            )}
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
                                onClick={() => handleDeleteSekolah(s.id, s.nama)}>🗑</button>
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
        )}

        {/* ── TAB: LISENSI ── */}
        {tab === "lisensi" && (
          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <div>
                <h2 style={S.cardTitle}>🔑 Manajemen Lisensi</h2>
                <p style={{ color:"#475569", fontSize:13, margin:0 }}>{lisensi.length} lisensi terdaftar</p>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button style={S.ghost} onClick={load} disabled={loading}>🔄 Refresh</button>
                <button style={S.ctaGreen} onClick={() => { setLisensiEdit(null); setShowModal(true); }}>➕ Tambah Lisensi</button>
              </div>
            </div>

            {lisensi.length === 0 ? (
              <div style={{ textAlign:"center", padding:40, color:"#475569" }}>
                {loading ? "Memuat data..." : "Belum ada lisensi. Klik 'Tambah Lisensi' untuk mulai."}
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr>{["No","Sekolah","Lisensi Key","Tgl Mulai","Tgl Expired","Status","Catatan","Aksi"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {lisensi.map((l, i) => {
                      const st = statusLisensi(l.tgl_expired);
                      return (
                        <tr key={l.id} style={S.tr}>
                          <td style={S.td}>{i+1}</td>
                          <td style={{ ...S.td, fontWeight:600, color:"#E2E8F0" }}>
                            {l.sekolah?.nama || "-"}
                            <div style={{ fontSize:11, color:"#475569" }}>{l.sekolah?.kode}</div>
                          </td>
                          <td style={S.td}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontFamily:"monospace", fontSize:12, color:"#93C5FD", letterSpacing:1 }}>{l.lisensi_key}</span>
                              <button title="Salin" style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, padding:2 }}
                                onClick={() => copyKey(l.lisensi_key)}>
                                {copied === l.lisensi_key ? "✅" : "📋"}
                              </button>
                            </div>
                          </td>
                          <td style={S.td}>{l.tgl_mulai ? new Date(l.tgl_mulai).toLocaleDateString("id-ID") : "-"}</td>
                          <td style={S.td}>{l.tgl_expired ? new Date(l.tgl_expired).toLocaleDateString("id-ID") : "-"}</td>
                          <td style={S.td}>
                            <span style={{ background:st.bg, color:st.color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{st.label}</span>
                          </td>
                          <td style={{ ...S.td, maxWidth:140, overflow:"hidden", textOverflow:"ellipsis" }}>{l.catatan||"-"}</td>
                          <td style={S.td}>
                            <div style={{ display:"flex", gap:5 }}>
                              <button style={{ ...S.ghost, padding:"4px 10px", fontSize:11, color:"#60A5FA", borderColor:"#60A5FA44" }}
                                onClick={() => { setLisensiEdit(l); setShowModal(true); }}>✏️ Edit</button>
                              <button style={{ ...S.ghost, padding:"4px 9px", fontSize:11, color:"#EF4444", borderColor:"#EF444433" }}
                                onClick={() => handleDeleteLisensi(l.id, l.lisensi_key)}>🗑</button>
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
        )}

        {/* Panduan */}
        <div style={{ ...S.card, marginTop:16, borderColor:"#1E3A5F" }}>
          <h3 style={{ ...S.cardTitle, fontSize:14 }}>📋 Panduan Lisensi</h3>
          <div style={{ color:"#475569", fontSize:13, lineHeight:2 }}>
            1. Sekolah mendaftar → lisensi <strong style={{ color:"#F59E0B" }}>trial 30 hari</strong> dibuat otomatis<br/>
            2. Setelah pembayaran → klik <strong style={{ color:"#10B981" }}>Tambah Lisensi</strong> dengan tanggal baru<br/>
            3. Salin 📋 lisensi key dan kirim ke panitia sekolah (untuk referensi)<br/>
            4. Lisensi expired → panitia tidak bisa login, siswa tidak bisa asesmen<br/>
            5. Perpanjang dengan klik ✏️ <strong style={{ color:"#60A5FA" }}>Edit</strong> dan ubah tanggal expired
          </div>
        </div>
      </main>
    </div>
  );
}
