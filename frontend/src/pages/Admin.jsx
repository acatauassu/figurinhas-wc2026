import { useState, useEffect } from 'react';
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

export default function Admin() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [repetidas, setRepetidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ phone: '+55', name: '' });
  const [addErr, setAddErr] = useState('');
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/users'),
      api.get('/api/admin/repetidas'),
    ]).then(([u, r]) => {
      setUsers(u.data);
      setRepetidas(r.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const addUser = async () => {
    setAddErr('');
    if (!newUser.phone.trim() || !newUser.name.trim()) return setAddErr('Preencha todos os campos');
    try {
      const { data } = await api.post('/api/admin/users', newUser);
      setUsers(prev => [...prev, { ...data, figurinhas_em_maos: 0, total_repetidas: 0 }]);
      setNewUser({ phone: '+55', name: '' });
    } catch (err) {
      setAddErr(err.response?.data?.error || 'Erro ao cadastrar');
    }
  };

  const removeUser = async (id, name) => {
    if (!confirm(`Remover ${name}?`)) return;
    await api.delete(`/api/admin/users/${id}`);
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await api.get('/api/admin/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `repetidas-wc2026-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Erro ao exportar'); }
    finally { setExporting(false); }
  };

  // Agrupar repetidas por usuário
  const repetidasByUser = users.map(u => ({
    user: u,
    items: repetidas.filter(r => r.phone === u.phone),
  })).filter(x => x.items.length > 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#64748b' }}>
      Carregando...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#060d18', fontFamily: "'Segoe UI',sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#0f2744,#0a1e38)', borderBottom: '2px solid #d4a017', padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: '#d4a017', fontWeight: 700 }}>PAINEL ADMIN</div>
            <h1 style={{ fontSize: 17, fontWeight: 900, marginTop: 2 }}>⚽ Figurinhas WC2026</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94a3b8', padding: '6px 12px', cursor: 'pointer', fontSize: 11 }}>
              Minhas Figurinhas
            </button>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, color: '#f87171', padding: '6px 12px', cursor: 'pointer', fontSize: 11 }}>
              Sair
            </button>
          </div>
        </div>

        {/* Stats rápidos */}
        <div style={{ display: 'flex', gap: 0, maxWidth: 360, marginBottom: 8 }}>
          {[
            { label: 'USUÁRIOS',   value: users.length,                      color: '#60a5fa' },
            { label: 'REPETIDAS',  value: repetidas.reduce((a,r) => a + Number(r.repetidas), 0), color: '#d4a017' },
          ].map((s, i, arr) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 2px', borderRight: i < arr.length - 1 ? '1px solid #1e3a5c' : 'none' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 8, color: '#64748b', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid #1e3a5c' }}>
          {[
            { id: 'users', label: '👥 Usuários' },
            { id: 'repetidas', label: '🔄 Repetidas' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '10px 4px 12px', background: 'none', border: 'none',
              borderBottom: tab === t.id ? '3px solid #d4a017' : '3px solid transparent',
              color: tab === t.id ? '#d4a017' : '#64748b',
              cursor: 'pointer', fontSize: 12, fontWeight: 700,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 14, maxWidth: 700, margin: '0 auto' }}>

        {/* ── USUÁRIOS ── */}
        {tab === 'users' && (
          <div>
            {/* Formulário adicionar */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid rgba(212,160,23,0.2)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#d4a017', marginBottom: 12 }}>➕ Adicionar Usuário</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={newUser.name}
                  onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nome"
                  style={{ flex: 1, minWidth: 120, padding: '10px 12px', background: '#0a1628', border: '1.5px solid #1e3a5c', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}
                />
                <input
                  value={newUser.phone}
                  onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+5591999999999"
                  style={{ flex: 1, minWidth: 150, padding: '10px 12px', background: '#0a1628', border: '1.5px solid #1e3a5c', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}
                />
                <button onClick={addUser} style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#d4a017,#f5cc50)', color: '#060d18', border: 'none', borderRadius: 8, fontWeight: 900, cursor: 'pointer', fontSize: 13 }}>
                  Cadastrar
                </button>
              </div>
              {addErr && <div style={{ marginTop: 8, color: '#f87171', fontSize: 12 }}>{addErr}</div>}
            </div>

            {/* Lista de usuários */}
            {users.map(u => (
              <div key={u.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {u.name}
                    {u.is_admin && <span style={{ background: '#d4a017', color: '#060d18', borderRadius: 20, padding: '1px 8px', fontSize: 9, fontWeight: 900 }}>ADMIN</span>}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{u.phone}</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 56 }}>
                  <div style={{ fontWeight: 700, color: '#60a5fa' }}>{u.figurinhas_em_maos || 0}</div>
                  <div style={{ fontSize: 9, color: '#475569' }}>em mãos</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 56 }}>
                  <div style={{ fontWeight: 700, color: '#d4a017' }}>{u.total_repetidas || 0}</div>
                  <div style={{ fontSize: 9, color: '#475569' }}>repetidas</div>
                </div>
                {!u.is_admin && (
                  <button onClick={() => removeUser(u.id, u.name)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, color: '#f87171', padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── REPETIDAS ── */}
        {tab === 'repetidas' && (
          <div>
            <button onClick={exportExcel} disabled={exporting} style={{
              width: '100%', padding: 14, marginBottom: 16,
              background: exporting ? '#334155' : 'linear-gradient(135deg,#1E8449,#27AE60)',
              color: '#fff', border: 'none', borderRadius: 12, fontWeight: 900,
              fontSize: 14, cursor: exporting ? 'not-allowed' : 'pointer', letterSpacing: 1,
            }}>
              {exporting ? 'Gerando Excel...' : '📊 EXPORTAR EXCEL PARA WHATSAPP'}
            </button>

            {repetidasByUser.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569' }}>
                Nenhuma figurinha repetida ainda
              </div>
            ) : (
              repetidasByUser.map(({ user: u, items }) => (
                <div key={u.id} style={{ background: 'rgba(212,160,23,0.05)', borderRadius: 12, marginBottom: 12, border: '1px solid rgba(212,160,23,0.2)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(212,160,23,0.12)', background: 'rgba(212,160,23,0.07)' }}>
                    <span style={{ fontWeight: 700 }}>{u.name}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>{u.phone}</span>
                    <span style={{ marginLeft: 'auto', color: '#d4a017', fontSize: 12, fontWeight: 700 }}>
                      {items.reduce((a, r) => a + Number(r.repetidas), 0)} repetidas
                    </span>
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map((r, i) => (
                      <div key={i} style={{ background: '#0f2744', borderRadius: 8, border: '1px solid rgba(212,160,23,0.4)', padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#d4a017', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {TEAM_FLAGS[r.team_code] || ''} {r.team_code} {r.number}
                        {r.repetidas > 1 && <span style={{ background: '#d4a017', color: '#060d18', borderRadius: 20, padding: '0 5px', fontSize: 9, fontWeight: 900 }}>×{r.repetidas}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
