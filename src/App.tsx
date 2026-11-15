import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './lib/auth';
import { api, type FeedItem, type MyProfile } from './lib/api';
import { Welcome } from './screens/Welcome';
import { Onboarding } from './screens/Onboarding';
import { SignUp } from './screens/SignUp';
import { Invite } from './screens/Invite';
import { ProfileSetup } from './screens/ProfileSetup';
import { Feed } from './screens/Feed';
import { Create } from './screens/Create';
import { Me } from './screens/Me';

const ONBOARDING_GOAL = 5;

/** Routes the user to the right step: welcome → play 5 → sign up → invite → profile → app. */
export default function App() {
  const { loading, userId, isAnonymous } = useAuth();

  if (loading) return <div className="screen center">Loading…</div>;
  if (!userId) return <Welcome />;
  return isAnonymous ? <AnonymousFlow userId={userId} /> : <MemberFlow userId={userId} />;
}

function AnonymousFlow({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const count = useQuery({ queryKey: ['choiceCount', userId], queryFn: api.choiceCount });
  const [wantsSignUp, setWantsSignUp] = useState(false);
  // The server count can lag a moment behind, so remember what was chosen on this screen too.
  const [localCount, setLocalCount] = useState(0);

  if (count.isLoading) return <div className="screen center">Loading…</div>;
  const chosen = Math.max(count.data ?? 0, localCount);

  if (wantsSignUp || chosen >= ONBOARDING_GOAL) return <SignUp choices={chosen} />;
  return (
    <Onboarding
      alreadyChosen={chosen}
      goal={ONBOARDING_GOAL}
      onDone={(n) => {
        setLocalCount(n);
        setWantsSignUp(true);
        void qc.invalidateQueries({ queryKey: ['choiceCount'] });
      }}
    />
  );
}

function MemberFlow({ userId }: { userId: string }) {
  const me = useQuery({ queryKey: ['me', userId], queryFn: () => api.myProfile(userId) });

  if (me.isLoading) return <div className="screen center">Loading…</div>;
  if (me.isError || !me.data) return <div className="screen center">Couldn't load your account. Pull to refresh.</div>;
  if (!me.data.inviteRedeemed) return <Invite />;
  if (!me.data.handle) return <ProfileSetup />;
  return <MainApp userId={userId} profile={me.data} />;
}

type Tab = 'feed' | 'create' | 'me';

function MainApp({ userId, profile }: { userId: string; profile: MyProfile }) {
  const [tab, setTab] = useState<Tab>('feed');
  const [remixOf, setRemixOf] = useState<FeedItem | null>(null);

  const startRemix = (item: FeedItem) => {
    setRemixOf(item);
    setTab('create');
  };

  return (
    <div className="app">
      <main>
        {/* The Feed stays mounted so your place in the deck survives a trip to Create or Me. */}
        <div className={tab === 'feed' ? 'pane' : 'pane off'}>
          <Feed userId={userId} active={tab === 'feed'} onRemix={startRemix} />
        </div>
        {tab === 'create' && (
          <Create
            key={remixOf?.post_id ?? 'new'}
            remixOf={remixOf}
            onDone={() => {
              setRemixOf(null);
              setTab('me');
            }}
          />
        )}
        {tab === 'me' && <Me userId={userId} profile={profile} />}
      </main>
      <nav className="tabs">
        <button className={tab === 'feed' ? 'on' : ''} onClick={() => setTab('feed')}>
          Feed
        </button>
        <button
          className={tab === 'create' ? 'on' : ''}
          onClick={() => {
            setRemixOf(null);
            setTab('create');
          }}
        >
          Create
        </button>
        <button className={tab === 'me' ? 'on' : ''} onClick={() => setTab('me')}>
          Me
        </button>
      </nav>
    </div>
  );
}
