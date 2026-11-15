import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { RequireProfile } from './components/RequireProfile'
import { useSession } from './hooks/useSession'
import { Create } from './routes/Create'
import { Feed } from './routes/Feed'
import { Onboarding } from './routes/Onboarding'
import { Profile } from './routes/Profile'
import { PublicSplit } from './routes/PublicSplit'
import { SignIn } from './routes/SignIn'
import { Welcome } from './routes/Welcome'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/split/:id" element={<PublicSplit />} />
        <Route path="/feed" element={<Protected />} />
        <Route path="/create" element={<Protected />} />
        <Route path="/profile" element={<Protected />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function Home() {
  const session = useSession()
  if (session === undefined) return <p className="hint">Loading…</p>
  return <Navigate to={session ? '/feed' : '/welcome'} replace />
}

function Protected() {
  const session = useSession()
  const location = useLocation()

  if (session === undefined) return <p className="hint">Loading…</p>
  if (!session) return <Navigate to="/welcome" replace />

  let screen = <Feed />
  if (location.pathname === '/create') screen = <Create />
  else if (location.pathname === '/profile') screen = <Profile />

  return <RequireProfile userId={session.user.id}>{screen}</RequireProfile>
}