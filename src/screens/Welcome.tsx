import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';
import { AuthButtons } from '../components/AuthButtons';

export function Welcome() {
  const { startAnonymous } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await startAnonymous();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="screen center">
      <h1 className="logo">Splyter</h1>
      <p className="tagline">Swipe a choice. See how everyone splits.</p>
      {showSignIn ? (
        <>
          <AuthButtons mode="signin" />
          <button className="link" onClick={() => setShowSignIn(false)}>
            Back
          </button>
        </>
      ) : (
        <div className="form">
          <button className="primary" disabled={busy} onClick={start}>
            Start playing
          </button>
          <button className="link" onClick={() => setShowSignIn(true)}>
            I already have an account
          </button>
          {error && <div className="error">{error}</div>}
        </div>
      )}
    </div>
  );
}
