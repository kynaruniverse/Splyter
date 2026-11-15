import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../lib/api';

const COLORS = ['#4aa3ff', '#ff9a3d', '#5ad19a', '#ff5d8f', '#b07cff', '#ffd23f', '#3ddbd9', '#f2f4f8'];

/** Last onboarding step: handle, display name, avatar colour and date of birth (13+). */
export function ProfileSetup() {
  const qc = useQueryClient();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [birthDate, setBirthDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.completeProfile({ handle, displayName, avatarColor: color, birthDate });
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const valid = /^[a-z0-9_]{3,20}$/.test(handle) && birthDate !== '';

  return (
    <div className="screen center">
      <h2>Pick your handle</h2>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="avatar-preview" style={{ background: color }}>
          {(handle[0] ?? '?').toUpperCase()}
        </div>
        <div className="swatches">
          {COLORS.map((c) => (
            <button type="button" key={c} className={c === color ? 'swatch on' : 'swatch'} style={{ background: c }} onClick={() => setColor(c)} aria-label={`Colour ${c}`} />
          ))}
        </div>
        <input placeholder="handle (letters, numbers, _)" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} maxLength={20} autoCapitalize="none" />
        <input placeholder="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
        <label className="field">
          Date of birth
          <input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthDate(e.target.value)} />
        </label>
        <p className="small">Used only to set age-appropriate privacy. It is never shown to anyone.</p>
        <button className="primary" disabled={busy || !valid}>
          Start splitting
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
