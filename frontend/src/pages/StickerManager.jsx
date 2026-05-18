import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const ALL_TEAMS = [
  { code:'RSA', name:'África do Sul',   flag:'🇿🇦' },
  { code:'GER', name:'Alemanha',        flag:'🇩🇪' },
  { code:'ALG', name:'Argélia',         flag:'🇩🇿' },
  { code:'ARG', name:'Argentina',       flag:'🇦🇷' },
  { code:'KSA', name:'Arábia Saudita',  flag:'🇸🇦' },
  { code:'AUS', name:'Austrália',       flag:'🇦🇺' },
  { code:'AUT', name:'Áustria',         flag:'🇦🇹' },
  { code:'BEL', name:'Bélgica',         flag:'🇧🇪' },
  { code:'BIH', name:'Bósnia-Herzeg.',  flag:'🇧🇦' },
  { code:'BRA', name:'Brasil',          flag:'🇧🇷' },
  { code:'CPV', name:'Cabo Verde',      flag:'🇨🇻' },
  { code:'CAN', name:'Canadá',          flag:'🇨🇦' },
  { code:'QAT', name:'Catar',           flag:'🇶🇦' },
  { code:'COL', name:'Colômbia',        flag:'🇨🇴' },
  { code:'COD', name:'Congo DR',        flag:'🇨🇩' },
  { code:'KOR', name:'Coreia do Sul',   flag:'🇰🇷' },
  { code:'CIV', name:'Costa do Marfim', flag:'🇨🇮' },
  { code:'CRO', name:'Croácia',         flag:'🇭🇷' },
  { code:'CUW', name:'Curaçao',         flag:'🇨🇼' },
  { code:'EGY', name:'Egito',           flag:'🇪🇬' },
  { code:'ECU', name:'Equador',         flag:'🇪🇨' },
  { code:'SCO', name:'Escócia',         flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { code:'ESP', name:'Espanha',         flag:'🇪🇸' },
  { code:'USA', name:'EUA',             flag:'🇺🇸' },
  { code:'FRA', name:'França',          flag:'🇫🇷' },
  { code:'GHA', name:'Gana',            flag:'🇬🇭' },
  { code:'HAI', name:'Haiti',           flag:'🇭🇹' },
  { code:'NED', name:'Holanda',         flag:'🇳🇱' },
  { code:'ENG', name:'Inglaterra',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code:'IRQ', name:'Iraque',          flag:'🇮🇶' },
  { code:'IRN', name:'Irã',             flag:'🇮🇷' },
  { code:'JPN', name:'Japão',           flag:'🇯🇵' },
  { code:'JOR', name:'Jordânia',        flag:'🇯🇴' },
  { code:'MAR', name:'Marrocos',        flag:'🇲🇦' },
  { code:'MEX', name:'México',          flag:'🇲🇽' },
  { code:'NOR', name:'Noruega',         flag:'🇳🇴' },
  { code:'NZL', name:'Nova Zelândia',   flag:'🇳🇿' },
  { code:'PAN', name:'Panamá',          flag:'🇵🇦' },
  { code:'PAR', name:'Paraguai',        flag:'🇵🇾' },
  { code:'POR', name:'Portugal',        flag:'🇵🇹' },
  { code:'SEN', name:'Senegal',         flag:'🇸🇳' },
  { code:'SWE', name:'Suécia',          flag:'🇸🇪' },
  { code:'SUI', name:'Suíça',           flag:'🇨🇭' },
  { code:'CZE', name:'Tchéquia',        flag:'🇨🇿' },
  { code:'TUN', name:'Tunísia',         flag:'🇹🇳' },
  { code:'TUR', name:'Turquia',         flag:'🇹🇷' },
  { code:'URU', name:'Uruguai',         flag:'🇺🇾' },
  { code:'UZB', name:'Uzbequistão',     flag:'🇺🇿' },
];

const FLAGS = Object.fromEntries(ALL_TEAMS.map(t => [t.code, t.flag]));
const TOTAL = ALL_TEAMS.length * 20;

const USER_COLORS = ['#2563eb','#7c3aed','#db2777','#059669','#d97706','#0891b2','#65a30d','#dc2626'];

function waLink(phone, stickers) {
  const num  = phone.replace(/[^0-9]/g, '');
  const text = encodeURIComponent(`Oi! Vi no gerenciador de figurinhas da Copa 2026 que você tem: ${stickers}. Podemos trocar?`);
  return `https://wa.me/${num}?text=${text}`;
}

export default function StickerManager() {
  const [stickers,   setStickers]   = useState([]);   // { code, team_code, team_name, number, owned_count }
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState({});   // { [code]: true/false }
  const [mainTab,    setMainTab]    = useState('album');
  const [filter,     setFilter]     = useState('todas');
  const [search,     setSearch]     = useState('');
  // buscar trocas
  const [needed,     setNeeded]     = useState(new Set());
  const [bSearch,    setBSearch]    = useState('');
  const [searching,  setSearching]  = useState(false);
  const [results,    setResults]    = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/api/stickers').then(r => setStickers(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  // mapa rápido: code → owned_count
  const ownedMap = useMemo(() => {
    const m = {};
    stickers.forEach(s => { m[s.code] = s.owned_count; });
    return m;
  }, [stickers]);

  const stats = useMemo(() => ({
    coladas:   stickers.filter(s => s.owned_count >= 1).length,
    repetidas: stickers.reduce((a, s) => a + Math.max(0, s.owned_count - 1), 0),
  }), [stickers]);

  // times visíveis no Meu Album
  const visibleTeams = useMemo(() => {
    return ALL_TEAMS.filter(team => {
      const matchSearch = !search || team.name.toLowerCase().includes(search.toLowerCase()) || team.code.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (filter === 'coladas')   return Array.from({length:20},(_,i)=>`${team.code}-${i+1}`).some(c => (ownedMap[c]||0) >= 1);
      if (filter === 'repetidas') return Array.from({length:20},(_,i)=>`${team.code}-${i+1}`).some(c => (ownedMap[c]||0) > 1);
      return true;
    });
  }, [filter, search, ownedMap]);

  // times no Buscar
  const bTeams = useMemo(() =>
    ALL_TEAMS.filter(t => !bSearch || t.name.toLowerCase().includes(bSearch.toLowerCase()) || t.code.toLowerCase().includes(bSearch.toLowerCase())),
    [bSearch]
  );

  const addOne = useCallback(async (code) => {
    if (saving[code]) return;
    const teamCode = code.split('-')[0];
    const num      = parseInt(code.split('-')[1]);
    const team     = ALL_TEAMS.find(t => t.code === teamCode);
    // optimistic
    setStickers(prev => {
      const idx = prev.findIndex(s => s.code === code);
      if (idx >= 0) { const n=[...prev]; n[idx]={...n[idx], owned_count:n[idx].owned_count+1}; return n; }
      return [...prev, { code, team_code:teamCode, team_name:team?.name||teamCode, number:num, owned_count:1 }];
    });
    setSaving(p => ({ ...p, [code]: true }));
    try {
      await api.post('/api/stickers/add', { codes: [code] });
    } catch {
      setStickers(prev => {
        const idx = prev.findIndex(s => s.code === code);
        if (idx < 0) return prev;
        const n = [...prev]; n[idx]={...n[idx], owned_count:n[idx].owned_count-1};
        return n.filter(s => s.owned_count > 0);
      });
    } finally { setSaving(p => ({ ...p, [code]: false })); }
  }, [saving]);

  const removeOne = useCallback(async (code, e) => {
    if (e) e.stopPropagation();
    if (saving[code]) return;
    setStickers(prev => {
      const idx = prev.findIndex(s => s.code === code);
      if (idx < 0) return prev;
      const n = [...prev]; n[idx]={...n[idx], owned_count:n[idx].owned_count-1};
      return n.filter(s => s.owned_count > 0);
    });
    setSaving(p => ({ ...p, [code]: true }));
    try { await api.post('/api/stickers/remove', { code }); }
    catch {
      const teamCode = code.split('-')[0]; const num = parseInt(code.split('-')[1]);
      const team = ALL_TEAMS.find(t => t.code === teamCode);
      setStickers(prev => {
        const idx = prev.findIndex(s => s.code === code);
        if (idx >= 0) { const n=[...prev]; n[idx]={...n[idx],owned_count:n[idx].owned_count+1}; return n; }
        return [...prev, { code, team_code:teamCode, team_name:team?.name||teamCode, number:num, owned_count:1 }];
      });
    } finally { setSaving(p => ({ ...p, [code]: false })); }
  }, [saving]);

  const toggleNeeded = (code) => { setNeeded(prev => { const n=new Set(prev); n.has(code)?n.delete(code):n.add(code); return n; }); setResults(null); };

  const buscar = async () => {
    if (!needed.size) return;
    setSearching(true); setResults(null);
    try { const {data} = await api.post('/api/stickers/buscar-trocas', { needed:[...needed] }); setResults(data); }
    catch { } finally { setSearching(false); }
  };

  const pct = Math.round((stats.coladas / TOTAL) * 100);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'#64748b',background:'#060d18'}}>Carregando...</div>;

  // ── helper: renderiza os 20 quadradinhos de um time ──
  const renderSquares = (teamCode, onClickSquare, onClickRemove, getOwned, highlightSel) => (
    <div style={{display:'flex',flexWrap:'wrap',gap:3,padding:'8px 10px'}}>
      {Array.from({length:20},(_,i) => {
        const num  = i + 1;
        const code = `${teamCode}-${num}`;
        const owned = getOwned(code);
        const isSel = highlightSel ? highlightSel(code) : false;
        const reps  = Math.max(0, owned - 1);
        return (
          <div key={num} style={{position:'relative', width:32, height:32}}>
            <button onClick={() => onClickSquare(code)} disabled={!!saving[code]} style={{
              width:32, height:32, borderRadius:7, cursor:saving[code]?'wait':'pointer',
              border: isSel       ? '2px solid #818cf8' :
                      owned === 0 ? '1px solid rgba(255,255,255,0.1)' :
                      owned === 1 ? '2px solid #4ade80' :
                                   '2px solid #d4a017',
              background: isSel       ? 'rgba(129,140,248,0.22)' :
                          owned === 0 ? 'rgba(255,255,255,0.03)' :
                          owned === 1 ? 'rgba(74,222,128,0.18)' :
                                       'rgba(212,160,23,0.18)',
              color: isSel       ? '#818cf8' :
                     owned === 0 ? '#334155' :
                     owned === 1 ? '#4ade80' : '#d4a017',
              fontSize: 10, fontWeight: owned>0||isSel ? 900 : 400,
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.12s', flexDirection:'column', gap:0, lineHeight:1,
            }}>
              <span>{num}</span>
              {reps > 0 && <span style={{fontSize:8,lineHeight:1}}>+{reps}</span>}
            </button>
            {onClickRemove && owned > 0 && (
              <button onClick={(e) => onClickRemove(code, e)} style={{
                position:'absolute', top:-5, right:-5, width:16, height:16,
                borderRadius:'50%', background:'#ef4444', border:'1.5px solid #060d18',
                color:'#fff', cursor:'pointer', fontSize:9, fontWeight:900,
                display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1,
                zIndex:1,
              }}>×</button>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#060d18',fontFamily:"'Segoe UI',sans-serif",color:'#e2e8f0',paddingBottom:60}}>

      {/* ══ HEADER ══ */}
      <div style={{background:'linear-gradient(135deg,#0f2744,#0a1e38)',borderBottom:'2px solid #d4a017',padding:'14px 14px 0',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
          <div>
            <div style={{fontSize:9,letterSpacing:4,color:'#d4a017',fontWeight:700}}>PANINI — FIFA WORLD CUP 2026</div>
            <h1 style={{fontSize:17,fontWeight:900,marginTop:2}}>⚽ Meu Album</h1>
          </div>
          <div style={{display:'flex',gap:8}}>
            {user.is_admin && <button onClick={()=>navigate('/admin')} style={{background:'rgba(212,160,23,0.15)',border:'1px solid rgba(212,160,23,0.4)',borderRadius:8,color:'#d4a017',padding:'6px 12px',cursor:'pointer',fontSize:11,fontWeight:700}}>Admin</button>}
            <button onClick={()=>{localStorage.clear();navigate('/login');}} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#94a3b8',padding:'6px 12px',cursor:'pointer',fontSize:11}}>Sair</button>
          </div>
        </div>
        <div style={{fontSize:11,color:'#64748b',marginBottom:8}}>Ola, <strong style={{color:'#e2e8f0'}}>{user.name}</strong></div>

        {/* barra de progresso */}
        <div style={{marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#94a3b8',marginBottom:3}}>
            <span>Progresso</span>
            <span style={{color:'#d4a017',fontWeight:700}}>{pct}% — {stats.coladas}/{TOTAL}</span>
          </div>
          <div style={{height:4,background:'#1e3a5c',borderRadius:99}}>
            <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#d4a017,#f5cc50)',borderRadius:99,transition:'width 0.4s'}}/>
          </div>
        </div>

        {/* stats */}
        <div style={{display:'flex',maxWidth:240,marginBottom:4}}>
          {[{label:'COLADAS',value:stats.coladas,color:'#4ade80'},{label:'REPETIDAS',value:stats.repetidas,color:'#d4a017'}].map((s,i)=>(
            <div key={i} style={{flex:1,textAlign:'center',padding:'5px 0',borderRight:i===0?'1px solid #1e3a5c':'none'}}>
              <div style={{fontSize:20,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:8,color:'#64748b',letterSpacing:1,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* legenda */}
        <div style={{display:'flex',gap:12,fontSize:9,color:'#64748b',marginBottom:4}}>
          <span><span style={{color:'#4ade80'}}>■</span> Colada</span>
          <span><span style={{color:'#d4a017'}}>■</span> Repetida (+N)</span>
          <span><span style={{color:'#334155'}}>■</span> Nenhuma</span>
          <span style={{color:'#475569'}}>Toque para adicionar • × para remover</span>
        </div>

        {/* main tabs */}
        <div style={{display:'flex',borderTop:'1px solid #1e3a5c',marginTop:6}}>
          {[{id:'album',label:'📗 Meu Album'},{id:'buscar',label:'🔍 Buscar Trocas'}].map(t=>(
            <button key={t.id} onClick={()=>setMainTab(t.id)} style={{flex:1,padding:'10px 4px 12px',background:'none',border:'none',borderBottom:mainTab===t.id?'3px solid #d4a017':'3px solid transparent',color:mainTab===t.id?'#d4a017':'#64748b',cursor:'pointer',fontSize:12,fontWeight:700}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ MEU ÁLBUM ══ */}
      {mainTab==='album' && (
        <div style={{padding:'12px 10px 0'}}>
          {/* filtros + busca */}
          <div style={{display:'flex',gap:6,marginBottom:8}}>
            {[{id:'todas',label:'Todas'},{id:'coladas',label:'Coladas'},{id:'repetidas',label:'Repetidas'}].map(f=>(
              <button key={f.id} onClick={()=>setFilter(f.id)} style={{flex:1,padding:'8px 4px',background:filter===f.id?'rgba(212,160,23,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${filter===f.id?'rgba(212,160,23,0.5)':'rgba(255,255,255,0.08)'}`,borderRadius:9,color:filter===f.id?'#d4a017':'#64748b',cursor:'pointer',fontSize:11,fontWeight:700}}>
                {f.label}
              </button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar seleção..." style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,color:'#e2e8f0',fontSize:13,outline:'none',marginBottom:10,boxSizing:'border-box'}}/>

          {/* grade de times */}
          {visibleTeams.map(team => {
            const teamStickers = Array.from({length:20},(_,i)=>{const c=`${team.code}-${i+1}`;return ownedMap[c]||0;});
            const coladas  = teamStickers.filter(o=>o===1).length;
            const repetidas= teamStickers.filter(o=>o>1).length;
            const totalRep = teamStickers.reduce((a,o)=>a+Math.max(0,o-1),0);
            return(
              <div key={team.code} style={{background:'rgba(255,255,255,0.03)',borderRadius:12,marginBottom:8,border: coladas||repetidas ? '1px solid rgba(255,255,255,0.1)':'1px solid rgba(255,255,255,0.05)',overflow:'hidden'}}>
                <div style={{padding:'8px 12px 0',display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:18}}>{team.flag}</span>
                  <span style={{fontWeight:700,fontSize:13,flex:1}}>{team.name}</span>
                  {coladas>0&&<span style={{fontSize:10,color:'#4ade80',fontWeight:700}}>{coladas} col.</span>}
                  {totalRep>0&&<span style={{fontSize:10,color:'#d4a017',fontWeight:700,marginLeft:4}}>{totalRep} rep.</span>}
                </div>
                {renderSquares(team.code, addOne, removeOne, code=>ownedMap[code]||0, null)}
              </div>
            );
          })}
          {visibleTeams.length===0&&<div style={{textAlign:'center',padding:'40px 20px',color:'#475569'}}><div style={{fontSize:40,marginBottom:12}}>🔍</div><p>Nenhuma seleção encontrada</p></div>}
        </div>
      )}

      {/* ══ BUSCAR TROCAS ══ */}
      {mainTab==='buscar' && (
        <div style={{padding:'14px 10px 0'}}>
          <p style={{color:'#64748b',fontSize:12,marginBottom:12,lineHeight:1.6}}>
            Marque as figurinhas que <strong style={{color:'#e2e8f0'}}>você precisa</strong> e clique em Buscar.
          </p>
          <input value={bSearch} onChange={e=>setBSearch(e.target.value)} placeholder="Filtrar seleção..." style={{width:'100%',padding:'9px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,color:'#e2e8f0',fontSize:13,outline:'none',marginBottom:10,boxSizing:'border-box'}}/>

          {bTeams.map(team => {
            const sel = Array.from({length:20},(_,i)=>needed.has(`${team.code}-${i+1}`)).filter(Boolean).length;
            return(
              <div key={team.code} style={{background:'rgba(255,255,255,0.03)',borderRadius:12,marginBottom:8,border:sel>0?'1px solid rgba(129,140,248,0.35)':'1px solid rgba(255,255,255,0.05)',overflow:'hidden'}}>
                <div style={{padding:'8px 12px 0',display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:18}}>{team.flag}</span>
                  <span style={{fontWeight:700,fontSize:13,flex:1,color:sel>0?'#818cf8':'#e2e8f0'}}>{team.name}</span>
                  {sel>0&&<span style={{background:'#818cf8',color:'#fff',borderRadius:20,padding:'1px 8px',fontSize:9,fontWeight:900}}>{sel} sel.</span>}
                </div>
                {renderSquares(team.code, toggleNeeded, null, ()=>0, code=>needed.has(code))}
              </div>
            );
          })}

          {/* botão buscar fixo */}
          <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(6,13,24,0.96)',padding:'12px 14px',borderTop:'1px solid #1e3a5c',zIndex:20}}>
            <div style={{display:'flex',gap:10,maxWidth:700,margin:'0 auto'}}>
              {needed.size>0&&<button onClick={()=>{setNeeded(new Set());setResults(null);}} style={{padding:'12px 14px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'#94a3b8',cursor:'pointer',fontSize:12}}>Limpar</button>}
              <button onClick={buscar} disabled={searching||!needed.size} style={{flex:1,padding:'13px',background:!needed.size?'#1e3a5c':searching?'#334155':'linear-gradient(135deg,#818cf8,#6366f1)',color:!needed.size?'#475569':'#fff',border:'none',borderRadius:10,fontWeight:900,fontSize:14,cursor:!needed.size||searching?'not-allowed':'pointer',boxShadow:needed.size&&!searching?'0 4px 20px rgba(99,102,241,0.4)':'none'}}>
                {searching?'Buscando...':`🔍 Buscar${needed.size>0?` (${needed.size} fig.)`:''}`}
              </button>
            </div>
          </div>

          {/* resultados */}
          {results!==null&&(
            <div style={{marginTop:20,paddingBottom:80}}>
              <div style={{fontSize:13,fontWeight:700,color:'#94a3b8',marginBottom:14}}>
                {results.length===0?'😕 Nenhum usuario tem essas figurinhas para troca.':`${results.length} usuario${results.length>1?'s':''} com figurinhas disponíveis:`}
              </div>
              {results.map((r,idx)=>{
                const color    = USER_COLORS[idx%USER_COLORS.length];
                const stickerList = r.matches.map(m=>`${m.team_code} ${m.number}`).join(', ');
                const waUrl    = waLink(r.phone, stickerList);
                return(
                  <div key={r.phone} style={{borderRadius:16,marginBottom:14,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.08)'}}>
                    <div style={{background:`linear-gradient(135deg,${color}cc,${color}88)`,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:46,height:46,borderRadius:23,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,color:'#fff',flexShrink:0}}>
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:900,fontSize:15,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.name}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.75)',marginTop:2}}>{r.matches.length} figurinha{r.matches.length>1?'s':''} para troca</div>
                      </div>
                      <a href={waUrl} target="_blank" rel="noreferrer" style={{background:'#25D366',color:'#fff',borderRadius:10,padding:'9px 14px',fontWeight:800,fontSize:12,textDecoration:'none',display:'flex',alignItems:'center',gap:5,boxShadow:'0 2px 12px rgba(37,211,102,0.45)',flexShrink:0}}>
                        💬 WhatsApp
                      </a>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.04)',padding:'12px 14px'}}>
                      <div style={{fontSize:10,color:'#64748b',marginBottom:8,fontWeight:600,letterSpacing:1}}>DISPONÍVEL PARA TROCA</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                        {r.matches.map(m=>(
                          <div key={m.code} style={{background:`${color}18`,border:`1px solid ${color}55`,borderRadius:8,padding:'4px 10px',display:'flex',alignItems:'center',gap:5}}>
                            <span style={{fontSize:13}}>{FLAGS[m.team_code]||'🏳️'}</span>
                            <span style={{fontWeight:700,color:'#e2e8f0',fontSize:12}}>{m.team_code} {m.number}</span>
                            {m.disponiveis>1&&<span style={{background:color,color:'#fff',borderRadius:20,padding:'0 5px',fontSize:9,fontWeight:900}}>×{m.disponiveis}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{background:'rgba(0,0,0,0.2)',padding:'8px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{color:'#64748b',fontSize:11}}>📱 {r.phone}</span>
                      <a href={waUrl} target="_blank" rel="noreferrer" style={{color:'#25D366',fontSize:11,fontWeight:700,textDecoration:'none'}}>Iniciar conversa →</a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
