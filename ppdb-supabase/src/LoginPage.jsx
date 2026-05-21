// src/LoginPage.jsx
import { useState } from "react";
import { loginPanitia, loginOwner, registerSekolah } from "./supabaseClient";

const S = {
  root:    { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#080E1A", padding:"16px" },
  card:    { background:"#0F172A", border:"1px solid #1E293B", borderRadius:16, padding:28, maxWidth:460, width:"100%" },
  title:   { fontSize:20, fontWeight:900, margin:"8px 0 4px", color:"#E2E8F0" },
  sub:     { color:"#475569", fontSize:13, margin:0 },
  tabRow:  { display:"flex", gap:4, background:"#1E293B", borderRadius:10, padding:4, marginBottom:20 },
  tabBtn:  { flex:1, border:"none", background:"transparent", color:"#94A3B8", borderRadius:8, padding:"8px", cursor:"pointer", fontSize:12, fontWeight:600 },
  tabAct:  { background:"#0F172A", color:"#E2E8F0" },
  fg:      { marginBottom:13 },
  lbl:     { display:"block", fontSize:12, color:"#94A3B8", marginBottom:5, fontWeight:600 },
  inp:     { width:"100%", boxSizing:"border-box", background:"#1E293B", border:"1px solid #334155", borderRadius:10, padding:"10px 12px", color:"#E2E8F0", fontSize:14, outline:"none" },
  cta:     { background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", color:"#fff", border:"none", borderRadius:12, padding:"11px 28px", fontSize:15, fontWeight:700, cursor:"pointer", width:"100%" },
  ghost:   { background:"transparent", border:"1px solid #1E293B", color:"#94A3B8", borderRadius:10, padding:"8px 15px", cursor:"pointer", fontSize:13, width:"100%", marginTop:8 },
  err:     { background:"#450A0A", color:"#F87171", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:10 },
  ok:      { background:"#052e16", color:"#4ade80", borderRadius:8, padding:"8px 12px", fontSize:13, marginBottom:10 },
  badge:   { display:"inline-block", background:"#1E3A5F", color:"#60A5FA", borderRadius:20, padding:"4px 16px", fontSize:12, fontWeight:700, letterSpacing:1 },
  divider: { border:"none", borderTop:"1px solid #1E293B", margin:"16px 0" },
};

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("siswa"); // siswa | panitia | owner | daftar
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  // Form registrasi
  const [reg, setReg] = useState({
    namaSekolah: "", alamat: "", kode: "",
    namaPanitia: "", username: "", password: "", konfirmasi: "",
  });

  async function tryLoginPanitia() {
    setLoading(true); setErr("");
    try {
      const userData = await loginPanitia(u, p);
      if (!userData) { setErr("Username atau password salah."); }
      else { onLogin("panitia", userData); }
    } catch(e) { setErr(e.message || "Koneksi gagal."); }
    setLoading(false);
  }

  async function tryLoginOwner() {
    setLoading(true); setErr("");
    try {
      const userData = await loginOwner(u, p);
      if (!userData) { setErr("Username atau password salah."); }
      else { onLogin("owner", userData); }
    } catch(e) { setErr(e.message || "Koneksi gagal."); }
    setLoading(false);
  }

  async function tryRegister() {
    setErr(""); setOk("");
    if (!reg.namaSekolah || !reg.kode || !reg.username || !reg.password) {
      setErr("Semua field wajib diisi."); return;
    }
    if (reg.password !== reg.konfirmasi) {
      setErr("Password dan konfirmasi tidak cocok."); return;
    }
    if (reg.password.length < 6) {
      setErr("Password minimal 6 karakter."); return;
    }
    setLoading(true);
    try {
      await registerSekolah({
        namaSekolah: reg.namaSekolah,
        alamat: reg.alamat,
        kode: reg.kode.toUpperCase(),
        namaPanitia: reg.namaPanitia || reg.namaSekolah,
        username: reg.username,
        password: reg.password,
      });
      setOk("✅ Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan admin. Kami akan menghubungi Anda setelah diaktifkan.");
      setReg({ namaSekolah:"", alamat:"", kode:"", namaPanitia:"", username:"", password:"", konfirmasi:"" });
    } catch(e) { setErr(e.message || "Pendaftaran gagal."); }
    setLoading(false);
  }

  function resetForm() { setU(""); setP(""); setErr(""); setOk(""); }

  return (
    <div style={S.root}>
      <div style={S.card}>
        <div style={{ textAlign:"center", marginBottom:22 }}>
          <div style={{ fontSize:42, color:"#3B82F6" }}>◈</div>
          <h1 style={S.title}>PPDB Asesmen Bakat & Minat</h1>
          <p style={S.sub}>Sistem Penjurusan Cerdas — SMA 2025/2026</p>
        </div>

        {/* Tab Mode */}
        <div style={S.tabRow}>
          <button style={{...S.tabBtn,...(mode==="siswa"?S.tabAct:{})}} onClick={()=>{setMode("siswa");resetForm();}}>Siswa</button>
          <button style={{...S.tabBtn,...(mode==="panitia"?S.tabAct:{})}} onClick={()=>{setMode("panitia");resetForm();}}>Panitia</button>
          <button style={{...S.tabBtn,...(mode==="daftar"?S.tabAct:{})}} onClick={()=>{setMode("daftar");resetForm();}}>Daftar</button>
          <button style={{...S.tabBtn,...(mode==="owner"?S.tabAct:{})}} onClick={()=>{setMode("owner");resetForm();}}>Owner</button>
        </div>

        {/* ── SISWA ── */}
        {mode==="siswa" && (
          <div style={{ textAlign:"center" }}>
            <p style={{ color:"#94A3B8", fontSize:14, marginBottom:18 }}>Ikuti asesmen untuk menemukan jurusan yang tepat.</p>
            <button style={S.cta} onClick={()=>onLogin("siswa", {})}>Mulai Asesmen →</button>
          </div>
        )}

        {/* ── PANITIA ── */}
        {mode==="panitia" && (
          <div>
            {err && <div style={S.err}>{err}</div>}
            <div style={S.fg}><label style={S.lbl}>Username</label>
              <input style={S.inp} value={u} onChange={e=>setU(e.target.value)} placeholder="Username panitia"/></div>
            <div style={S.fg}><label style={S.lbl}>Password</label>
              <input style={S.inp} type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="Password"
                onKeyDown={e=>e.key==="Enter"&&tryLoginPanitia()}/></div>
            <button style={{...S.cta, opacity:loading?0.6:1}} onClick={tryLoginPanitia} disabled={loading}>
              {loading?"Memverifikasi...":"Login Panitia →"}
            </button>
            <hr style={S.divider}/>
            <p style={{ color:"#475569", fontSize:12, textAlign:"center", margin:0 }}>
              Belum punya akun? <span style={{ color:"#60A5FA", cursor:"pointer" }} onClick={()=>{setMode("daftar");resetForm();}}>Daftarkan sekolah Anda</span>
            </p>
          </div>
        )}

        {/* ── DAFTAR SEKOLAH ── */}
        {mode==="daftar" && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={S.badge}>✦ Pendaftaran Sekolah Baru</div>
              <p style={{ color:"#475569", fontSize:12, marginTop:8 }}>
                Setelah mendaftar, akun akan diaktifkan oleh admin dalam 1×24 jam.
              </p>
            </div>
            {err && <div style={S.err}>{err}</div>}
            {ok  && <div style={S.ok}>{ok}</div>}
            {!ok && <>
              <div style={S.fg}><label style={S.lbl}>Nama Sekolah *</label>
                <input style={S.inp} value={reg.namaSekolah} onChange={e=>setReg({...reg,namaSekolah:e.target.value})} placeholder="SMA Negeri 1 Kota Anda"/></div>
              <div style={S.fg}><label style={S.lbl}>Alamat Sekolah</label>
                <input style={S.inp} value={reg.alamat} onChange={e=>setReg({...reg,alamat:e.target.value})} placeholder="Jl. Contoh No. 1"/></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
                <div style={S.fg}><label style={S.lbl}>Kode Unik Sekolah *</label>
                  <input style={S.inp} value={reg.kode} onChange={e=>setReg({...reg,kode:e.target.value})} placeholder="SMAN1KOTA" maxLength={20}/></div>
                <div style={S.fg}><label style={S.lbl}>Nama PIC / Admin</label>
                  <input style={S.inp} value={reg.namaPanitia} onChange={e=>setReg({...reg,namaPanitia:e.target.value})} placeholder="Nama lengkap"/></div>
              </div>
              <hr style={S.divider}/>
              <p style={{ color:"#94A3B8", fontSize:11, marginBottom:12 }}>Akun untuk login ke dashboard panitia:</p>
              <div style={S.fg}><label style={S.lbl}>Username *</label>
                <input style={S.inp} value={reg.username} onChange={e=>setReg({...reg,username:e.target.value})} placeholder="Buat username unik"/></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
                <div style={S.fg}><label style={S.lbl}>Password *</label>
                  <input style={S.inp} type="password" value={reg.password} onChange={e=>setReg({...reg,password:e.target.value})} placeholder="Min. 6 karakter"/></div>
                <div style={S.fg}><label style={S.lbl}>Konfirmasi Password *</label>
                  <input style={S.inp} type="password" value={reg.konfirmasi} onChange={e=>setReg({...reg,konfirmasi:e.target.value})} placeholder="Ulangi password"/></div>
              </div>
              <button style={{...S.cta, opacity:loading?0.6:1}} onClick={tryRegister} disabled={loading}>
                {loading?"Mendaftar...":"Daftar Sekolah →"}
              </button>
            </>}
            <button style={S.ghost} onClick={()=>{setMode("panitia");resetForm();}}>← Kembali ke Login</button>
          </div>
        )}

        {/* ── OWNER ── */}
        {mode==="owner" && (
          <div>
            <div style={{ marginBottom:14 }}>
              <div style={S.badge}>🔐 Admin Master</div>
            </div>
            {err && <div style={S.err}>{err}</div>}
            <div style={S.fg}><label style={S.lbl}>Username Owner</label>
              <input style={S.inp} value={u} onChange={e=>setU(e.target.value)} placeholder="Username owner"/></div>
            <div style={S.fg}><label style={S.lbl}>Password</label>
              <input style={S.inp} type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="Password"
                onKeyDown={e=>e.key==="Enter"&&tryLoginOwner()}/></div>
            <button style={{...S.cta, opacity:loading?0.6:1}} onClick={tryLoginOwner} disabled={loading}>
              {loading?"Memverifikasi...":"Login Owner →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
