import { NavLink } from 'react-router-dom'

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/feed">Feed</NavLink>
      <NavLink to="/create">Create</NavLink>
      <NavLink to="/profile">You</NavLink>
    </nav>
  )
}