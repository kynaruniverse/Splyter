import { useNavigate } from 'react-router-dom'
import { startAnonymous } from '../lib/auth'

export function Welcome() {
  const navigate = useNavigate()
  return (
    <div className="gate">
      <h1>Splyter</h1>
      <p className="hint">Five cards. No account yet. See how it feels first.</p>
      <button
        className="primary"
        onClick={async () => {
          await startAnonymous()
          navigate('/onboarding')
        }}
      >
        Start
      </button>
    </div>
  )
}