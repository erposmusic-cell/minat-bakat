// src/OwnerDashboard.jsx
import { useState, useEffect } from "react";
import {
  supabase,
  fetchAllSekolah, toggleAktifSekolah, deleteSekolah,
  fetchAllLisensi, createLisensi, updateLisensi, deleteLisensi, generateLisensiKey,
  ownerResetPassword, fetchPanitiaBySchool, updateEmailPanitia,
} from "./supabaseClient";
import { PAKET_LIST, getPaketById, formatRupiah } from "./paketConfig";

const S = {
  root:      { minHeight:"100vh", background:"#080E1A", color:"#E2E8F0", fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  header:    { background:"#0B1120", borderBottom:"1px solid #1A2744", position:"sticky", top:0, zIndex:100 },
  inner:     { maxWidth:1200, margin:"0 auto", padding:"11px 18px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  main:      { maxWidth:1200, margin:"0 auto", padding:"26px 18px" },
  card:      { background:"#0F172A", border:"1px solid #1E293B", borderRadius:16, padding:24 },
  cardTitle: { fontSize:18, fontWeight:800, color:"#E2E8F0", marginTop:0, marginBottom:4 },
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

function sisaHari(tgl) {
  if (!tgl) return null; // lifetime
  return Math.ceil((new Date(tgl) - new Date()) / (1000 * 60 * 60 * 24));
}

function statusLisensi(tgl) {
  if (!tgl) return { label:"🚀 Lifetime", color:"#A78BFA", bg:"#2e1065" };
  const sisa = sisaHari(tgl);
  if (sisa < 0)  return { label:"Expired",          color:"#EF4444", bg:"#450a0a" };
  if (sisa <= 7) return { label:`⚠️ ${sisa}h lagi`, color:"#F59E0B", bg:"#451A03" };
  return { label:`✅ ${sisa}h lagi`, color:"#4ade80", bg:"#052e16" };
}

// ── Kartu pilih paket ──
function PaketCard({ paket, selected, onSelect }) {
  const isSelected = selected === paket.id;
  return (
    <div onClick={() => onSelect(paket.id)} style={{
      border: `2px solid ${isSelected ? paket.warna : "#1E293B"}`,
      background: isSelected ? paket.warnaLight : "#0B1120",
      borderRadius: 12, padding: "14px 16px", cursor: "pointer", position: "relative",
      transition: "all 0.15s",
    }}>
      {paket.popular && (
        <div style={{ position:"absolute", top:-10, right:12, background:"#8B5CF6", color:"#fff", fontSize:10, fontWeight:800, borderRadius:20, padding:"2px 10px" }}>POPULER</div>
      )}
      <div style={{ fontWeight:800, fontSize:14, color: isSelected ? paket.warna : "#E2E8F0", marginBottom:4 }}>{paket.nama}</div>
      <div style={{ fontSize:12, color:"#475569", marginBottom:8 }}>{paket.deskripsi}</div>
      <div style={{ fontSize:15, fontWeight:900, color: paket.warna, marginBottom:6 }}>{paket.hargaStr}</div>
      <div style={{ fontSize:11, color:"#64748B", lineHeight:1.8 }}>
        👤 {paket.maksSiswa ? `${paket.maksSiswa} siswa` : "Unlimited siswa"}<br/>
        🏫 {paket.maksKelas ? `${paket.maksKelas} kelas` : "Unlimited kelas"}<br/>
        📅 {paket.durasi ? `${paket.durasi} hari` : "Selamanya"}
      </div>
    </div>
  );
}

// ── Modal Tambah/Edit Lisensi ──
function ModalLisensi({ sekolahList, lisensiEdit, onSave, onClose }) {
  const isEdit = !!lisensiEdit;
  const initPaket = lisensiEdit ? getPaketById(lisensiEdit.paket) || PAKET_LIST[0] : PAKET_LIST[0];

  const [schoolId,   setSchoolId]   = useState(lisensiEdit?.school_id || "");
  const [lisensiKey, setLisensiKey] = useState(lisensiEdit?.lisensi_key || generateLisensiKey());
  const [paketId,    setPaketId]    = useState(initPaket.id);
  const [tglMulai,   setTglMulai]   = useState(lisensiEdit?.tgl_mulai || new Date().toISOString().slice(0,10));
  const [catatan,    setCatatan]    = useState(lisensiEdit?.catatan || "");
  const [loading,    setLoading]    = useState(false);
  const [err,        setErr]        = useState("");

  const paketDipilih = getPaketById(paketId);

  // Hitung tgl_expired otomatis dari paket
  function getTglExpired() {
    if (!paketDipilih?.durasi) return null; // lifetime
    const d = new Date(tglMulai);
    d.setDate(d.getDate() + paketDipilih.durasi);
    return d.toISOString().slice(0,10);
  }

  async function handleSave() {
    if (!isEdit && !schoolId) return setErr("Pilih sekolah terlebih dahulu.");
    setLoading(true); setErr("");
    try {
      const tglExpired = getTglExpired();
      await onSave({
        id:        lisensiEdit?.id,
        schoolId,
        lisensiKey,
        paket:     paketId,
        maksSiswa: paketDipilih?.maksSiswa ?? null,
        maksKelas: paketDipilih?.maksKelas ?? null,
        tglMulai,
        tglExpired,
        catatan,
      });
      onClose();
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000099", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
      <div style={{ ...S.card, width:"100%", maxWidth:560, maxHeight:"92vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ ...S.cardTitle, margin:0 }}>{isEdit ? "✏️ Edit Lisensi" : "➕ Tambah Lisensi"}</h3>
          <button style={{ ...S.ghost, padding:"4px 10px" }} onClick={onClose}>✕</button>
        </div>

        {!isEdit && (
          <div style={S.fg}>
            <label style={S.lbl}>Sekolah</label>
            <select style={S.inp} value={schoolId} onChange={e => setSchoolId(e.target.value)}>
              <option value="">-- Pilih Sekolah --</option>
              {sekolahList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.kode})</option>)}
            </select>
          </div>
        )}

        {/* Pilih Paket */}
        <div style={S.fg}>
          <label style={S.lbl}>Pilih Paket</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:6 }}>
            {PAKET_LIST.map(p => (
              <PaketCard key={p.id} paket={p} selected={paketId} onSelect={setPaketId} />
            ))}
          </div>
        </div>

        {/* Ringkasan paket dipilih */}
        {paketDipilih && (
          <div style={{ background:"#0B1120", border:`1px solid ${paketDipilih.warna}44`, borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ fontSize:12, color:"#475569", marginBottom:6, fontWeight:700 }}>RINGKASAN PAKET</div>
            <div style={{ display:"flex", gap:20, flexWrap:"wrap", fontSize:13 }}>
              <span style={{ color:"#E2E8F0" }}>📦 <strong>{paketDipilih.nama}</strong></span>
              <span style={{ color:"#94A3B8" }}>👤 {paketDipilih.maksSiswa ?? "∞"} siswa</span>
              <span style={{ color:"#94A3B8" }}>🏫 {paketDipilih.maksKelas ?? "∞"} kelas</span>
              <span style={{ color:"#94A3B8" }}>📅 {paketDipilih.durasi ? `${paketDipilih.durasi} hari` : "Selamanya"}</span>
              <span style={{ color: paketDipilih.warna, fontWeight:700 }}>{paketDipilih.hargaStr}</span>
            </div>
            {paketDipilih.durasi && (
              <div style={{ fontSize:12, color:"#475569", marginTop:6 }}>
                Expired: <strong style={{ color:"#E2E8F0" }}>{getTglExpired() ? new Date(getTglExpired()).toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"}) : "-"}</strong>
              </div>
            )}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={S.fg}>
            <label style={S.lbl}>Tanggal Mulai</label>
            <input style={S.inp} type="date" value={tglMulai} onChange={e => setTglMulai(e.target.value)} />
          </div>
          <div style={S.fg}>
            <label style={S.lbl}>Lisensi Key</label>
            <div style={{ display:"flex", gap:6 }}>
              <input style={{ ...S.inp, fontFamily:"monospace", fontSize:11, letterSpacing:1 }}
                value={lisensiKey} onChange={e => setLisensiKey(e.target.value.toUpperCase())} readOnly={isEdit} />
              {!isEdit && (
                <button style={{ ...S.ghost, padding:"6px 8px", fontSize:12 }} onClick={() => setLisensiKey(generateLisensiKey())}>🔄</button>
              )}
            </div>
          </div>
        </div>

        <div style={S.fg}>
          <label style={S.lbl}>Catatan (opsional)</label>
          <input style={S.inp} placeholder="misal: Sudah transfer 15 Mei 2026" value={catatan} onChange={e => setCatatan(e.target.value)} />
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
  const [tab,        setTab]      = useState("sekolah");
  const [sekolah,    setSekolah]  = useState([]);
  const [lisensi,    setLisensi]  = useState([]);
  const [loading,    setLoading]  = useState(true);
  const [filter,     setFilter]   = useState("semua");
  const [showModal,  setShowModal]  = useState(false);
  const [lisensiEdit,setLisensiEdit] = useState(null);
  const [copied,     setCopied]   = useState(null);
  const [resetModal, setResetModal] = useState(null); // { schoolId, nama }
  const [resetPass,  setResetPass]  = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg,   setResetMsg]   = useState("");

  async function load() {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([fetchAllSekolah(), fetchAllLisensi()]);
      setSekolah(s); setLisensi(l);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(id, aktif) {
    await toggleAktifSekolah(id, aktif);
    setSekolah(prev => prev.map(s => s.id === id ? { ...s, aktif } : s));
  }

  async function openResetModal(schoolId, nama) {
    setResetModal({ schoolId, nama });
    setResetPass(""); setResetEmail(""); setResetMsg("");
    setResetLoading(true);
    try {
      const panitia = await fetchPanitiaBySchool(schoolId);
      if (panitia?.email) setResetEmail(panitia.email);
    } catch(e) {}
    setResetLoading(false);
  }

  async function handleOwnerReset() {
    if (!resetPass || resetPass.length < 6) {
      setResetMsg("❌ Password minimal 6 karakter.");
      return;
    }
    setResetLoading(true);
    try {
      // Update email jika diisi
      if (resetEmail) await updateEmailPanitia(resetModal.schoolId, resetEmail);
      // Reset password
      await ownerResetPassword(resetModal.schoolId, resetPass);
      setResetMsg("✅ Password berhasil direset!");
      setTimeout(() => { setResetModal(null); setResetMsg(""); }, 1500);
    } catch(e) {
      setResetMsg("❌ Gagal: " + (e.message || "Error tidak diketahui"));
    }
    setResetLoading(false);
  }

  async function handleDeleteSekolah(id, nama) {
    if (!window.confirm(`Hapus sekolah "${nama}"?\n\nSemua data siswa, kelas, soal, dan lisensi akan ikut terhapus permanen.`)) return;
    setLoading(true);
    try {
      // Hapus dari tabel anak ke tabel induk (urutan penting!)
      const tables = ["siswa", "kelas", "soal", "target_penerimaan", "panitia", "lisensi"];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq("school_id", id);
        if (error) throw error;
      }
      // Terakhir hapus sekolahnya
      const { error } = await supabase.from("sekolah").delete().eq("id", id);
      if (error) throw error;

      setSekolah(prev => prev.filter(s => s.id !== id));
      setLisensi(prev => prev.filter(l => l.school_id !== id));
    } catch(e) {
      alert("Gagal menghapus: " + (e.message || JSON.stringify(e)));
    }
    setLoading(false);
  }

  async function handleSaveLisensi({ id, schoolId, lisensiKey, paket, maksSiswa, maksKelas, tglMulai, tglExpired, catatan }) {
    if (id) {
      await updateLisensi(id, { paket, maksSiswa, maksKelas, tglExpired, catatan });
    } else {
      await createLisensi({ schoolId, lisensiKey, paket, maksSiswa, maksKelas, tglMulai, tglExpired, catatan });
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
      setCopied(key); setTimeout(() => setCopied(null), 2000);
    });
  }

  const filtered    = sekolah.filter(s => filter==="semua" ? true : filter==="aktif" ? s.aktif : !s.aktif);
  const totalAktif  = sekolah.filter(s => s.aktif).length;
  const totalPending= sekolah.filter(s => !s.aktif).length;
  const totalExpired= lisensi.filter(l => l.tgl_expired && sisaHari(l.tgl_expired) < 0).length;
  const totalSegera = lisensi.filter(l => { const s = sisaHari(l.tgl_expired); return s !== null && s >= 0 && s <= 7; }).length;

  return (
    <div style={S.root}>
      {resetModal && (
        <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:20,padding:28,width:"100%",maxWidth:420}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <div style={{fontWeight:800,fontSize:16,color:"#E2E8F0"}}>🔑 Reset Password Sekolah</div>
                <div style={{fontSize:12,color:"#475569",marginTop:3}}>{resetModal.nama}</div>
              </div>
              <button style={{background:"none",border:"none",color:"#475569",fontSize:20,cursor:"pointer"}} onClick={()=>setResetModal(null)}>✕</button>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:"#94A3B8",display:"block",marginBottom:6}}>📧 Email Sekolah (untuk Forgot Password)</label>
              <input type="email" placeholder="email@sekolah.com" value={resetEmail} onChange={e=>setResetEmail(e.target.value)}
                style={{width:"100%",background:"#1E293B",border:"1px solid #334155",borderRadius:8,padding:"9px 12px",color:"#E2E8F0",fontSize:14,boxSizing:"border-box"}}/>
              <div style={{fontSize:11,color:"#475569",marginTop:4}}>Simpan email agar sekolah bisa reset sendiri via Forgot Password.</div>
            </div>
            <div style={{marginBottom:18}}>
              <label style={{fontSize:12,color:"#94A3B8",display:"block",marginBottom:6}}>🔒 Password Baru</label>
              <input type="text" placeholder="Minimal 6 karakter" value={resetPass} onChange={e=>setResetPass(e.target.value)}
                style={{width:"100%",background:"#1E293B",border:"1px solid #334155",borderRadius:8,padding:"9px 12px",color:"#E2E8F0",fontSize:14,boxSizing:"border-box"}}/>
            </div>
            {resetMsg && (
              <div style={{background:resetMsg.startsWith("✅")?"#052e16":"#2d0a0a",border:"1px solid "+(resetMsg.startsWith("✅")?"#16a34a":"#ef4444"),borderRadius:8,padding:"8px 12px",fontSize:13,marginBottom:14,color:resetMsg.startsWith("✅")?"#4ade80":"#f87171"}}>{resetMsg}</div>
            )}
            <div style={{display:"flex",gap:10}}>
              <button style={{flex:1,background:"none",border:"1px solid #334155",borderRadius:10,padding:"10px",color:"#94A3B8",cursor:"pointer",fontSize:14}} onClick={()=>setResetModal(null)}>Batal</button>
              <button style={{flex:2,background:"linear-gradient(135deg,#F59E0B,#D97706)",border:"none",borderRadius:10,padding:"10px",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:14,opacity:resetLoading?0.6:1}} onClick={handleOwnerReset} disabled={resetLoading}>
                {resetLoading?"Memproses...":"🔑 Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <ModalLisensi
          sekolahList={sekolah}
          lisensiEdit={lisensiEdit}
          onSave={handleSaveLisensi}
          onClose={() => { setShowModal(false); setLisensiEdit(null); }}
        />
      )}

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
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
          {[
            ["Total Sekolah",   sekolah.length, "#3B82F6","🏫"],
            ["Aktif",           totalAktif,     "#10B981","✅"],
            ["Pending",         totalPending,   "#F59E0B","⏳"],
            ["Lisensi Expired", totalExpired,   "#EF4444","❌"],
            ["Segera Expired",  totalSegera,    "#F97316","⚠️"],
          ].map(([lbl,val,col,icon]) => (
            <div key={lbl} style={{ background:"#0F172A", border:"1px solid #1E293B", borderRadius:14, padding:16 }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:22, fontWeight:900, color:col }}>{val}</div>
              <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {totalPending > 0 && (
          <div style={{ background:"#451A03", border:"1px solid #F59E0B44", borderRadius:12, padding:"12px 16px", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>⚠️</span>
            <div>
              <div style={{ color:"#F59E0B", fontWeight:700, fontSize:14 }}>{totalPending} sekolah menunggu aktivasi</div>
              <div style={{ color:"#92400e", fontSize:12 }}>Aktifkan sekolah yang sudah membayar</div>
            </div>
            <button style={{ ...S.cta, marginLeft:"auto", background:"#F59E0B" }} onClick={() => { setTab("sekolah"); setFilter("pending"); }}>Lihat →</button>
          </div>
        )}
        {totalExpired > 0 && (
          <div style={{ background:"#450a0a", border:"1px solid #EF444444", borderRadius:12, padding:"12px 16px", marginBottom:12, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20 }}>❌</span>
            <div>
              <div style={{ color:"#EF4444", fontWeight:700, fontSize:14 }}>{totalExpired} lisensi expired</div>
              <div style={{ color:"#7f1d1d", fontSize:12 }}>Sekolah tidak bisa login hingga diperpanjang</div>
            </div>
            <button style={{ ...S.cta, marginLeft:"auto", background:"#EF4444" }} onClick={() => setTab("lisensi")}>Kelola →</button>
          </div>
        )}

        {/* Tab */}
        <div style={{ display:"flex", gap:6, marginBottom:20 }}>
          {[["sekolah","🏫 Sekolah"],["lisensi","🔑 Lisensi"],["paket","📦 Daftar Paket"]].map(([t,lbl]) => (
            <button key={t} style={{ ...S.ghost, fontWeight:700, ...(tab===t?{background:"#1E3A5F",color:"#60A5FA",borderColor:"#1E3A5F"}:{}) }}
              onClick={() => setTab(t)}>{lbl}</button>
          ))}
        </div>

        {/* ── TAB SEKOLAH ── */}
        {tab==="sekolah" && (
          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
              <div>
                <h2 style={S.cardTitle}>🏫 Daftar Sekolah</h2>
                <p style={{ color:"#475569", fontSize:13, margin:0 }}>{filtered.length} sekolah</p>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {["semua","aktif","pending"].map(f => (
                  <button key={f} style={{ ...S.ghost, ...(filter===f?{background:"#1E3A5F",color:"#60A5FA",borderColor:"#1E3A5F"}:{}) }}
                    onClick={() => setFilter(f)}>{f==="semua"?"Semua":f==="aktif"?"Aktif":"Pending"}</button>
                ))}
                <button style={S.ghost} onClick={load} disabled={loading}>🔄 {loading?"...":"Refresh"}</button>
              </div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>{["No","Nama Sekolah","Kode","Tgl Daftar","Status","Paket Aktif","Lisensi","Aksi"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map((s,i) => {
                    const today = new Date().toISOString().slice(0,10);
                    const lis = lisensi.filter(l => l.school_id===s.id && (!l.tgl_expired || l.tgl_expired >= today))
                      .sort((a,b) => (b.tgl_expired||"9999") > (a.tgl_expired||"9999") ? 1 : -1)[0];
                    const st  = lis ? statusLisensi(lis.tgl_expired) : null;
                    const pk  = lis ? getPaketById(lis.paket) : null;
                    return (
                      <tr key={s.id} style={S.tr}>
                        <td style={S.td}>{i+1}</td>
                        <td style={{ ...S.td, fontWeight:600, color:"#E2E8F0" }}>{s.nama}</td>
                        <td style={S.td}><span style={{ background:"#1E293B", color:"#60A5FA", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{s.kode}</span></td>
                        <td style={S.td}>{s.created_at ? new Date(s.created_at).toLocaleDateString("id-ID") : "-"}</td>
                        <td style={S.td}>
                          <span style={{ background:s.aktif?"#052e16":"#451A03", color:s.aktif?"#4ade80":"#F59E0B", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                            {s.aktif?"✅ Aktif":"⏳ Pending"}
                          </span>
                        </td>
                        <td style={S.td}>
                          {pk ? <span style={{ color:pk.warna, fontWeight:700, fontSize:12 }}>{pk.nama}</span> : <span style={{ color:"#334155", fontSize:11 }}>—</span>}
                        </td>
                        <td style={S.td}>
                          {st ? <span style={{ background:st.bg, color:st.color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{st.label}</span>
                               : <span style={{ color:"#334155", fontSize:11 }}>Belum ada</span>}
                        </td>
                        <td style={S.td}>
                          <div style={{ display:"flex", gap:5 }}>
                            {s.aktif
                              ? <button style={{ ...S.ghost, padding:"4px 10px", fontSize:11, color:"#F59E0B", borderColor:"#F59E0B44" }} onClick={() => handleToggle(s.id,false)}>Nonaktifkan</button>
                              : <button style={{ ...S.cta, padding:"4px 12px", fontSize:11 }} onClick={() => handleToggle(s.id,true)}>Aktifkan</button>}
                            <button style={{ ...S.ghost, padding:"4px 9px", fontSize:11, color:"#F59E0B", borderColor:"#F59E0B33" }} onClick={() => openResetModal(s.id, s.nama)}>🔑 Reset</button>
                            <button style={{ ...S.ghost, padding:"4px 9px", fontSize:11, color:"#EF4444", borderColor:"#EF444433" }} onClick={() => handleDeleteSekolah(s.id,s.nama)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB LISENSI ── */}
        {tab==="lisensi" && (
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
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>{["No","Sekolah","Lisensi Key","Paket","Siswa","Kelas","Tgl Mulai","Expired","Status","Aksi"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {lisensi.length === 0 ? (
                    <tr><td colSpan={10} style={{ ...S.td, textAlign:"center", padding:40, color:"#475569" }}>
                      {loading ? "Memuat..." : "Belum ada lisensi."}
                    </td></tr>
                  ) : lisensi.map((l,i) => {
                    const st = statusLisensi(l.tgl_expired);
                    const pk = getPaketById(l.paket);
                    return (
                      <tr key={l.id} style={S.tr}>
                        <td style={S.td}>{i+1}</td>
                        <td style={{ ...S.td, fontWeight:600, color:"#E2E8F0" }}>
                          {l.sekolah?.nama||"-"}
                          <div style={{ fontSize:11, color:"#475569" }}>{l.sekolah?.kode}</div>
                        </td>
                        <td style={S.td}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontFamily:"monospace", fontSize:11, color:"#93C5FD", letterSpacing:1 }}>{l.lisensi_key}</span>
                            <button title="Salin" style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, padding:2 }} onClick={() => copyKey(l.lisensi_key)}>
                              {copied===l.lisensi_key?"✅":"📋"}
                            </button>
                          </div>
                        </td>
                        <td style={S.td}><span style={{ color:pk?.warna||"#94A3B8", fontWeight:700, fontSize:12 }}>{pk?.nama||l.paket}</span></td>
                        <td style={S.td}>{l.maks_siswa ?? "∞"}</td>
                        <td style={S.td}>{l.maks_kelas ?? "∞"}</td>
                        <td style={S.td}>{l.tgl_mulai ? new Date(l.tgl_mulai).toLocaleDateString("id-ID") : "-"}</td>
                        <td style={S.td}>{l.tgl_expired ? new Date(l.tgl_expired).toLocaleDateString("id-ID") : "∞ Selamanya"}</td>
                        <td style={S.td}><span style={{ background:st.bg, color:st.color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 }}>{st.label}</span></td>
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
          </div>
        )}

        {/* ── TAB DAFTAR PAKET ── */}
        {tab==="paket" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginBottom:20 }}>
              {PAKET_LIST.map(p => (
                <div key={p.id} style={{ background:"#0F172A", border:`2px solid ${p.warna}44`, borderRadius:16, padding:22, position:"relative" }}>
                  {p.popular && (
                    <div style={{ position:"absolute", top:-10, right:14, background:"#8B5CF6", color:"#fff", fontSize:10, fontWeight:800, borderRadius:20, padding:"2px 10px" }}>POPULER</div>
                  )}
                  <div style={{ fontSize:22, fontWeight:900, color:p.warna, marginBottom:4 }}>{p.nama}</div>
                  <div style={{ fontSize:26, fontWeight:900, color:"#E2E8F0", marginBottom:4 }}>{p.hargaStr}</div>
                  <div style={{ fontSize:12, color:"#475569", marginBottom:14 }}>{p.deskripsi}</div>
                  <div style={{ fontSize:13, color:"#94A3B8", lineHeight:2 }}>
                    ✅ {p.maksSiswa ? `${p.maksSiswa} siswa` : "Unlimited siswa"}<br/>
                    ✅ {p.maksKelas ? `${p.maksKelas} kelas` : "Unlimited kelas"}<br/>
                    ✅ {p.durasi ? `Berlaku ${p.durasi} hari` : "Berlaku selamanya"}<br/>
                    ✅ Semua fitur asesmen<br/>
                    ✅ Dashboard & laporan
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...S.card, borderColor:"#1E3A5F" }}>
              <h3 style={{ ...S.cardTitle, fontSize:14 }}>📋 Cara Berlangganan</h3>
              <div style={{ color:"#475569", fontSize:13, lineHeight:2 }}>
                1. Sekolah mendaftar di halaman <strong style={{ color:"#60A5FA" }}>Daftar</strong><br/>
                2. Sekolah memilih paket & melakukan pembayaran<br/>
                3. Owner mengkonfirmasi pembayaran → klik <strong style={{ color:"#10B981" }}>Tambah Lisensi</strong> → pilih paket<br/>
                4. Lisensi key dikirim ke akun sekolah<br/>
                5. Owner mengklik <strong style={{ color:"#10B981" }}>Aktifkan</strong> pada sekolah tersebut
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
