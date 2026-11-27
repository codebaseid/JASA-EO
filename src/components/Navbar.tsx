import { ChevronRight, LogIn } from 'lucide-react'

type NavbarProps = {
  currentPage: string
  isSignedIn: boolean
  onOpenLogin: () => void
  onLogout: () => void
}

export default function Navbar({ currentPage, isSignedIn, onOpenLogin, onLogout }: NavbarProps) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>RuangRaya</span>
        <ChevronRight size={14} />
        <b>{currentPage}</b>
      </div>
      <div className="topbar-actions">
        {isSignedIn ? (
          <button className="quiet-button" onClick={onLogout}>Keluar</button>
        ) : (
          <button className="login-button" onClick={onOpenLogin}>
            <LogIn size={15} /> Masuk
          </button>
        )}
      </div>
    </header>
  )
}