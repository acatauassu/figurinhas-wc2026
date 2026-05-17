import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const FLAGS = {
  ALG:'🇩🇿',ARG:'🇦🇷',AUS:'🇦🇺',AUT:'🇦🇹',BEL:'🇧🇪',BRA:'🇧🇷',
  CAN:'🇨🇦',CIV:'🇨🇮',COL:'🇨🇴',CPV:'🇨🇻',CRO:'🇭🇷',CUW:'🇨🇼',
  EGY:'🇪🇬',ESP:'🇪🇸',FRA:'🇫🇷',GER:'🇩🇪',GHA:'🇬🇭',HAI:'🇭🇹',
  IRN:'🇮🇷',JOR:'🇯🇴',JPN:'🇯🇵',KOR:'🇰🇷',KSA:'🇸🇦',MAR:'🇲🇦',
  MEX:'🇲🇽',NED:'🇳🇱',NOR:'🇳🇴',NZL:'🇳🇿',PAN:'🇵🇦',PAR:'🇵🇾',
  POR:'🇵🇹',QAT:'🇶🇦',RSA:'🇿🇦',SCO:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',SEN:'🇸🇳',SUI:'🇨🇭',
};

const TOTAL = 720;

/* "CAN16, BRA 7, fra12" → ["CAN16","BRA7","FRA12"] */
function parseCodes(raw) {
  return raw
    .split(',')
    .map(s => s.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase())
    .filter(Boolean);
}

export default function StickerManager() {
  const [stickers, setStickers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [input,    setInput]    = useState('');
  const [feedback, setFeedback] = useState(null);
  const [adding,   setAdding]   = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/api/stickers')
      .then(r => setStickers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const byTeam = useMemo(() => {
    const map = {};
    stickers.forEach(s => {
      if (!map[s.team_code]) map[s.team_code] = { name: s.team_name, items: [] };
      map[s.team_code].items.push(s);
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [stickers]);

  const stats = useMemo(() => ({
    coladas:   stickers.length,
    repetidas: stickers.reduce((a, s) => a + Math.max(0, s.owned_count - 1), 0),
  }), [stickers]);

  const flash = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  const applyResults = (results) => {
    results.forEach(item => {
      setStickers(prev => {
        const idx = prev.findIndex(s => s.code === item.code);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], owned_count: item.owned_count };
          return next;
        }
        return [...prev, item];
      });
    });
  };

  const addSticker = async () => {
    const codes = parseCodes(input);
    if (!codes.length) return;
    setAdding(true);
    try {
      const { data } = await api.post('/api/stickers/add', { codes });
      applyResults(data.results || []);
      const novos  = (data.results || []).filter(d => d.owned_count === 1).length;
      const repets = (data.results || []).filter(d => d.owned_count > 1).length;
      const errs   = (data.errors  || []).map(e => e.code);
      let msg = '';
      if (novos)  msg += `${novos} colada${novos > 1 ? 's' : ''} no album`;
      if (repets) msg += `${msg ? ' • ' : ''}${repets} repetida${repets > 1 ? 's' : ''}`;
      if (errs.length) msg += `${msg ? ' • ' : ''}Invalido: ${errs.join(', ')}`;
      flash(errs.length && !novos && !repets ? 'err' : 'ok', msg || 'OK');
      setInput('');
      inputRef.current?.focus();
    } catch (e) {
      flash('err', e.response?.data?.error || 'Erro ao registrar');
    } finally { setAdding(false); }
  };

  const removeOne = async (code) => {
    try {
      const { data } = await api.post('/api/stickers/remove', { code });
      if (data.owned_count === 0) setStickers(p => p.filter(s => s.code !== code));
      else setStickers(p => p.map(s => s.code === code ? { ...s, owned_count: data.owned_count } : s));
    } catch (e) { flash('err', e.response?.data?.error || 'Erro'); }
  };

  const pct = Math.round((stats.coladas / TOTAL) * 100);

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'#64748b',background:'#060d18' }}>
      Carregando...
    </div>
  );

  return (
    <div style={{ minHeight:'100vh',background:'#060d18',fontFamily:"'Segoe UI',sans-serif",paddingBottom:40,color:'#e2e8f0' }}>

      {/* ── HEADER ── */}
      <div style={{ background:'linear-gradient(135deg,#0f2744,#0a1e38)',borderBottom:'2px solid #d4a017',padding:'14px 14px 0' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
          <div>
            <div style={{ fontSize:9,letterSpacing:4,color:'#d4a017',fontWeight:700 }}>PANINI - FIFA WORLD CUP 2026</div>
            <h1 style={{ fontSize:17,fontWeight:900,marginTop:2 }}>Meu Album</h1>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            {user.is_admin && (
              <button onClick={() => navigate('/admin')} style={{ background:'rgba(212,160,23,0.15)',border:'1px solid rgba(212,160,23,0.4)',borderRadius:8,color:'#d4a017',padding:'6px 12px',cursor:'pointer',fontSize:11,fontWeight:700 }}>Admin</button>
            )}
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={{ background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#94a3b8',padding:'6px 12px',cursor:'pointer',fontSize:11 }}>Sair</button>
          </div>
        </div>

        <div style={{ fontSize:11,color:'#64748b',marginBottom:10 }}>Ola, <strong style={{ color:'#e2e8f0' }}>{user.name}</strong></div>

        {/* progresso */}
        <div style={{ marginBottom:10 }}>
          <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,color:'#94a3b8',marginBottom:4 }}>
            <span>Progresso do album</span>
            <span style={{ color:'#d4a017',fontWeight:700 }}>{pct}% - {stats.coladas}/{TOTAL}</span>
          </div>
          <div style={{ height:5,background:'#1e3a5c',borderRadius:99 }}>
            <div style={{ height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#d4a017,#f5cc50)',borderRadius:99,transition:'width 0.4s' }} />
          </div>
        </div>

        {/* stats */}
        <div style={{ display:'flex',maxWidth:260,marginBottom:6 }}>
          {[
            { label:'COLADAS',   value:stats.coladas,   color:'#4ade80' },
            { label:'REPETIDAS', value:stats.repetidas, color:'#d4a017' },
          ].map((s,i) => (
            <div key={i} style={{ flex:1,textAlign:'center',padding:'6px 0',borderRight:i===0?'1px solid #1e3a5c':'none' }}>
              <div style={{ fontSize:24,fontWeight:900,color:s.color,lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:8,color:'#64748b',letterSpacing:1,marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex',gap:14,fontSize:10,color:'#64748b',paddingBottom:12 }}>
          <span><span style={{ color:'#4ade80' }}>●</span> Colada no album</span>
          <span><span style={{ color:'#d4a017' }}>●</span> Repetida (para troca)</span>
        </div>
      </div>

      {/* ── INPUT ── */}
      <div style={{ padding:'12px 14px 0' }}>
        <div style={{ background:'rgba(255,255,255,0.04)',borderRadius:13,padding:13,marginBottom:4,border:'1px solid rgba(212,160,23,0.2)' }}>
          <div style={{ fontSize:11,color:'#94a3b8',fontWeight:600,marginBottom:8 }}>Registrar figurinha(s) colada(s)</div>
          <div style={{ display:'flex',gap:8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSticker()}
              placeholder="CAN16   ou   CAN16,BRA7,FRA12"
              maxLength={120}
              style={{ flex:1,padding:'11px 12px',background:'#0a1628',border:'1.5px solid #1e3a5c',borderRadius:9,color:'#e2e8f0',fontSize:14,fontFamily:'monospace',outline:'none' }}
            />
            <button
              onClick={addSticker}
              disabled={adding || !input.trim()}
              style={{ padding:'11px 18px',background:adding||!input.trim()?'#1e3a5c':'linear-gradient(135deg,#d4a017,#f5cc50)',color:adding||!input.trim()?'#64748b':'#060d18',border:'none',borderRadius:9,fontWeight:900,fontSize:15,cursor:adding||!input.trim()?'not-allowed':'pointer',minWidth:50 }}
            >{adding ? '...' : '+'}</button>
          </div>
          <div style={{ fontSize:10,color:'#475569',marginTop:6 }}>Separe por virgula para adicionar varias de uma vez</div>

          {feedback && (
            <div style={{ marginTop:8,padding:'8px 12px',borderRadius:8,fontSize:12,fontWeight:600,background:feedback.type==='ok'?'rgba(74,222,128,0.1)':'rgba(248,113,113,0.1)',color:feedback.type==='ok'?'#4ade80':'#f87171',border:`1px solid ${feedback.type==='ok'?'rgba(74,222,128,0.3)':'rgba(248,113,113,0.3)'}` }}>
              {feedback.type==='ok'?'✅':'❌'} {feedback.msg}
            </div>
          )}
        </div>

        {/* ── LISTA ── */}
        <div style={{ marginTop:12 }}>
          {byTeam.length === 0 && (
            <div style={{ textAlign:'center',padding:'50px 20px',color:'#475569' }}>
              <div style={{ fontSize:44,marginBottom:12 }}>📖</div>
              <p>Nenhuma figurinha registrada.</p>
              <p style={{ fontSize:12,marginTop:6 }}>Use o campo acima para comecar!</p>
            </div>
          )}

          {byTeam.map(({ name, items }) => {
            const code = items[0].team_code;
            return (
              <div key={code} style={{ background:'rgba(255,255,255,0.03)',borderRadius:13,marginBottom:9,border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden' }}>
                <div style={{ padding:'9px 12px',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize:19 }}>{FLAGS[code]||'🏳️'}</span>
                  <span style={{ fontWeight:700,fontSize:13 }}>{name}</span>
                  <span style={{ marginLeft:'auto',fontSize:11,color:'#64748b' }}>
                    {items.reduce((a,i)=>a+i.owned_count,0)} figurinha{items.reduce((a,i)=>a+i.owned_count,0)!==1?'s':''}
                  </span>
                </div>
                <div style={{ padding:'9px 11px',display:'flex',flexWrap:'wrap',gap:6 }}>
                  {items.map(item => {
                    const isRep = item.owned_count > 1;
                    return (
                      <div key={item.code} style={{ background:isRep?'rgba(212,160,23,0.12)':'rgba(74,222,128,0.08)',border:`1px solid ${isRep?'rgba(212,160,23,0.5)':'rgba(74,222,128,0.3)'}`,borderRadius:8,padding:'5px 9px',display:'flex',alignItems:'center',gap:5 }}>
                        <span style={{ fontWeight:700,color:isRep?'#d4a017':'#4ade80',fontSize:12 }}>{code} {item.number}</span>
                        {isRep && (
                          <span style={{ background:'#d4a017',color:'#060d18',borderRadius:20,padding:'1px 6px',fontSize:9,fontWeight:900 }}>x{item.owned_count-1} p/troca</span>
                        )}
                        <button onClick={() => removeOne(item.code)} title="Remover 1" style={{ background:'none',border:'none',color:'rgba(255,255,255,0.2)',cursor:'pointer',fontSize:12,padding:'0 2px',lineHeight:1 }}>x</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
