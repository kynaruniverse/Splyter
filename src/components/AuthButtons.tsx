import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';

/**
 * Google + email-link sign-in.
 *  - mode "signin": for people who already have an account.
 *  - mode "link":   upgrades the current anonymous user and keeps the same user id,
 *                   so the choices made while playing carry over.
 */
export function AuthButtons({ mode }: { mode: 'signin' | 'link' }) {
  const { signInWithGoogle, signInWithEmail, linkGoogle, linkEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="notice">
        Check your inbox for a link to <b>{email}</b>. Open it on this device to finish.
      </div>
    );
  }

  return (
    <div className="form">
      <button className="primary" disabled={busy} onClick={() => run(mode === 'link' ? linkGoogle : signInWithGoogle)}>
        Continue with Google
      </button>
      <div className="or">or</div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await (mode === 'link' ? linkEmail(email.trim()) : signInWithEmail(email.trim()));
            setSent(true);
          });
        }}
      >
        <input type="email" required placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="secondary" type="submit" disabled={busy || !email}>
          Email me a link
        </button>
      </form>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
