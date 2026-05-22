// src/LoginPage.jsx
import { useState } from "react";
import { loginPanitia, loginOwner, registerSekolah, requestResetPassword, verifyResetToken } from "./supabaseClient";
import { PAKET_LIST } from "./paketConfig";

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
  const [logoClick, setLogoClick] = useState(0);
  const [showOwner, setShowOwner] = useState(false);
  const [forgotMode, setForgotMode] = useState(false); // false | "email" | "token"
  const [fpEmail, setFpEmail] = useState("");
  const [fpToken, setFpToken] = useState("");
  const [fpPass, setFpPass] = useState("");
  const [fpMsg, setFpMsg] = useState("");
  const [fpLoading, setFpLoading] = useState(false);

  function handleLogoClick() {
    const next = logoClick + 1;
    setLogoClick(next);
    if (next >= 5) {
      setShowOwner(true);
      setLogoClick(0);
    }
  }

  // Form registrasi
  const [reg, setReg] = useState({
    namaSekolah: "", alamat: "", kode: "",
    namaPanitia: "", username: "", password: "", konfirmasi: "",
    paketId: "starter",
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

  async function handleForgotRequest() {
    if (!fpEmail) { setFpMsg("❌ Masukkan email terlebih dahulu."); return; }
    setFpLoading(true); setFpMsg("");
    try {
      const res = await requestResetPassword(fpEmail);
      if (!res?.berhasil) {
        setFpMsg("❌ Email tidak ditemukan. Hubungi Owner untuk reset manual.");
      } else {
        setFpMsg("✅ Token reset dikirim! Cek email: " + fpEmail);
        setForgotMode("token");
      }
    } catch(e) { setFpMsg("❌ " + (e.message || "Gagal mengirim.")); }
    setFpLoading(false);
  }

  async function handleForgotVerify() {
    if (!fpToken || !fpPass) { setFpMsg("❌ Isi token dan password baru."); return; }
    if (fpPass.length < 6) { setFpMsg("❌ Password minimal 6 karakter."); return; }
    setFpLoading(true); setFpMsg("");
    try {
      const res = await verifyResetToken(fpToken, fpPass);
      if (res?.berhasil) {
        setFpMsg("✅ Password berhasil diubah! Silakan login.");
        setTimeout(() => { setForgotMode(false); setFpEmail(""); setFpToken(""); setFpPass(""); setFpMsg(""); }, 2000);
      } else {
        setFpMsg("❌ " + (res?.pesan || "Token tidak valid."));
      }
    } catch(e) { setFpMsg("❌ " + (e.message || "Gagal verifikasi.")); }
    setFpLoading(false);
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
        paketId: reg.paketId,
      });
      const paketDipilih = PAKET_LIST.find(p => p.id === reg.paketId);
      setOk(`✅ Pendaftaran berhasil! Paket dipilih: ${paketDipilih?.nama}. Akun Anda sedang menunggu persetujuan admin setelah pembayaran dikonfirmasi.`);
      setReg({ namaSekolah:"", alamat:"", kode:"", namaPanitia:"", username:"", password:"", konfirmasi:"" });
    } catch(e) { setErr(e.message || "Pendaftaran gagal."); }
    setLoading(false);
  }

  function resetForm() { setU(""); setP(""); setErr(""); setOk(""); }

  return (
    <div style={S.root}>
      <div style={S.card}>
        <div style={{ textAlign:"center", marginBottom:22 }}>
          <div style={{ fontSize:42, color:"#3B82F6", cursor:"pointer", userSelect:"none" }} onClick={handleLogoClick}>◈</div>
          <h1 style={S.title}>PPDB Asesmen Bakat & Minat</h1>
          <p style={S.sub}>Sistem Penjurusan Cerdas — SMA 2025/2026</p>
        </div>

        {/* Tab Mode */}
        <div style={S.tabRow}>
          <button style={{...S.tabBtn,...(mode==="siswa"?S.tabAct:{})}} onClick={()=>{setMode("siswa");resetForm();}}>Siswa</button>
          <button style={{...S.tabBtn,...(mode==="panitia"?S.tabAct:{})}} onClick={()=>{setMode("panitia");resetForm();}}>Panitia</button>
          <button style={{...S.tabBtn,...(mode==="daftar"?S.tabAct:{})}} onClick={()=>{setMode("daftar");resetForm();}}>Daftar</button>
          {showOwner && (
            <button style={{...S.tabBtn,...(mode==="owner"?S.tabAct:{}), color:"#8B5CF6"}} onClick={()=>{setMode("owner");resetForm();}}>🔐 Owner</button>
          )}
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

            {/* ── Forgot Password ── */}
            {!forgotMode && (
              <div style={{textAlign:"center"}}>
                <span style={{color:"#60A5FA",fontSize:12,cursor:"pointer"}} onClick={()=>{setForgotMode("email");setFpMsg("");}}>
                  Lupa password?
                </span>
                <span style={{color:"#334155",fontSize:12,margin:"0 8px"}}>·</span>
                <span style={{color:"#60A5FA",fontSize:12,cursor:"pointer"}} onClick={()=>{setMode("daftar");resetForm();}}>
                  Daftar sekolah baru
                </span>
              </div>
            )}
            {forgotMode === "email" && (
              <div style={{background:"#0B1120",border:"1px solid #1E3A5F",borderRadius:12,padding:16,marginTop:4}}>
                <div style={{fontWeight:700,fontSize:13,color:"#60A5FA",marginBottom:10}}>🔑 Lupa Password</div>
                {fpMsg && <div style={{background:fpMsg.startsWith("✅")?"#052e16":"#2d0a0a",border:"1px solid "+(fpMsg.startsWith("✅")?"#16a34a":"#ef4444"),borderRadius:8,padding:"7px 11px",fontSize:12,marginBottom:10,color:fpMsg.startsWith("✅")?"#4ade80":"#f87171"}}>{fpMsg}</div>}
                <label style={{...S.lbl}}>Email terdaftar</label>
                <input style={{...S.inp,marginBottom:10}} type="email" placeholder="email@sekolah.com" value={fpEmail} onChange={e=>setFpEmail(e.target.value)}/>
                <div style={{display:"flex",gap:8}}>
                  <button style={{...S.ghost,marginTop:0,flex:1}} onClick={()=>{setForgotMode(false);setFpMsg("");}}>Batal</button>
                  <button style={{...S.cta,flex:2,padding:"9px"}} onClick={handleForgotRequest} disabled={fpLoading}>
                    {fpLoading?"Mengirim...":"Kirim Token Reset →"}
                  </button>
                </div>
                <div style={{fontSize:11,color:"#475569",marginTop:8,textAlign:"center"}}>Atau minta Owner sekolah untuk reset password manual.</div>
              </div>
            )}
            {forgotMode === "token" && (
              <div style={{background:"#0B1120",border:"1px solid #1E3A5F",borderRadius:12,padding:16,marginTop:4}}>
                <div style={{fontWeight:700,fontSize:13,color:"#60A5FA",marginBottom:10}}>🔒 Masukkan Token & Password Baru</div>
                {fpMsg && <div style={{background:fpMsg.startsWith("✅")?"#052e16":"#2d0a0a",border:"1px solid "+(fpMsg.startsWith("✅")?"#16a34a":"#ef4444"),borderRadius:8,padding:"7px 11px",fontSize:12,marginBottom:10,color:fpMsg.startsWith("✅")?"#4ade80":"#f87171"}}>{fpMsg}</div>}
                <label style={{...S.lbl}}>Token (dari email)</label>
                <input style={{...S.inp,marginBottom:10}} placeholder="Tempel token dari email" value={fpToken} onChange={e=>setFpToken(e.target.value)}/>
                <label style={{...S.lbl}}>Password Baru</label>
                <input style={{...S.inp,marginBottom:10}} type="password" placeholder="Minimal 6 karakter" value={fpPass} onChange={e=>setFpPass(e.target.value)}/>
                <div style={{display:"flex",gap:8}}>
                  <button style={{...S.ghost,marginTop:0,flex:1}} onClick={()=>setForgotMode("email")}>← Kembali</button>
                  <button style={{...S.cta,flex:2,padding:"9px"}} onClick={handleForgotVerify} disabled={fpLoading}>
                    {fpLoading?"Memverifikasi...":"Ganti Password ✓"}
                  </button>
                </div>
              </div>
            )}
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
              {/* Info kontak WA */}
              <a href="https://wa.me/6285156392033" target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:10, background:"#052e16", border:"1px solid #16a34a44", borderRadius:10, padding:"10px 14px", marginTop:10, textDecoration:"none" }}>
                <span style={{ fontSize:22 }}>💬</span>
                <div>
                  <div style={{ color:"#4ade80", fontWeight:700, fontSize:13 }}>Hubungi Admin via WhatsApp</div>
                  <div style={{ color:"#16a34a", fontSize:12 }}>0851-5639-2033 · Konfirmasi pembayaran & aktivasi akun</div>
                </div>
                <span style={{ marginLeft:"auto", color:"#4ade80", fontSize:12, fontWeight:700 }}>Chat →</span>
              </a>
            </div>
            {err && <div style={S.err}>{err}</div>}
            {ok  && <div style={S.ok}>{ok}</div>}
            {!ok && <>
              {/* Pilih Paket */}
              <div style={S.fg}>
                <label style={S.lbl}>Pilih Paket *</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
                  {PAKET_LIST.map(p => (
                    <div key={p.id} onClick={() => setReg({...reg, paketId:p.id})} style={{
                      border:`2px solid ${reg.paketId===p.id ? p.warna : "#1E293B"}`,
                      background: reg.paketId===p.id ? p.warna+"22" : "#0B1120",
                      borderRadius:10, padding:"10px 12px", cursor:"pointer", position:"relative",
                    }}>
                      {p.popular && <div style={{ position:"absolute", top:-8, right:8, background:"#8B5CF6", color:"#fff", fontSize:9, fontWeight:800, borderRadius:20, padding:"1px 8px" }}>POPULER</div>}
                      <div style={{ fontWeight:800, fontSize:13, color: reg.paketId===p.id ? p.warna : "#E2E8F0" }}>{p.nama}</div>
                      <div style={{ fontSize:12, color: p.warna, fontWeight:700 }}>{p.hargaStr}</div>
                      <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>
                        {p.maksSiswa ?? "∞"} siswa · {p.maksKelas ?? "∞"} kelas · {p.durasi ? p.durasi+"hr" : "Lifetime"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Kontak WA setelah pilih paket */}
              {reg.paketId && (()=>{
                const pk = PAKET_LIST.find(p => p.id === reg.paketId);
                return pk ? (
                  <a href={`https://wa.me/6285156392033?text=Halo%20admin%2C%20saya%20ingin%20berlangganan%20paket%20${encodeURIComponent(pk.nama)}%20(${encodeURIComponent(pk.hargaStr)})%20untuk%20sekolah%20kami.`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display:"flex", alignItems:"center", gap:10, background:"#052e16", border:"1px solid #16a34a44", borderRadius:10, padding:"10px 14px", marginBottom:12, textDecoration:"none" }}>
                    <span style={{ fontSize:20 }}>💬</span>
                    <div>
                      <div style={{ color:"#4ade80", fontWeight:700, fontSize:12 }}>Bayar paket {pk.nama} via WhatsApp</div>
                      <div style={{ color:"#16a34a", fontSize:11 }}>{pk.hargaStr} · Klik untuk chat langsung dengan admin</div>
                    </div>
                    <span style={{ marginLeft:"auto", color:"#4ade80", fontSize:12, fontWeight:700 }}>Chat →</span>
                  </a>
                ) : null;
              })()}
              <hr style={S.divider}/>
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
