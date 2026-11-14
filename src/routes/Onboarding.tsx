import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/Card'
import { useSwipe } from '../hooks/useSwipe'
import { sampleSplits } from '../lib/sampleSplits'
import { useSwipeStore } from '../store/swipe'

export function Onboarding() {
  const [i, setI] = useState(0)
  const navigate = useNavigate()
  const current = sampleSplits[i]

  const { cardRef, bind } = useSwipe({
    onChoice: () => advance(),
    onSkip: () => advance(),
    onBack: () => setI((n) => Math.max(0, n - 1)),
  })

  function advance() {
    if (i + 1 >= sampleSplits.length) {
      navigate('/signin')
      return
    }
    useSwipeStore.getState().reset()
    setI((n) => n + 1)
  }

  return (
    <main className="stack">
      <header className="topbar">
        <span>
          {i + 1} / {sampleSplits.length}
        </span>
      </header>
      <div className="card-area">
        <Card key={current.id} split={current} cardRef={cardRef} bind={bind} />
      </div>
    </main>
  )
}