import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const TEAM_FLAGS = {
  ALG:'🇩🇿',ARG:'🇦🇷',AUS:'🇦🇺',AUT:'🇦🇹',BEL:'🇧🇪',BRA:'🇧🇷',
  CAN:'🇨🇦',CIV:'🇨🇮',COL:'🇨🇴',CPV:'🇨🇻',CRO:'🇭🇷',CUW:'🇨🇼',
  EGY:'🇪🇬',ESP:'🇪🇸',FRA:'🇫🇷',GER:'🇩🇪',GHA:'🇬🇭',HAI:'🇭🇹',
  IRN:'🇮🇷',JOR:'🇯🇴',JPN:'🇯🇵',KOR:'🇰🇷',KSA:'🇸🇦',MAR:'🇲🇦',
  MEX:'🇲🇽',NED:'🇳🇱',NOR:'🇳🇴',NZL:'🇳🇿',PAN:'🇵🇦',PAR:'🇵🇾',
  POR:'🇵🇹',QAT:'🇶🇦',RSA:'🇿🇦',SCO:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',SEN:'🇸🇳',SUI:'🇨🇭',
};

export default function StickerManager() {
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
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
    return Object.entries(map)
      .map(([code, val]) => ({ code, ...val }))
      .filter(t => t.items.some(i => i.owned_count > 0));
  }, [stickers]);

  const stats = useMemo(() => ({
    totalOwned:    stickers.reduce((a, s) => a + s.owned_count, 0),
    uniqueOwned:   stickers.filter(s => s.owned_count > 0).length,
    totalRepetidas: stickers.reduce((a, s) => a + Math.max(0, s.owned_count - 1), 0),
  }), [stickers]);

  const updateOwned = async (code, delta) => {
    const idx = stickers.findIndex(s => s.code === code);
    if (idx < 0) return;
    const newCount = Math.max(0, stickers[idx].owned_count + delta);
    setStickers(prev => prev.map(s => s.code === code ? { ...s, owned_count: newCount } : s));
    setSaving(p => ({ ...p, [code]: true }));
    try {
      await api.put(`/api/stickers/${code}`, { owned_count: newCount });
    } catch {
      // reverter em caso de erro
      setStickers(prev => prev.map(s => s.code === code ? { ...s, owned_count: stickers[idx].owned_count } : s));
    } finally {
      setSaving(p => ({ ...p, [code]: false }));
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#64748b' }}>
      Carregando figurinhas...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#060d18', fontFamily: "'Segoe UI',sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#0f2744,#0a1e38)', borderBottom: '2px solid #d4a017', padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: '#d4a017', fontWeight: 700 }}>PANINI • FIFA WORLD CUP 2026™</div>
            <h1 style={{ fontSize: 17, fontWeight: 900, marginTop: 2 }}>⚽ Figurinhas WC2026</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {user.is_admin && (
              <button onClick={() => navigate('/admin')} style={{ background: 'rgba(212,160,23,0.15)', border: '1px solid rgba(212,160,23,0.4)', borderRadius: 8, color: '#d4a017', padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                Admin
              </button>
            )}
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', padding: '6px 12px', cursor: 'pointer', fontSize: 11 }}>
              Sair
            </button>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
          Olá, <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{user.name}</span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', maxWidth: 320 }}>
          {[
            { label: 'EM MÃOS',    value: stats.totalOwned,     color: '#60a5fa' },
            { label: 'REPETIDAS',  value: stats.totalRepetidas,  color: '#d4a017' },
          ].map((s, i, arr) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 2px', borderRight: i < arr.length - 1 ? '1px solid #1e3a5c' : 'none' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 8, color: '#64748b', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 3, background: '#1e3a5c', marginTop: 12 }}>
          <div style={{ height: '100%', background: '#d4a017', width: `${(stats.uniqueOwned / 720) * 100}%`, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: 14, maxWidth: 700, margin: '0 auto' }}>
        <p style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginBottom: 14, marginTop: 8 }}>
          Suas figurinhas em mãos • 🟡 = repetida • use ➕/➖ para ajustar
        </p>

        {byTeam.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p>Nenhuma figurinha registrada ainda.</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>O admin pode adicionar suas figurinhas.</p>
          </div>
        )}

        {byTeam.map(({ code, name, items }) => {
          const owned = items.filter(i => i.owned_count > 0);
          return (
            <div key={code} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: 10, border: '1px solid rgba(96,165,250,0.15)', overflow: 'hidden' }}>
              <div style={{ background: 'rgba(96,165,250,0.07)', padding: '9px 13px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(96,165,250,0.1)' }}>
                <span style={{ fontSize: 20 }}>{TEAM_FLAGS[code] || '🏳️'}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{name}</span>
                <span style={{ color: '#60a5fa', fontSize: 11, marginLeft: 'auto' }}>
                  {owned.reduce((a, i) => a + i.owned_count, 0)} figurinha{owned.reduce((a, i) => a + i.owned_count, 0) !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {owned.map(item => (
                  <div key={item.code} style={{
                    background: item.owned_count > 1 ? 'rgba(212,160,23,0.12)' : '#0f2744',
                    borderRadius: 10, border: `1px solid ${item.owned_count > 1 ? 'rgba(212,160,23,0.5)' : 'rgba(96,165,250,0.25)'}`,
                    padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6,
                    opacity: saving[item.code] ? 0.6 : 1,
                  }}>
                    <span style={{ fontWeight: 800, color: item.owned_count > 1 ? '#d4a017' : '#60a5fa', fontSize: 12 }}>
                      {code} {item.number}
                    </span>
                    {item.owned_count > 1 && (
                      <span style={{ background: '#d4a017', color: '#060d18', borderRadius: 20, padding: '1px 6px', fontSize: 9, fontWeight: 900 }}>×{item.owned_count}</span>
                    )}
                    <button onClick={() => updateOwned(item.code, -1)} style={btnStyle('#f87171', 'rgba(248,113,113,0.15)')}>−</button>
                    <button onClick={() => updateOwned(item.code, +1)} style={btnStyle('#4ade80', 'rgba(74,222,128,0.15)')}>+</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btnStyle = (color, bg) => ({
  background: bg, border: `1px solid ${color}44`, borderRadius: 5,
  color, cursor: 'pointer', padding: '2px 8px', fontSize: 14, lineHeight: 1, fontWeight: 700,
});
