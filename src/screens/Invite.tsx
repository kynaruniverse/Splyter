import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

export function Invite() {
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.redeemInvite(code);
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen center">
      <h2>Splyter is invite-only for now</h2>
      <p className="tagline">Enter your invite code to get in.</p>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input placeholder="Invite code" autoCapitalize="characters" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="primary" disabled={busy || !code.trim()}>
          Continue
        </button>
        {error && <div className="error">{error}</div>}
      </form>
      <button className="link" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}
