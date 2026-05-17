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

const TOTAL_ALBUM = 720;

function normalizeInput(val) {
  return val.replace(/[\s\-]/g, '').toUpperCase();
}

function parseCodes(raw) {
  // Suporta: "CAN16, BRA7, FRA12" ou "CAN16 BRA7" ou "CAN16,BRA7"
  return raw
    .split(/[,\s]+/)
    .map(c => c.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
    .filter(Boolean);
}

export default function StickerManager() {
  const [stickers, setStickers] = useState([]); // { code, team_code, team_name, number, owned_count }
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'ok'|'err', msg }
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/api/stickers')
      .then(r => setStickers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Agrupa por time
  const byTeam = useMemo(() => {
    const map = {};
    stickers.forEach(s => {
      if (!map[s.team_code]) map[s.team_code] = { name: s.team_name, items: [] };
      map[s.team_code].items.push(s);
    });
    return Object.entries(map)
      .map(([code, val]) => ({ code, ...val }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stickers]);

  const stats = useMemo(() => {
    const coladas    = stickers.filter(s => s.owned_count >= 1).length;
    const repetidas  = stickers.reduce((a, s) => a + Math.max(0, s.owned_count - 1), 0);
    return { coladas, repetidas };
  }, [stickers]);

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 2500);
  };

  const addSticker = async () => {
    const raw = input.trim();
    if (!raw) return;

    const codes = parseCodes(raw);
    if (codes.length === 0) return;

    setAdding(true);
    const ok = [], err = [];

    for (const code of codes) {
      try {
        const { data } = await api.post('/api/stickers/add', { code });
        ok.push(data);
        setStickers(prev => {
          const idx = prev.findIndex(s => s.code === data.code);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], owned_count: data.owned_count };
            return next;
          }
          return [...prev, data];
        });
      } catch (e) {
        err.push({ code, msg: e.response?.data?.error || 'inválido' });
      }
    }

    // Monta feedback
    let msg = '';
    if (ok.length > 0) {
      const novos    = ok.filter(d => d.owned_count === 1);
      const repets   = ok.filter(d => d.owned_count > 1);
      if (novos.length)  msg += `✅ ${novos.length} colada${novos.length > 1 ? 's' : ''} no álbum`;
      if (repets.length) msg += `${novos.length ? '  •  ' : ''}🔄 ${repets.length} repetida${repets.length > 1 ? 's' : ''}`;
    }
    if (err.length > 0) {
      msg += `${ok.length ? '  •  ' : ''}❌ Inválido${err.length > 1 ? 's' : ''}: ${err.map(e => e.code).join(', ')}`;
    }

    showFeedback(err.length > 0 && ok.length === 0 ? 'err' : 'ok', msg);
    setInput('');
    inputRef.current?.focus();
    setAdding(false);
  };

  const removeSticker = async (code) => {
    try {
      const { data } = await api.post('/api/stickers/remove', { code });
      if (data.owned_count === 0) {
        setStickers(prev => prev.filter(s => s.code !== code));
      } else {
        setStickers(prev => prev.map(s => s.code === code ? { ...s, owned_count: data.owned_count } : s));
      }
    } catch (err) {
      showFeedback('err', err.response?.data?.error || 'Erro ao remover');
    }
  };

  const pct = Math.round((stats.coladas / TOTAL_ALBUM) * 100);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', color:'#64748b', background:'#060d18' }}>
      Carregando...
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#060d18', fontFamily:"'Segoe UI',sans-serif", paddingBottom: 40 }}>

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#0f2744,#0a1e38)', borderBottom:'2px solid #d4a017', padding:'16px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:4, color:'#d4a017', fontWeight:700 }}>PANINI • FIFA WORLD CUP 2026™</div>
            <h1 style={{ fontSize:17, fontWeight:900, marginTop:2, color:'#e2e8f0' }}>⚽ Meu Álbum</h1>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {user.is_admin && (
              <button onClick={() => navigate('/admin')} style={{ background:'rgba(212,160,23,0.15)', border:'1px solid rgba(212,160,23,0.4)', borderRadius:8, color:'#d4a017', padding:'6px 12px', cursor:'pointer', fontSize:11, fontWeight:700 }}>Admin</button>
            )}
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#94a3b8', padding:'6px 12px', cursor:'pointer', fontSize:11 }}>Sair</button>
          </div>
        </div>

        <div style={{ fontSize:11, color:'#64748b', marginBottom:10 }}>
          Olá, <span style={{ color:'#e2e8f0', fontWeight:700 }}>{user.name}</span>
        </div>

        {/* Progresso */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginBottom:4 }}>
            <span>Progresso do álbum</span>
            <span style={{ color:'#d4a017', fontWeight:700 }}>{pct}% • {stats.coladas}/{TOTAL_ALBUM}</span>
          </div>
          <div style={{ height:6, background:'#1e3a5c', borderRadius:99 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#d4a017,#f5cc50)', borderRadius:99, transition:'width 0.5s' }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', maxWidth:280, marginBottom:4 }}>
          {[
            { label:'COLADAS',   value: stats.coladas,   color:'#4ade80' },
            { label:'REPETIDAS', value: stats.repetidas, color:'#d4a017' },
          ].map((s, i) => (
            <div key={i} style={{ flex:1, textAlign:'center', padding:'6px 2px', borderRight: i===0 ? '1px solid #1e3a5c' : 'none' }}>
              <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:8, color:'#64748b', letterSpacing:1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div style={{ display:'flex', gap:14, fontSize:10, color:'#64748b', paddingBottom:12, flexWrap:'wrap' }}>
          <span><span style={{ color:'#4ade80' }}>●</span> Colada no álbum</span>
          <span><span style={{ color:'#d4a017' }}>●</span> Repetida (para troca)</span>
        </div>
      </div>

      {/* INPUT */}
      <div style={{ padding:'14px 14px 0' }}>
        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:14, padding:14, border:'1px solid rgba(212,160,23,0.2)', marginBottom:4 }}>
          <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, marginBottom:8 }}>
            ➕ Registrar figurinha colada
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSticker()}
              placeholder="CAN16  ou  CAN16, BRA7, FRA12"
              maxLength={8}
              style={{
                flex:1, padding:'11px 13px',
                background:'#0a1628', border:'1.5px solid #1e3a5c',
                borderRadius:10, color:'#e2e8f0', fontSize:15,
                fontFamily:'monospace', letterSpacing:1, outline:'none',
                textTransform:'uppercase',
              }}
            />
            <button
              onClick={addSticker}
              disabled={adding || !input.trim()}
              style={{
                padding:'11px 18px',
                background: adding || !input.trim() ? '#1e3a5c' : 'linear-gradient(135deg,#d4a017,#f5cc50)',
                color: adding || !input.trim() ? '#64748b' : '#060d18',
                border:'none', borderRadius:10, fontWeight:900,
                fontSize:14, cursor: adding || !input.trim() ? 'not-allowed' : 'pointer',
                transition:'all 0.2s', minWidth:52,
              }}
            >
              {adding ? '...' : '✓'}
            </button>
          </div>

          {/* Feedback */}
          {feedback && (
            <div style={{
              marginTop:8, padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:600,
              background: feedback.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              color: feedback.type === 'ok' ? '#4ade80' : '#f87171',
              border: `1px solid ${feedback.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
            }}>
              {feedback.msg}
            </div>
          )}
        </div>

        {/* Lista por time */}
        <div style={{ marginTop:14 }}>
          {byTeam.length === 0 && (
            <div style={{ textAlign:'center', padding:'50px 20px', color:'#475569' }}>
              <div style={{ fontSize:44, marginBottom:12 }}>📖</div>
              <p>Nenhuma figurinha registrada ainda.</p>
              <p style={{ fontSize:12, marginTop:6 }}>Digite um código acima para começar!</p>
            </div>
          )}

          {byTeam.map(({ code, name, items }) => {
            const coladas   = items.filter(i => i.owned_count === 1);
            const repetidas = items.filter(i => i.owned_count > 1);
            return (
              <div key={code} style={{ background:'rgba(255,255,255,0.03)', borderRadius:14, marginBottom:10, border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden' }}>
                {/* Header do time */}
                <div style={{ padding:'10px 13px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize:20 }}>{FLAGS[code] || '🏳️'}</span>
                  <span style={{ fontWeight:700, fontSize:13, color:'#e2e8f0' }}>{name}</span>
                  <span style={{ marginLeft:'auto', fontSize:11, color:'#64748b' }}>
                    {items.reduce((a, i) => a + i.owned_count, 0)} figurinha{items.reduce((a, i) => a + i.owned_count, 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                <div style={{ padding:'10px 12px' }}>
                  {/* Coladas */}
                  {coladas.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: repetidas.length > 0 ? 8 : 0 }}>
                      {coladas.map(item => (
                        <div key={item.code} style={{
                          background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.35)',
                          borderRadius:8, padding:'5px 10px', display:'flex', alignItems:'center', gap:5,
                        }}>
                          <span style={{ fontWeight:700, color:'#4ade80', fontSize:12 }}>{code} {item.number}</span>
                          <button onClick={() => removeSticker(item.code)} title="Remover" style={{ background:'none', border:'none', color:'rgba(74,222,128,0.4)', cursor:'pointer', fontSize:11, padding:'0 2px', lineHeight:1 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Repetidas */}
                  {repetidas.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {repetidas.map(item => (
                        <div key={item.code} style={{
                          background:'rgba(212,160,23,0.12)', border:'1px solid rgba(212,160,23,0.5)',
                          borderRadius:8, padding:'5px 10px', display:'flex', alignItems:'center', gap:5,
                        }}>
                          <span style={{ fontWeight:700, color:'#d4a017', fontSize:12 }}>{code} {item.number}</span>
                          <span style={{ background:'#d4a017', color:'#060d18', borderRadius:20, padding:'1px 6px', fontSize:9, fontWeight:900 }}>
                            ×{item.owned_count} — {item.owned_count - 1} p/ troca
                          </span>
                          <button onClick={() => removeSticker(item.code)} title="Remover 1" style={{ background:'none', border:'none', color:'rgba(212,160,23,0.5)', cursor:'pointer', fontSize:11, padding:'0 2px', lineHeight:1 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
