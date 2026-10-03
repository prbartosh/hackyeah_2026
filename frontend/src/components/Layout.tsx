import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <Link to="/">HackYeah 2026</Link>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
