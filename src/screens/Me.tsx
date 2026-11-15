import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, type MyProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { InstallCard } from '../components/InstallCard';

/** Your handle, your Splits with live counts (Wave 1 creator feedback), delete, and sign out. */
export function Me({ userId, profile }: { userId: string; profile: MyProfile }) {
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const splits = useQuery({
    queryKey: ['mySplits', userId],
    queryFn: () => api.mySplits(userId),
    refetchInterval: 15_000, // light polling so the counts feel live without Realtime
  });

  const remove = async (id: string) => {
    if (!window.confirm('Delete this Split? This cannot be undone.')) return;
    try {
      await api.deleteSplit(id);
      await qc.invalidateQueries({ queryKey: ['mySplits'] });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="screen">
      <div className="me-head">
        <div className="avatar-preview" style={{ background: profile.avatar_color ?? '#667' }}>
          {(profile.handle ?? '?')[0]?.toUpperCase()}
        </div>
        <div>
          <b>@{profile.handle}</b>
          {profile.display_name && <div className="small">{profile.display_name}</div>}
        </div>
      </div>

      <InstallCard />

      <h3>Your Splits</h3>
      {splits.data?.length === 0 && <p className="small">Nothing yet. Make your first one from the Create tab.</p>}
      <ul className="split-list">
        {splits.data?.map((s) => (
          <li key={s.id}>
            <div className="split-title">{s.title}</div>
            <div className="small">
              {s.vote_count} votes · {s.skip_count} skips · {s.remix_count} remixes {s.status === 'hidden' && '· hidden pending review'}
            </div>
            <button className="link danger" onClick={() => void remove(s.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      {error && <div className="error">{error}</div>}
      <button className="secondary" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}
