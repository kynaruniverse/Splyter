import { AuthButtons } from '../components/AuthButtons';

/** Shown after the sample cards. Linking keeps the same user id, so their choices are kept. */
export function SignUp({ choices }: { choices: number }) {
  return (
    <div className="screen center">
      <h2>Save your {choices > 0 ? `${choices} ` : ''}splits</h2>
      <p className="tagline">Create an account to keep your choices, find friends and see how you compare.</p>
      <AuthButtons mode="link" />
    </div>
  );
}
