import { useInstall } from '../lib/install';

/** Shown on the Me screen until the app is installed. Renders nothing when there is nothing to offer. */
export function InstallCard() {
  const { installed, canPrompt, showIOSHint, prompt } = useInstall();
  if (installed) return null;
  if (!canPrompt && !showIOSHint) return null;

  return (
    <div className="install">
      <b>Install Splyter</b>
      {canPrompt ? (
        <>
          <p className="small">Add it to your home screen for a full-screen app that opens instantly.</p>
          <button className="primary" onClick={() => void prompt()}>
            Install Splyter
          </button>
        </>
      ) : (
        <p className="small">
          Tap the Share button in Safari, then <b>Add to Home Screen</b>. On iPhone this is also the only way to get notifications.
        </p>
      )}
    </div>
  );
}
