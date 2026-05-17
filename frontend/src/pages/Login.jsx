import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#060d18' },
  card: { background: 'linear-gradient(135deg,#0f2744,#0a1e38)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: 20, padding: 36, width: '100%', maxWidth: 380, textAlign: 'center' },
  badge: { fontSize: 10, letterSpacing: 4, color: '#d4a017', fontWeight: 700, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 900, marginBottom: 6 },
  sub: { color: '#64748b', fontSize: 13, marginBottom: 32 },
  label: { display: 'block', textAlign: 'left', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 },
  input: { width: '100%', padding: '13px 14px', background: '#0a1628', border: '1.5px solid #1e3a5c', borderRadius: 10, color: '#e2e8f0', fontSize: 16, outline: 'none', letterSpacing: 1 },
  btn: { width: '100%', marginTop: 20, padding: '14px', background: 'linear-gradient(135deg,#d4a017,#f5cc50)', color: '#060d18', border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: 'pointer', letterSpacing: 1 },
  err: { marginTop: 14, color: '#f87171', fontSize: 13, background: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: '10px 14px' },
  hint: { marginTop: 20, color: '#475569', fontSize: 11 },
};

export default function Login() {
  const [phone, setPhone] = useState('+55');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!phone.trim()) return setError('Digite seu número de celular');
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/auth/login', { phone: phone.trim() });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate(data.user.is_admin ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚽</div>
        <div style={s.badge}>PANINI • FIFA WORLD CUP 2026™</div>
        <h1 style={s.title}>Figurinhas WC2026</h1>
        <p style={s.sub}>Entre com seu número de celular</p>

        <label style={s.label}>Celular (com código do país)</label>
        <input
          style={s.input}
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+5591999999999"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />

        {error && <div style={s.err}>{error}</div>}

        <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={handleLogin} disabled={loading}>
          {loading ? 'Entrando...' : 'ENTRAR'}
        </button>

        <p style={s.hint}>Não está conseguindo? Fale com o admin do grupo 📲</p>
      </div>
    </div>
  );
}
