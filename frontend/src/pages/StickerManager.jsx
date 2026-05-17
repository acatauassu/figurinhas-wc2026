import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// 48 times em ordem alfabética (PT-BR)
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
const TOTAL  = ALL_TEAMS.length * 20; // 960

function parseCodes(raw) {
  return raw.split(',').map(s => s.trim().replace(/[^A-Za-z0-9]/g,'').toUpperCase()).filter(Boolean);
}
function waLink(phone, stickers) {
  const num = phone.replace(/[^0-9]/g,'');
  const msg = encodeURIComponent(`Oi! Vi no gerenciador de figurinhas da Copa 2026 que você tem: ${stickers}. Podemos trocar?`);
  return `https://wa.me/${num}?text=${msg}`;
}

const USER_COLORS = ['#2563eb','#7c3aed','#db2777','#059669','#d97706','#dc2626','#0891b2','#65a30d'];

export default function StickerManager() {
  const [stickers,  setStickers]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [input,     setInput]     = useState('');
  const [feedback,  setFeedback]  = useState(null);
  const [adding,    setAdding]    = useState(false);
  const [mainTab,   setMainTab]   = useState('album');   // 'album' | 'buscar'
  const [filter,    setFilter]    = useState('todas');   // 'todas'|'coladas'|'repetidas'
  // Buscar Trocas
  const [needed,    setNeeded]    = useState(new Set());
  const [teamSearch,setTeamSearch]= useState('');
  const [searching, setSearching] = useState(false);
  const [results,   setResults]   = useState(null);
  const inputRef  = useRef(null);
  const navigate  = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/api/stickers').then(r => setStickers(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    coladas:   stickers.filter(s => s.owned_count >= 1).length,
    repetidas: stickers.reduce((a,s) => a + Math.max(0, s.owned_count - 1), 0),
  }), [stickers]);

  const byTeam = useMemo(() => {
    const map = {};
    stickers.forEach(s => {
      if (!map[s.team_code]) map[s.team_code] = { code:s.team_code, name:s.team_name, items:[] };
      map[s.team_code].items.push(s);
    });
    return Object.values(map)
      .map(team => {
        let items = team.items;
        if (filter === 'coladas')   items = items.filter(i => i.owned_count === 1);
        if (filter === 'repetidas') items = items.filter(i => i.owned_count > 1);
        return { ...team, items };
      })
      .filter(t => t.items.length > 0)
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [stickers, filter]);

  const flash = (type, msg) => { setFeedback({type,msg}); setTimeout(() => setFeedback(null), 3000); };

  const addSticker = async () => {
    const codes = parseCodes(input);
    if (!codes.length) return;
    setAdding(true);
    try {
      const { data } = await api.post('/api/stickers/add', { codes });
      (data.results||[]).forEach(item => {
        setStickers(prev => {
          const idx = prev.findIndex(s => s.code === item.code);
          if (idx >= 0) { const n=[...prev]; n[idx]={...n[idx],owned_count:item.owned_count}; return n; }
          return [...prev, item];
        });
      });
      const novos  = (data.results||[]).filter(d => d.owned_count===1).length;
      const repets = (data.results||[]).filter(d => d.owned_count>1).length;
      const errs   = (data.errors||[]).map(e => e.code);
      let msg = '';
      if (novos)       msg += `${novos} colada${novos>1?'s':''} no album`;
      if (repets)      msg += `${msg?' • ':''}${repets} repetida${repets>1?'s':''}`;
      if (errs.length) msg += `${msg?' • ':''}Invalido: ${errs.join(', ')}`;
      flash(errs.length&&!novos&&!repets?'err':'ok', msg||'OK');
      setInput(''); inputRef.current?.focus();
    } catch (e) { flash('err', e.response?.data?.error||'Erro'); }
    finally { setAdding(false); }
  };

  const removeOne = async (code) => {
    try {
      const { data } = await api.post('/api/stickers/remove', { code });
      if (data.owned_count===0) setStickers(p => p.filter(s => s.code!==code));
      else setStickers(p => p.map(s => s.code===code?{...s,owned_count:data.owned_count}:s));
    } catch (e) { flash('err', e.response?.data?.error||'Erro'); }
  };

  const toggleNeeded = (code) => {
    setNeeded(prev => { const n=new Set(prev); n.has(code)?n.delete(code):n.add(code); return n; });
    setResults(null);
  };

  const buscarTrocas = async () => {
    if (!needed.size) return;
    setSearching(true); setResults(null);
    try {
      const { data } = await api.post('/api/stickers/buscar-trocas', { needed:[...needed] });
      setResults(data);
    } catch (e) { flash('err', 'Erro ao buscar'); }
    finally { setSearching(false); }
  };

  const clearNeeded = () => { setNeeded(new Set()); setResults(null); };

  const filteredTeams = useMemo(() =>
    ALL_TEAMS.filter(t => !teamSearch || t.name.toLowerCase().includes(teamSearch.toLowerCase()) || t.code.toLowerCase().includes(teamSearch.toLowerCase())),
    [teamSearch]
  );

  const pct = Math.round((stats.coladas / TOTAL) * 100);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'#64748b',background:'#060d18'}}>Carregando...</div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#060d18',fontFamily:"'Segoe UI',sans-serif",color:'#e2e8f0',paddingBottom:40}}>

      {/* ══ HEADER ══ */}
      <div style={{background:'linear-gradient(135deg,#0f2744,#0a1e38)',borderBottom:'2px solid #d4a017',padding:'14px 14px 0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
          <div>
            <div style={{fontSize:9,letterSpacing:4,color:'#d4a017',fontWeight:700}}>PANINI - FIFA WORLD CUP 2026</div>
            <h1 style={{fontSize:17,fontWeight:900,marginTop:2}}>Meu Album</h1>
          </div>
          <div style={{display:'flex',gap:8}}>
            {user.is_admin&&<button onClick={()=>navigate('/admin')} style={{background:'rgba(212,160,23,0.15)',border:'1px solid rgba(212,160,23,0.4)',borderRadius:8,color:'#d4a017',padding:'6px 12px',cursor:'pointer',fontSize:11,fontWeight:700}}>Admin</button>}
            <button onClick={()=>{localStorage.clear();navigate('/login');}} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#94a3b8',padding:'6px 12px',cursor:'pointer',fontSize:11}}>Sair</button>
          </div>
        </div>

        <div style={{fontSize:11,color:'#64748b',marginBottom:10}}>Ola, <strong style={{color:'#e2e8f0'}}>{user.name}</strong></div>

        {/* progresso */}
        <div style={{marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#94a3b8',marginBottom:4}}>
            <span>Progresso do album</span>
            <span style={{color:'#d4a017',fontWeight:700}}>{pct}% — {stats.coladas}/{TOTAL}</span>
          </div>
          <div style={{height:5,background:'#1e3a5c',borderRadius:99}}>
            <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#d4a017,#f5cc50)',borderRadius:99,transition:'width 0.4s'}}/>
          </div>
        </div>

        {/* stats */}
        <div style={{display:'flex',maxWidth:260,marginBottom:4}}>
          {[{label:'COLADAS',value:stats.coladas,color:'#4ade80'},{label:'REPETIDAS',value:stats.repetidas,color:'#d4a017'}].map((s,i)=>(
            <div key={i} style={{flex:1,textAlign:'center',padding:'6px 0',borderRight:i===0?'1px solid #1e3a5c':'none'}}>
              <div style={{fontSize:22,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:8,color:'#64748b',letterSpacing:1,marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* main tabs */}
        <div style={{display:'flex',borderTop:'1px solid #1e3a5c',marginTop:8}}>
          {[{id:'album',label:'📗 Meu Album'},{id:'buscar',label:'🔍 Buscar Trocas'}].map(t=>(
            <button key={t.id} onClick={()=>setMainTab(t.id)} style={{flex:1,padding:'10px 4px 12px',background:'none',border:'none',borderBottom:mainTab===t.id?'3px solid #d4a017':'3px solid transparent',color:mainTab===t.id?'#d4a017':'#64748b',cursor:'pointer',fontSize:12,fontWeight:700}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ MEU ALBUM ══ */}
      {mainTab==='album' && (
        <div style={{padding:'12px 14px 0'}}>
          {/* input */}
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:13,padding:13,marginBottom:12,border:'1px solid rgba(212,160,23,0.2)'}}>
            <div style={{fontSize:11,color:'#94a3b8',fontWeight:600,marginBottom:8}}>Registrar figurinha(s) colada(s)</div>
            <div style={{display:'flex',gap:8}}>
              <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSticker()}
                placeholder="CAN16   ou   CAN16,BRA7,FRA12" maxLength={200}
                style={{flex:1,padding:'11px 12px',background:'#0a1628',border:'1.5px solid #1e3a5c',borderRadius:9,color:'#e2e8f0',fontSize:14,fontFamily:'monospace',outline:'none'}}/>
              <button onClick={addSticker} disabled={adding||!input.trim()} style={{padding:'11px 18px',background:adding||!input.trim()?'#1e3a5c':'linear-gradient(135deg,#d4a017,#f5cc50)',color:adding||!input.trim()?'#64748b':'#060d18',border:'none',borderRadius:9,fontWeight:900,fontSize:15,cursor:adding||!input.trim()?'not-allowed':'pointer',minWidth:50}}>
                {adding?'...':'+'}
              </button>
            </div>
            <div style={{fontSize:10,color:'#475569',marginTop:5}}>Separe por virgula para adicionar varias de uma vez</div>
            {feedback&&(
              <div style={{marginTop:8,padding:'8px 12px',borderRadius:8,fontSize:12,fontWeight:600,background:feedback.type==='ok'?'rgba(74,222,128,0.1)':'rgba(248,113,113,0.1)',color:feedback.type==='ok'?'#4ade80':'#f87171',border:`1px solid ${feedback.type==='ok'?'rgba(74,222,128,0.3)':'rgba(248,113,113,0.3)'}`}}>
                {feedback.type==='ok'?'✅':'❌'} {feedback.msg}
              </div>
            )}
          </div>

          {/* filtros */}
          <div style={{display:'flex',gap:6,marginBottom:12}}>
            {[{id:'todas',label:'Todas'},{id:'coladas',label:'Coladas'},{id:'repetidas',label:'Repetidas'}].map(f=>(
              <button key={f.id} onClick={()=>setFilter(f.id)} style={{flex:1,padding:'8px 4px',background:filter===f.id?'rgba(212,160,23,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${filter===f.id?'rgba(212,160,23,0.5)':'rgba(255,255,255,0.08)'}`,borderRadius:9,color:filter===f.id?'#d4a017':'#64748b',cursor:'pointer',fontSize:11,fontWeight:700}}>
                {f.label}
              </button>
            ))}
          </div>

          {/* lista */}
          {byTeam.length===0?(
            <div style={{textAlign:'center',padding:'50px 20px',color:'#475569'}}>
              <div style={{fontSize:44,marginBottom:12}}>{filter==='repetidas'?'🔄':filter==='coladas'?'📗':'📖'}</div>
              <p>{filter==='repetidas'?'Nenhuma repetida ainda.':filter==='coladas'?'Nenhuma figurinha colada ainda.':'Nenhuma figurinha registrada.'}</p>
              {filter==='todas'&&<p style={{fontSize:12,marginTop:6}}>Use o campo acima para comecar!</p>}
            </div>
          ):byTeam.map(({code,name,items})=>(
            <div key={code} style={{background:'rgba(255,255,255,0.03)',borderRadius:13,marginBottom:9,border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden'}}>
              <div style={{padding:'9px 12px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)'}}>
                <span style={{fontSize:19}}>{FLAGS[code]||'🏳️'}</span>
                <span style={{fontWeight:700,fontSize:13}}>{name}</span>
                <span style={{marginLeft:'auto',fontSize:11,color:'#64748b'}}>{items.reduce((a,i)=>a+i.owned_count,0)} fig.</span>
              </div>
              <div style={{padding:'9px 11px',display:'flex',flexWrap:'wrap',gap:6}}>
                {items.map(item=>{const isRep=item.owned_count>1;return(
                  <div key={item.code} style={{background:isRep?'rgba(212,160,23,0.12)':'rgba(74,222,128,0.08)',border:`1px solid ${isRep?'rgba(212,160,23,0.5)':'rgba(74,222,128,0.3)'}`,borderRadius:8,padding:'5px 9px',display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontWeight:700,color:isRep?'#d4a017':'#4ade80',fontSize:12}}>{code} {item.number}</span>
                    {isRep&&<span style={{background:'#d4a017',color:'#060d18',borderRadius:20,padding:'1px 6px',fontSize:9,fontWeight:900}}>x{item.owned_count-1} p/troca</span>}
                    <button onClick={()=>removeOne(item.code)} title="Remover 1" style={{background:'none',border:'none',color:'rgba(255,255,255,0.2)',cursor:'pointer',fontSize:12,padding:'0 2px',lineHeight:1}}>×</button>
                  </div>
                );})}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ BUSCAR TROCAS ══ */}
      {mainTab==='buscar' && (
        <div style={{padding:'14px 14px 0'}}>
          <p style={{color:'#64748b',fontSize:12,marginBottom:14,lineHeight:1.6}}>
            Marque as figurinhas que voce <strong style={{color:'#e2e8f0'}}>precisa</strong> e clique em <strong style={{color:'#d4a017'}}>Buscar</strong> para ver quem tem para trocar.
          </p>

          {/* barra de busca de time */}
          <input value={teamSearch} onChange={e=>setTeamSearch(e.target.value)} placeholder="Filtrar por seleção..." style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,color:'#e2e8f0',fontSize:13,outline:'none',marginBottom:12,boxSizing:'border-box'}}/>

          {/* grade de times */}
          {filteredTeams.map(team=>{
            const teamNeeded = Array.from(needed).filter(c=>c.startsWith(team.code+'-'));
            return(
            <div key={team.code} style={{background:'rgba(255,255,255,0.03)',borderRadius:12,marginBottom:8,border:teamNeeded.length>0?'1px solid rgba(212,160,23,0.35)':'1px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
              <div style={{padding:'7px 11px',display:'flex',alignItems:'center',gap:8,background:teamNeeded.length>0?'rgba(212,160,23,0.07)':'rgba(255,255,255,0.02)'}}>
                <span style={{fontSize:17}}>{team.flag}</span>
                <span style={{fontWeight:700,fontSize:12,color:teamNeeded.length>0?'#d4a017':'#e2e8f0'}}>{team.name}</span>
                {teamNeeded.length>0&&<span style={{marginLeft:'auto',background:'#d4a017',color:'#060d18',borderRadius:20,padding:'1px 7px',fontSize:9,fontWeight:900}}>{teamNeeded.length} sel.</span>}
              </div>
              <div style={{padding:'8px 10px',display:'flex',flexWrap:'wrap',gap:4}}>
                {Array.from({length:20},(_,i)=>{
                  const num=i+1;
                  const code=`${team.code}-${num}`;
                  const sel=needed.has(code);
                  return(
                    <button key={num} onClick={()=>toggleNeeded(code)} style={{width:28,height:28,borderRadius:6,border:sel?'2px solid #818cf8':'1px solid rgba(255,255,255,0.12)',background:sel?'rgba(129,140,248,0.25)':'rgba(255,255,255,0.03)',color:sel?'#818cf8':'#475569',cursor:'pointer',fontSize:11,fontWeight:sel?900:400,transition:'all 0.15s',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          );})}

          {/* botão buscar */}
          <div style={{position:'sticky',bottom:0,background:'#060d18',padding:'12px 0 4px',marginTop:8}}>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              {needed.size>0&&(
                <button onClick={clearNeeded} style={{padding:'11px 14px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'#94a3b8',cursor:'pointer',fontSize:12}}>Limpar</button>
              )}
              <button onClick={buscarTrocas} disabled={searching||!needed.size} style={{flex:1,padding:'13px',background:!needed.size?'#1e3a5c':searching?'#1e3a5c':'linear-gradient(135deg,#818cf8,#6366f1)',color:!needed.size?'#475569':'#fff',border:'none',borderRadius:10,fontWeight:900,fontSize:14,cursor:!needed.size||searching?'not-allowed':'pointer',letterSpacing:0.5,boxShadow:needed.size&&!searching?'0 4px 20px rgba(99,102,241,0.35)':'none'}}>
                {searching?'Buscando...':`🔍 Buscar${needed.size>0?` (${needed.size} selecionada${needed.size>1?'s':''})`:''}`}
              </button>
            </div>
          </div>

          {/* resultados */}
          {results!==null&&(
            <div style={{marginTop:20}}>
              <div style={{fontSize:13,fontWeight:700,color:'#94a3b8',marginBottom:12}}>
                {results.length===0?'Nenhum usuario tem essas figurinhas para troca 😕':`${results.length} usuario${results.length>1?'s':''} com figurinhas para trocar:`}
              </div>

              {results.map((r,idx)=>{
                const color = USER_COLORS[idx%USER_COLORS.length];
                const stickerList = r.matches.map(m=>`${m.team_code} ${m.number}`).join(', ');
                const waUrl = waLink(r.phone, stickerList);
                return(
                  <div key={r.phone} style={{borderRadius:16,marginBottom:14,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.08)'}}>
                    {/* header colorido */}
                    <div style={{background:`linear-gradient(135deg, ${color}dd, ${color}88)`,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:44,height:44,borderRadius:22,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color:'#fff',flexShrink:0}}>
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:900,fontSize:15,color:'#fff'}}>{r.name}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:2}}>{r.matches.length} figurinha{r.matches.length>1?'s':''} disponivel{r.matches.length>1?'is':''}</div>
                      </div>
                      <a href={waUrl} target="_blank" rel="noreferrer" style={{background:'#25D366',color:'#fff',borderRadius:10,padding:'8px 14px',fontWeight:800,fontSize:12,textDecoration:'none',display:'flex',alignItems:'center',gap:6,boxShadow:'0 2px 12px rgba(37,211,102,0.4)',whiteSpace:'nowrap'}}>
                        <span style={{fontSize:16}}>💬</span> WhatsApp
                      </a>
                    </div>

                    {/* figurinhas */}
                    <div style={{background:'rgba(255,255,255,0.04)',padding:'12px 14px'}}>
                      <div style={{fontSize:10,color:'#64748b',marginBottom:8,fontWeight:600}}>DISPONÍVEL PARA TROCA:</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                        {r.matches.map(m=>(
                          <div key={m.code} style={{background:`${color}18`,border:`1px solid ${color}55`,borderRadius:8,padding:'4px 10px',display:'flex',alignItems:'center',gap:5}}>
                            <span style={{fontSize:14}}>{FLAGS[m.team_code]||'🏳️'}</span>
                            <span style={{fontWeight:700,color:'#e2e8f0',fontSize:12}}>{m.team_code} {m.number}</span>
                            {m.disponiveis>1&&<span style={{background:color,color:'#fff',borderRadius:20,padding:'0 5px',fontSize:9,fontWeight:900}}>×{m.disponiveis}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* telefone */}
                    <div style={{background:'rgba(0,0,0,0.2)',padding:'8px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{color:'#64748b',fontSize:11}}>📱 {r.phone}</span>
                      <a href={waUrl} target="_blank" rel="noreferrer" style={{color:'#25D366',fontSize:11,fontWeight:600,textDecoration:'none'}}>Iniciar conversa →</a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{height:80}}/>
        </div>
      )}
    </div>
  );
}
