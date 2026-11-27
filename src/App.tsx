import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowDownToLine, ArrowRight, ArrowUpRight, BadgeCheck, CalendarDays, Check,
  CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Download,
  FileText, Heart, House, LayoutDashboard, Package as PackageIcon,
  Plus, Printer, Search, Settings2, ShieldCheck, Sparkles, Ticket, UsersRound,
  Trash2, Wallet, X,
} from 'lucide-react'
import {
  addonOptions, EventCategory, EventOrder, EventPackage, FinanceEntry, formatDate,
  initialFinance, initialOrders, initialPackages, PaymentIntent, PaymentMethodId,
  paymentMethodGroups, paymentMethodLabel, rupiah,
} from './data'
import Navbar from './components/Navbar'

type Role = 'client' | 'admin'
type Page = 'home' | 'packages' | 'orders' | 'finance' | 'manage'
type AuthUser = { id: string; name: string; email: string; role: Role }
type PackageDraft = Omit<EventPackage, 'id'> & { id?: string }

const categories: (EventCategory | 'Semua')[] = ['Semua', 'Wedding', 'Birthday', 'Corporate', 'Gathering']
const emptyDraft: PackageDraft = {
  name: '', category: 'Wedding', description: '', price: 0, guests: 'hingga 100 tamu', image: '', features: [], active: true,
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) as T : fallback
  } catch {
    return fallback
  }
}

function readPackages() {
  const saved = readStorage<EventPackage[] | null>('ruangraya-packages', null)
  const savedPackages = Array.isArray(saved) ? saved : []
  const savedIds = new Set(savedPackages.map(item => item.id))
  const deletedSeedIds = new Set(readStorage<string[]>('ruangraya-deleted-seed-packages', []))
  return [
    ...savedPackages,
    ...initialPackages.filter(item => !savedIds.has(item.id) && !deletedSeedIds.has(item.id)),
  ]
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-8)}`
}

async function requestAuth<T = void>(url: string, body?: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const result = response.status === 204 ? undefined : await response.json() as { error?: string } & T
  if (!response.ok) throw new Error(result?.error ?? 'Permintaan autentikasi gagal.')
  return result as T
}

function saveCsv(rows: string[][], filename: string) {
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const downloadUrl = URL.createObjectURL(blob)
  link.href = downloadUrl
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
}

function App() {
  return <BrowserRouter><RoutedApp /></BrowserRouter>
}

function RoutedApp() {
  const routerNavigate = useNavigate()
  const location = useLocation()
  const [page, setPage] = useState<Page>('home')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authRole, setAuthRole] = useState<Role>('client')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [pendingBooking, setPendingBooking] = useState<EventPackage | null>(null)
  const [packages, setPackages] = useState(readPackages)
  const [orders, setOrders] = useState(() => readStorage('ruangraya-orders', initialOrders))
  const [finance, setFinance] = useState(() => readStorage('ruangraya-finance', initialFinance))
  const [category, setCategory] = useState<EventCategory | 'Semua'>('Semua')
  const [query, setQuery] = useState('')
  const [bookingPackage, setBookingPackage] = useState<EventPackage | null>(null)
  const [bookingStep, setBookingStep] = useState(1)
  const [eventDate, setEventDate] = useState('')
  const [bookingName, setBookingName] = useState('')
  const [bookingEmail, setBookingEmail] = useState('')
  const [guestCount, setGuestCount] = useState(100)
  const [venue, setVenue] = useState('')
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('QRIS')
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)
  const [paymentError, setPaymentError] = useState('')
  const [invoiceOrder, setInvoiceOrder] = useState<EventOrder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EventOrder | null>(null)
  const [packageDraft, setPackageDraft] = useState<PackageDraft | null>(null)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reportCategory, setReportCategory] = useState('Semua')
  const [financePeriod, setFinancePeriod] = useState('all')

  const role = authUser?.role ?? authRole
  const isSignedIn = authUser !== null
  const pendingPaymentIds = orders
    .filter(order => order.paymentStatus === 'Menunggu pembayaran' && order.paymentIntentId)
    .map(order => order.paymentIntentId)
    .join('|')

  useEffect(() => {
    fetch('/api/auth/session')
      .then(async response => {
        if (!response.ok) throw new Error('Sesi tidak dapat diperiksa.')
        const result = await response.json() as { user: AuthUser | null }
        setAuthUser(result.user)
      })
      .catch(() => setAuthUser(null))
      .finally(() => setAuthLoading(false))
  }, [])

  useEffect(() => {
    const state = location.state as { openLogin?: boolean; role?: Role } | null
    if (location.pathname === '/' && state?.openLogin) {
      setAuthRole(state.role ?? 'client')
      setAuthMode('login')
      setAuthOpen(true)
      routerNavigate('/', { replace: true, state: null })
    }
  }, [location.pathname, location.state, routerNavigate])

  useEffect(() => {
    localStorage.setItem('ruangraya-packages', JSON.stringify(packages))
    localStorage.setItem('ruangraya-orders', JSON.stringify(orders))
    localStorage.setItem('ruangraya-finance', JSON.stringify(finance))
  }, [packages, orders, finance])

  useEffect(() => {
    if (!authUser || role !== 'client' || !pendingPaymentIds) return
    let active = true
    const pollPayments = async () => {
      const paymentIds = pendingPaymentIds.split('|').filter(Boolean)
      await Promise.all(paymentIds.map(async paymentId => {
        try {
          const response = await fetch(`/api/client/payments/${paymentId}`)
          if (!response.ok) return
          const result = await response.json() as { intent: PaymentIntent }
          if (!active || result.intent.status === 'pending') return
          const orderStatus = result.intent.status === 'paid' ? 'Berhasil' : 'Gagal'
          setOrders(current => current.map(order => order.paymentIntentId === paymentId ? {
            ...order,
            paymentStatus: orderStatus,
            status: orderStatus === 'Berhasil' && order.status === 'Menunggu pembayaran' ? 'Pembayaran diverifikasi' : order.status,
          } : order))
          if (orderStatus === 'Berhasil') {
            const paidOrder = orders.find(order => order.paymentIntentId === paymentId)
            if (paidOrder) setFinance(current => current.some(entry => entry.reference === paidOrder.id) ? current : [{
              id: makeId('FIN'), date: new Date().toISOString().slice(0, 10),
              description: `Pembayaran ${paidOrder.packageName} · ${paidOrder.client}`,
              category: paidOrder.category, type: 'Pemasukan', amount: paidOrder.total, reference: paidOrder.id,
            }, ...current])
          }
          setPaymentIntent(current => current?.id === paymentId ? result.intent : current)
          setToast(orderStatus === 'Berhasil' ? `Pembayaran ${result.intent.orderId} berhasil.` : `Pembayaran ${result.intent.orderId} gagal.`)
        } catch {
          if (active) setToast('Status pembayaran belum dapat diperbarui. Mencoba kembali…')
        }
      }))
    }
    void pollPayments()
    const interval = window.setInterval(() => void pollPayments(), 1500)
    return () => { active = false; window.clearInterval(interval) }
  }, [authUser, role, pendingPaymentIds, orders])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const visiblePackages = useMemo(() => packages.filter(item =>
    item.active && (category === 'Semua' || item.category === category) &&
    `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase()),
  ), [packages, category, query])

  const filteredFinance = useMemo(() => finance.filter(entry => {
    const inRange = (!dateFrom || entry.date >= dateFrom) && (!dateTo || entry.date <= dateTo)
    const inCategory = reportCategory === 'Semua' || entry.category === reportCategory
    return inRange && inCategory
  }), [finance, dateFrom, dateTo, reportCategory])

  const totalIncome = filteredFinance.filter(entry => entry.type === 'Pemasukan').reduce((sum, entry) => sum + entry.amount, 0)
  const totalExpense = filteredFinance.filter(entry => entry.type === 'Pengeluaran').reduce((sum, entry) => sum + entry.amount, 0)
  const bookingTotal = bookingPackage ? bookingPackage.price + selectedAddons.reduce((sum, addon) => sum + (addonOptions.find(item => item.name === addon)?.price ?? 0), 0) : 0

  function navigate(nextPage: Page) {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function changeRole(nextRole: Role) {
    setAuthRole(nextRole)
    setAuthMode('login')
    setAuthError('')
    setAuthSuccess('')
  }

  function prepareBooking(item: EventPackage, user: AuthUser) {
    setBookingPackage(item)
    setBookingStep(1)
    setEventDate('')
    setBookingName(user.name)
    setBookingEmail(user.email)
    setGuestCount(100)
    setVenue('')
    setSelectedAddons([])
    setPaymentMethod('QRIS')
    setPaymentIntent(null)
    setPaymentError('')
  }

  function beginBooking(item: EventPackage) {
    if (!authUser) {
      setPendingBooking(item)
      setAuthRole('client')
      setAuthMode('login')
      setAuthError('')
      setAuthSuccess('')
      setAuthOpen(true)
      return
    }
    prepareBooking(item, authUser)
  }

  function toggleAddon(name: string) {
    setSelectedAddons(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name])
  }

  async function startPayment() {
    if (!bookingPackage || !eventDate || !venue.trim() || !authUser) return
    const createdAt = new Date().toISOString().slice(0, 10)
    const order: EventOrder = {
      id: `RR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
      client: bookingName.trim(),
      email: bookingEmail.trim(),
      packageId: bookingPackage.id,
      packageName: bookingPackage.name,
      category: bookingPackage.category,
      date: eventDate,
      guests: guestCount,
      venue: venue.trim(),
      addons: selectedAddons,
      total: bookingTotal,
      status: 'Menunggu pembayaran',
      paymentStatus: 'Menunggu pembayaran',
      paymentMethod: paymentMethodLabel(paymentMethod),
      createdAt,
    }
    setPaymentError('')
    try {
      const { intent } = await requestAuth<{ intent: PaymentIntent }>('/api/client/payments', {
        orderId: order.id,
        amount: String(order.total),
        method: paymentMethod,
      })
      setOrders(current => [{ ...order, paymentIntentId: intent.id }, ...current])
      setPaymentIntent(intent)
      setBookingStep(3)
      setPage('orders')
      setToast('Transaksi dibuat. Menunggu notifikasi pembayaran otomatis…')
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Transaksi tidak dapat dibuat.')
    }
  }

  async function simulatePaymentFailure() {
    if (!paymentIntent) return
    try {
      const { intent } = await requestAuth<{ intent: PaymentIntent }>(`/api/client/payments/${paymentIntent.id}/simulate-failure`, {})
      setPaymentIntent(intent)
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Simulasi gagal diproses.')
    }
  }

  function verifyOrder(id: string) {
    const order = orders.find(item => item.id === id)
    if (!order) return
    setOrders(current => current.map(item => item.id === id ? { ...item, paymentStatus: 'Berhasil', status: 'Pembayaran diverifikasi' } : item))
    setFinance(current => current.some(entry => entry.reference === order.id) ? current : [{
      id: makeId('FIN'), date: new Date().toISOString().slice(0, 10),
      description: `Pembayaran ${order.packageName} · ${order.client}`, category: order.category,
      type: 'Pemasukan', amount: order.total, reference: order.id,
    }, ...current])
    setToast('Pembayaran berhasil diverifikasi.')
  }

  function updateOrderStatus(id: string, status: EventOrder['status']) {
    setOrders(current => current.map(order => order.id === id ? { ...order, status } : order))
    setToast(`Status acara diperbarui menjadi ${status.toLowerCase()}.`)
  }

  async function deleteOrder() {
    if (!deleteTarget) return
    const deletedId = deleteTarget.id
    let cancelFailed = false
    try {
      const response = await fetch(`/api/admin/payments/${encodeURIComponent(deletedId)}/cancel`, { method: 'POST' })
      if (!response.ok) cancelFailed = true
    } catch {
      cancelFailed = true
    }
    setOrders(current => current.filter(order => order.id !== deletedId))
    setFinance(current => current.filter(entry => entry.reference !== deletedId))
    setInvoiceOrder(current => current?.id === deletedId ? null : current)
    setDeleteTarget(null)
    setToast(cancelFailed
      ? `Pesanan ${deletedId} dihapus dari daftar. Status transaksi server belum dapat dibatalkan.`
      : `Pesanan ${deletedId} berhasil dihapus.`)
  }

  function exportReport() {
    saveCsv([
      ['Tanggal', 'Keterangan', 'Kategori', 'Jenis', 'Pemasukan (IDR)', 'Pengeluaran (IDR)', 'Referensi'],
      ...filteredFinance.map(entry => [entry.date, entry.description, entry.category, entry.type,
        entry.type === 'Pemasukan' ? String(entry.amount) : '0', entry.type === 'Pengeluaran' ? String(entry.amount) : '0', entry.reference ?? '']),
      ['', 'TOTAL', '', '', String(totalIncome), String(totalExpense), ''],
    ], 'laporan-keuangan-ruangraya.csv')
  }

  function openPackageEditor(item?: EventPackage) {
    setPackageDraft(item ? { ...item, features: [...item.features] } : { ...emptyDraft })
  }

  function savePackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!packageDraft) return
    const value = { ...packageDraft, price: Number(packageDraft.price), features: packageDraft.features }
    if (value.id) {
      setPackages(current => current.map(item => item.id === value.id ? value as EventPackage : item))
      setToast('Paket berhasil diperbarui.')
    } else {
      setPackages(current => [{ ...value, id: makeId('PKG') } as EventPackage, ...current])
      setToast('Paket baru berhasil ditambahkan.')
    }
    setPackageDraft(null)
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !packageDraft) return
    const reader = new FileReader()
    reader.onload = () => setPackageDraft(current => current ? { ...current, image: String(reader.result) } : current)
    reader.readAsDataURL(file)
  }

  function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const entry: FinanceEntry = {
      id: makeId('FIN'), date: String(form.get('date')), description: String(form.get('description')),
      category: 'Operasional', type: 'Pengeluaran', amount: Number(form.get('amount')),
    }
    setFinance(current => [entry, ...current])
    setExpenseOpen(false)
    setToast('Pengeluaran operasional berhasil dicatat.')
  }

  async function submitLogin(email: string, password: string) {
    setAuthError('')
    setAuthSuccess('')
    try {
      const result = await requestAuth<{ user: AuthUser }>('/api/auth/login', { email, password, role: authRole })
      const user = result.user
      if (user.role !== authRole) throw new Error('Jenis akun tidak sesuai dengan tab yang dipilih.')
      setAuthUser(user)
      setAuthOpen(false)
      setAuthEmail(user.email)
      setPage(user.role === 'admin' ? 'home' : pendingBooking ? 'packages' : 'orders')
      if (user.role === 'client' && pendingBooking) {
        prepareBooking(pendingBooking, user)
        setPendingBooking(null)
      }
      routerNavigate(user.role === 'admin' ? '/admin' : '/client/dashboard', { replace: true })
      setToast(user.role === 'admin' ? 'Berhasil masuk sebagai Pemilik EO.' : 'Selamat datang di dashboard klien.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Email atau kata sandi tidak valid.')
    }
  }

  async function submitRegistration(name: string, email: string, password: string) {
    setAuthError('')
    setAuthSuccess('')
    try {
      await requestAuth('/api/auth/register', { name, email, password })
      setAuthRole('client')
      setAuthMode('login')
      setAuthEmail(email)
      setAuthSuccess('Akun berhasil dibuat. Masuk dengan email dan kata sandi yang baru didaftarkan.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Pendaftaran tidak berhasil.')
    }
  }

  async function signOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setAuthUser(null)
      setAuthOpen(false)
      setBookingPackage(null)
      setInvoiceOrder(null)
      setPage('home')
      routerNavigate('/', { replace: true })
      setToast('Anda telah keluar dari akun.')
    }
  }

  const navItems: { id: Page; label: string; icon: typeof House }[] = role === 'admin'
    ? [{ id: 'home', label: 'Ringkasan', icon: LayoutDashboard }, { id: 'orders', label: 'Pesanan', icon: Ticket }, { id: 'manage', label: 'Paket acara', icon: PackageIcon }, { id: 'finance', label: 'Keuangan', icon: Wallet }]
    : [{ id: 'home', label: 'Beranda', icon: House }, { id: 'packages', label: 'Paket acara', icon: PackageIcon }, { id: 'orders', label: 'Pesanan saya', icon: Ticket }]
  const dashboardOrders = role === 'admin'
    ? orders
    : orders.filter(order => order.email.toLowerCase() === authUser?.email.toLowerCase())

  const dashboard = (
    <div className="app-shell min-h-screen bg-[#f6f5f0] text-[#242a25]">
      <aside className="sidebar">
        <button className="brand-lockup" onClick={() => navigate('home')} aria-label="RuangRaya, beranda">
          <span className="brand-mark"><Sparkles size={18} strokeWidth={1.8} /></span>
          <span className="brand-name">ruang<span>raya</span><small>EVENT STUDIO</small></span>
        </button>
        <div className="workspace-label">RUANG KERJA</div>
        <nav className="side-nav" aria-label="Navigasi utama">
          {navItems.map(item => {
            const Icon = item.icon
            return <button key={item.id} className={`nav-link ${page === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}>
              <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'orders' && role === 'admin' && <b className="nav-count">{orders.filter(order => order.paymentStatus === 'Menunggu pembayaran').length || ''}</b>}
            </button>
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="support-note"><span className="support-dot" /><div><b>Tim kami siap membantu</b><a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer">Hubungi via WhatsApp <ArrowUpRight size={13} /></a></div></div>
          <button className="profile-row" onClick={() => setAuthOpen(true)}>
            <span className="avatar">{role === 'admin' ? 'RR' : authUser?.name.slice(0, 2).toUpperCase()}</span><span className="profile-copy"><b>{role === 'admin' ? 'RuangRaya Studio' : authUser?.name}</b><small>{role === 'admin' ? 'Administrator' : authUser?.email}</small></span><ChevronDown size={16} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <Navbar
          currentPage={pageLabel(page, role)}
          isSignedIn={isSignedIn}
          onOpenLogin={() => setAuthOpen(true)}
          onLogout={signOut}
        />

        <div className="page-content">
          {page === 'home' && (role === 'admin' ? <AdminHome orders={orders} finance={finance} onNavigate={navigate} onVerify={verifyOrder} /> : <ClientHome onNavigate={navigate} packages={packages.filter(item => item.active).slice(0, 3)} onBook={beginBooking} />)}
          {page === 'packages' && <PackageCatalog packages={visiblePackages} category={category} query={query} onCategory={setCategory} onQuery={setQuery} onBook={beginBooking} />}
          {page === 'orders' && <OrdersPage role={role} orders={dashboardOrders} onInvoice={setInvoiceOrder} onVerify={verifyOrder} onStatus={updateOrderStatus} onDelete={setDeleteTarget} onBrowse={() => navigate('packages')} />}
          {page === 'manage' && <ManagePackages packages={packages} onEdit={openPackageEditor} onCreate={() => openPackageEditor()} onDelete={id => {
            if (initialPackages.some(item => item.id === id)) {
              const deletedSeedIds = readStorage<string[]>('ruangraya-deleted-seed-packages', [])
              if (!deletedSeedIds.includes(id)) localStorage.setItem('ruangraya-deleted-seed-packages', JSON.stringify([...deletedSeedIds, id]))
            }
            setPackages(current => current.filter(item => item.id !== id))
            setToast('Paket dihapus dari katalog.')
          }} />}
          {page === 'finance' && <FinancePage entries={filteredFinance} totalIncome={totalIncome} totalExpense={totalExpense} dateFrom={dateFrom} dateTo={dateTo} category={reportCategory} period={financePeriod} onFrom={setDateFrom} onTo={setDateTo} onCategory={setReportCategory} onPeriod={value => { setFinancePeriod(value); if (value === 'all') { setDateFrom(''); setDateTo('') } else if (value === 'month') { const now = new Date(); setDateFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`); setDateTo(now.toISOString().slice(0, 10)) } else if (value === 'day') { const today = new Date().toISOString().slice(0, 10); setDateFrom(today); setDateTo(today) } }} onExport={exportReport} onPrint={() => window.print()} onAddExpense={() => setExpenseOpen(true)} />}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Navigasi mobile">
        {navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><Icon size={20} /><span>{item.label}</span></button> })}
      </nav>

      {bookingPackage && <BookingModal item={bookingPackage} step={bookingStep} date={eventDate} name={bookingName} email={bookingEmail} guests={guestCount} venue={venue} addons={selectedAddons} method={paymentMethod} total={bookingTotal} intent={paymentIntent} error={paymentError} onClose={() => { setBookingPackage(null); setPaymentIntent(null) }} onStep={setBookingStep} onDate={setEventDate} onName={setBookingName} onEmail={setBookingEmail} onGuests={setGuestCount} onVenue={setVenue} onAddon={toggleAddon} onMethod={setPaymentMethod} onPay={startPayment} onSimulateFailure={simulatePaymentFailure} />}
      {invoiceOrder && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
      {deleteTarget && <DeleteOrderModal order={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={deleteOrder} />}
      {packageDraft && <PackageModal draft={packageDraft} onChange={setPackageDraft} onUpload={handleImageUpload} onClose={() => setPackageDraft(null)} onSubmit={savePackage} />}
      {expenseOpen && <ExpenseModal onClose={() => setExpenseOpen(false)} onSubmit={saveExpense} />}
    </div>
  )

  function closeAuth() {
    setAuthOpen(false)
    setPendingBooking(null)
    setAuthError('')
    setAuthSuccess('')
  }

  const publicPage = (
    <div className="app-shell min-h-screen bg-[#f6f5f0] text-[#242a25]">
      <main className="main-area public-main">
        <Navbar
          currentPage={page === 'packages' ? 'Paket acara' : 'Beranda'}
          isSignedIn={false}
          onOpenLogin={() => { setAuthRole('client'); setAuthMode('login'); setAuthOpen(true) }}
          onLogout={() => {}}
        />
        <div className="page-content">
          {page === 'packages'
            ? <PackageCatalog packages={visiblePackages} category={category} query={query} onCategory={setCategory} onQuery={setQuery} onBook={beginBooking} />
            : <ClientHome onNavigate={navigate} packages={packages.filter(item => item.active).slice(0, 3)} onBook={beginBooking} />}
        </div>
      </main>
    </div>
  )

  return (
    <>
      <Routes>
        <Route path="/" element={authLoading ? <LoadingScreen /> : authUser ? <Navigate to={authUser.role === 'admin' ? '/admin' : '/client/dashboard'} replace /> : publicPage} />
        <Route path="/admin/*" element={<RequireRole role="admin" user={authUser} loading={authLoading}>{dashboard}</RequireRole>} />
        <Route path="/client/dashboard/*" element={<RequireRole role="client" user={authUser} loading={authLoading}>{dashboard}</RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {authOpen && <AuthModal
        role={authRole}
        mode={authMode}
        email={authEmail}
        error={authError}
        success={authSuccess}
        onRole={changeRole}
        onMode={setAuthMode}
        onEmail={setAuthEmail}
        onClearMessages={() => { setAuthError(''); setAuthSuccess('') }}
        onClose={closeAuth}
        onLogin={submitLogin}
        onRegister={submitRegistration}
      />}
      {toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}</div>}
    </>
  )
}

function RequireRole({ role, user, loading, children }: { role: Role; user: AuthUser | null; loading: boolean; children: React.ReactNode }) {
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/" replace state={{ openLogin: true, role }} />
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/client/dashboard'} replace state={{ from: location.pathname }} />
  return <>{children}</>
}

function LoadingScreen() {
  return <main className="auth-loading" role="status">Memeriksa sesi akun…</main>
}

function pageLabel(page: Page, role: Role) {
  if (page === 'home') return role === 'admin' ? 'Ringkasan bisnis' : 'Beranda'
  if (page === 'packages' || page === 'manage') return 'Paket acara'
  if (page === 'orders') return role === 'admin' ? 'Pesanan masuk' : 'Pesanan saya'
  return 'Laporan keuangan'
}

function ClientHome({ onNavigate, packages, onBook }: { onNavigate: (page: Page) => void; packages: EventPackage[]; onBook: (item: EventPackage) => void }) {
  return <>
    <section className="hero-panel">
      <div className="hero-copy"><span className="eyebrow light"><span /> DARI IDE MENJADI CERITA</span><h1>Hari istimewa,<br /><em>ditangani sepenuh hati.</em></h1><p>RuangRaya membantu setiap detail terasa mudah, agar kamu bisa hadir sepenuhnya di momen yang berarti.</p><div className="hero-buttons"><button className="button button-lime" onClick={() => onNavigate('packages')}>Temukan paket <ArrowRight size={16} /></button><a href="https://wa.me/6281234567890?text=Halo%20RuangRaya%2C%20saya%20ingin%20konsultasi%20acara." target="_blank" rel="noreferrer" className="hero-link">Konsultasi gratis <ArrowUpRight size={15} /></a></div><div className="hero-proof"><div className="proof-avatars"><span>AN</span><span>DP</span><span>+2</span></div><div><b>Dipercaya 120+ keluarga & tim</b><small>untuk merayakan hal yang penting</small></div></div></div>
      <div className="hero-image" role="img" aria-label="Dekorasi meja acara pernikahan di ruang terbuka"><div className="image-caption"><span>01 / CERITA KAMI</span><b>Perayaan yang terasa seperti kamu.</b></div></div>
    </section>
    <section className="trust-strip"><div><b>120+</b><span>acara terwujud</span></div><div><b>4,9 <span className="star">★</span></b><span>rata-rata ulasan</span></div><div><b>8 tahun</b><span>merancang momen</span></div><p>Mulai dari satu percakapan,<br />kami urus sisanya.</p></section>
    <section className="section-block"><div className="section-heading"><div><span className="eyebrow">PILIHAN YANG PAS</span><h2>Mulai dari momenmu.</h2></div><button className="text-link" onClick={() => onNavigate('packages')}>Lihat semua paket <ArrowRight size={15} /></button></div><div className="featured-grid">{packages.map(item => <PackageCard key={item.id} item={item} onBook={onBook} />)}</div></section>
    <section className="story-section"><div className="story-photo" role="img" aria-label="Suasana acara perusahaan yang hangat" /><div><span className="eyebrow">CARA KAMI BEKERJA</span><h2>Rapi di balik layar.<br /><em>Hangat di tengah acara.</em></h2><p>Kami percaya acara terbaik bukan yang paling ramai dekorasi, melainkan yang paling terasa dekat dengan orang-orang di dalamnya.</p><button className="text-link" onClick={() => onNavigate('packages')}>Kenali cara kami <ArrowRight size={15} /></button></div></section>
    <section className="portfolio-section"><div className="section-heading"><div><span className="eyebrow">POTONGAN CERITA</span><h2>Momen yang kami rancang.</h2></div><span className="portfolio-note">Visual ilustrasi · demo</span></div><div className="portfolio-grid"><article className="portfolio-card"><div className="portfolio-image wedding" role="img" aria-label="Inspirasi dekorasi pernikahan outdoor" /><div><span>KONSEP WEDDING · KARANGANYAR</span><b>Janji di antara kebun</b><small>Intim · kebun terbuka</small></div></article><article className="portfolio-card"><div className="portfolio-image corporate" role="img" aria-label="Inspirasi acara perusahaan di ruang konferensi" /><div><span>KONSEP CORPORATE · SOLO</span><b>Ruang untuk bertumbuh</b><small>Konferensi · kolaborasi tim</small></div></article><article className="portfolio-card"><div className="portfolio-image gathering" role="img" aria-label="Inspirasi jamuan makan malam kebersamaan" /><div><span>KONSEP GATHERING · TAWANGMANGU</span><b>Satu meja, banyak cerita</b><small>Jamuan keluarga · ruang terbuka</small></div></article></div></section>
    <section className="testimonial"><span className="quote-mark">“</span><blockquote>RuangRaya mengerti yang kami butuhkan bahkan sebelum kami bisa menjelaskannya. Hari itu terasa benar-benar milik kami.</blockquote><div className="quote-person"><span className="avatar avatar-small">AN</span><span><b>Aditya & Nisa</b><small>Pernikahan, Juli 2026</small></span></div></section>
    <footer className="site-footer"><div><span className="brand-name">ruang<span>raya</span></span><p>Merancang perayaan dengan cerita.</p></div><div><span>Solo, Jawa Tengah</span><a href="mailto:halo@ruangraya.id">halo@ruangraya.id</a><a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer">WhatsApp kami <ArrowUpRight size={13} /></a></div><small>© 2026 RuangRaya Event Studio</small></footer>
  </>
}

function PackageCard({ item, onBook }: { item: EventPackage; onBook: (item: EventPackage) => void }) {
  return <article className="package-card"><div className="package-photo" style={{ backgroundImage: `url("${item.image}")` }}><span className="category-chip">{item.category}</span><button aria-label={`Simpan ${item.name}`} className="save-button"><Heart size={16} /></button></div><div className="package-card-body"><div className="package-title-row"><h3>{item.name}</h3><span><UsersRound size={14} /> {item.guests}</span></div><p>{item.description}</p><ul>{item.features.slice(0, 3).map(feature => <li key={feature}><Check size={13} />{feature}</li>)}</ul><div className="package-price-row"><div><small>Mulai dari</small><b>{rupiah(item.price)}</b></div><button className="round-arrow" aria-label={`Pesan ${item.name}`} onClick={() => onBook(item)}><ArrowUpRight size={17} /></button></div></div></article>
}

function PackageCatalog({ packages, category, query, onCategory, onQuery, onBook }: { packages: EventPackage[]; category: EventCategory | 'Semua'; query: string; onCategory: (value: EventCategory | 'Semua') => void; onQuery: (value: string) => void; onBook: (item: EventPackage) => void }) {
  return <section className="content-section"><div className="page-intro"><div><span className="eyebrow">KATALOG RUANGRAYA</span><h1>Paket yang terasa <em>tepat.</em></h1><p>Harga transparan, fasilitas jelas. Ceritakan kebutuhanmu, lalu kita sesuaikan bersama.</p></div><div className="catalog-note"><ShieldCheck size={17} /><span>Konsultasi awal<br /><b>tanpa biaya</b></span></div></div><div className="catalog-controls"><div className="filter-tabs">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => onCategory(item)}>{item}</button>)}</div><label className="search-box"><Search size={16} /><input value={query} onChange={event => onQuery(event.target.value)} placeholder="Cari paket acara" /></label></div><div className="catalog-count">Menampilkan <b>{packages.length} paket</b></div>{packages.length ? <div className="catalog-grid">{packages.map(item => <PackageCard key={item.id} item={item} onBook={onBook} />)}</div> : <div className="empty-state"><PackageIcon size={25} /><b>Belum ada paket yang cocok.</b><span>Coba kata kunci atau kategori yang berbeda.</span></div>}</section>
}

function AdminHome({ orders, finance, onNavigate, onVerify }: { orders: EventOrder[]; finance: FinanceEntry[]; onNavigate: (page: Page) => void; onVerify: (id: string) => void }) {
  const income = finance.filter(item => item.type === 'Pemasukan').reduce((sum, item) => sum + item.amount, 0)
  const pending = orders.filter(item => item.paymentStatus === 'Menunggu pembayaran')
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  return <section className="content-section admin-overview"><div className="page-intro admin-intro"><div><span className="eyebrow">{today.toLocaleUpperCase('id-ID')}</span><h1>Pagi yang baik, <em>RuangRaya.</em></h1><p>Ini ringkasan hal yang bergerak di studio minggu ini.</p></div><button className="button button-dark" onClick={() => onNavigate('manage')}><Plus size={16} /> Tambah paket</button></div><div className="metric-grid"><Metric label="Total pemasukan" value={rupiah(income)} note="Akumulasi tercatat" icon={<CircleDollarSign size={19} />} trend="+12,8%" /><Metric label="Acara berjalan" value={String(orders.filter(item => item.status !== 'Selesai').length).padStart(2, '0')} note="Perlu perhatian minggu ini" icon={<CalendarDays size={19} />} trend="3 segera" /><Metric label="Klien terjangkau" value={String(new Set(orders.map(item => item.email)).size + 38)} note="Bertambah bulan ini" icon={<UsersRound size={19} />} trend="+8 klien" /></div><div className="admin-columns"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">PERLU DITINDAKLANJUTI</span><h2>Verifikasi pembayaran</h2></div><button className="text-link" onClick={() => onNavigate('orders')}>Semua pesanan <ArrowRight size={14} /></button></div>{pending.length ? pending.map(order => <div className="attention-row" key={order.id}><span className="attention-icon"><Clock3 size={17} /></span><div className="attention-copy"><b>{order.client}</b><span>{order.packageName} · {formatDate(order.date)}</span></div><strong>{rupiah(order.total)}</strong><button className="mini-action" onClick={() => onVerify(order.id)}>Verifikasi <Check size={14} /></button></div>) : <div className="inline-empty"><BadgeCheck size={18} />Semua pembayaran sudah diperiksa.</div>}</section><section className="panel schedule-panel"><div className="panel-heading"><div><span className="eyebrow">KALENDER TIM</span><h2>Agenda terdekat</h2></div><button className="icon-button" aria-label="Lihat agenda" onClick={() => onNavigate('orders')}><ArrowUpRight size={17} /></button></div>{orders.filter(order => order.status !== 'Selesai').slice(0, 3).map(order => <div className="schedule-row" key={order.id}><div className="schedule-date"><b>{new Date(`${order.date}T00:00:00`).getDate()}</b><span>{new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(`${order.date}T00:00:00`))}</span></div><div><b>{order.packageName}</b><span>{order.client} · {order.venue}</span></div><i className={`status-dot ${order.status === 'Persiapan' ? 'green' : ''}`} /></div>)}</section></div><div className="lower-admin-row"><div className="progress-note"><span className="progress-symbol"><Sparkles size={19} /></span><div><b>Momen baik dimulai dari detail yang rapi.</b><span>Periksa checklist acara yang akan datang sebelum briefing tim.</span></div><button className="text-link" onClick={() => onNavigate('orders')}>Buka pesanan <ArrowRight size={14} /></button></div><button className="report-shortcut" onClick={() => onNavigate('finance')}><span><Wallet size={18} /></span><div><b>Laporan keuangan</b><small>Pemasukan dan pengeluaran</small></div><ArrowUpRight size={16} /></button></div></section>
}

function Metric({ label, value, note, icon, trend }: { label: string; value: string; note: string; icon: React.ReactNode; trend: string }) {
  return <article className="metric-card"><div className="metric-top"><span className="metric-icon">{icon}</span><span className="metric-trend">{trend}</span></div><small>{label}</small><b className="metric-value">{value}</b><span className="metric-note">{note}</span></article>
}

function OrdersPage({ role, orders, onInvoice, onVerify, onStatus, onDelete, onBrowse }: {
  role: Role
  orders: EventOrder[]
  onInvoice: (order: EventOrder) => void
  onVerify: (id: string) => void
  onStatus: (id: string, status: EventOrder['status']) => void
  onDelete: (order: EventOrder) => void
  onBrowse: () => void
}) {
  return <section className="content-section">
    <div className="page-intro">
      <div>
        <span className="eyebrow">{role === 'admin' ? 'RUANG KERJA PEMILIK' : 'AREA KLIEN'}</span>
        <h1>{role === 'admin' ? <>Pesanan <span className="heading-italic">masuk.</span></> : <>Momen yang <span className="heading-italic">sedang disiapkan.</span></>}</h1>
        <p>{role === 'admin' ? 'Pantau pembayaran dan perkembangan setiap acara.' : 'Semua detail acara dan status persiapan, tersimpan di satu tempat.'}</p>
      </div>
      {role === 'client' && <button className="button button-dark" onClick={onBrowse}>Cari paket <ArrowRight size={15} /></button>}
    </div>
    {orders.length ? <div className="orders-list">{orders.map(order => <article className="order-card" key={order.id}>
      <div className="order-topline">
        <div>
          <span className="order-id">{order.id}</span>
          <span className={`status-pill ${order.paymentStatus === 'Berhasil' ? 'success' : order.paymentStatus === 'Gagal' ? 'danger' : 'waiting'}`}><i />{order.paymentStatus}</span>
        </div>
        <span className="order-date">Dibuat {formatDate(order.createdAt)}</span>
      </div>
      <div className="order-main">
        <div className="order-symbol"><CalendarDays size={21} /></div>
        <div className="order-details">
          <h3>{order.packageName}</h3>
          <p><CalendarDays size={14} />{formatDate(order.date)} <span>·</span><UsersRound size={14} />{order.guests} tamu</p>
          <p><span className="map-pin">⌖</span>{order.venue}</p>
        </div>
        <div className="order-total"><small>Total transaksi</small><b>{rupiah(order.total)}</b><span>{order.paymentMethod}</span></div>
      </div>
      <div className="event-progress">
        <div className="progress-track"><span style={{ width: progressWidth(order.status) }} /></div>
        <div className="progress-labels">
          <span className={progressIndex(order.status) >= 0 ? 'done' : ''}>Pesanan dibuat</span>
          <span className={progressIndex(order.status) >= 1 ? 'done' : ''}>Pembayaran</span>
          <span className={progressIndex(order.status) >= 2 ? 'done' : ''}>Persiapan acara</span>
          <span className={progressIndex(order.status) >= 3 ? 'done' : ''}>Selesai</span>
        </div>
      </div>
      <div className="order-actions">
        <span>{order.addons.length ? `Tambahan: ${order.addons.join(', ')}` : 'Paket utama'}</span>
        <div>
          {role === 'admin' && order.paymentStatus === 'Menunggu pembayaran' && <button className="mini-action" onClick={() => onVerify(order.id)}>Verifikasi pembayaran <Check size={14} /></button>}
          {role === 'admin' && order.paymentStatus === 'Berhasil' && <select aria-label="Ubah status acara" className="status-select" value={order.status} onChange={event => onStatus(order.id, event.target.value as EventOrder['status'])}><option>Menunggu pembayaran</option><option>Pembayaran diverifikasi</option><option>Persiapan</option><option>Selesai</option></select>}
          <button className="outline-button" onClick={() => onInvoice(order)}><FileText size={15} /> Invoice</button>
          {role === 'admin' && <button className="outline-button delete-order-button" onClick={() => onDelete(order)} aria-label={`Hapus pesanan ${order.id}`}><Trash2 size={15} /><span>Hapus</span></button>}
        </div>
      </div>
    </article>)}</div> : <div className="empty-state"><Ticket size={24} /><b>Belum ada pesanan.</b><span>Acara yang kamu pesan akan muncul di sini.</span>{role === 'client' && <button className="text-link" onClick={onBrowse}>Jelajahi paket <ArrowRight size={14} /></button>}</div>}
  </section>
}

function progressIndex(status: EventOrder['status']) {
  if (status === 'Menunggu pembayaran') return 0
  if (status === 'Pembayaran diverifikasi') return 1
  if (status === 'Persiapan') return 2
  return 3
}

function progressWidth(status: EventOrder['status']) {
  return `${[10, 38, 68, 100][progressIndex(status)]}%`
}

function ManagePackages({ packages, onEdit, onCreate, onDelete }: { packages: EventPackage[]; onEdit: (item: EventPackage) => void; onCreate: () => void; onDelete: (id: string) => void }) {
  return <section className="content-section"><div className="page-intro"><div><span className="eyebrow">KATALOG STUDIO</span><h1>Atur paket <em>acara.</em></h1><p>Kelola harga, detail fasilitas, dan foto yang tampil di katalog klien.</p></div><button className="button button-dark" onClick={onCreate}><Plus size={16} /> Paket baru</button></div><div className="manage-table panel"><div className="table-head"><span>PAKET</span><span>KATEGORI</span><span>HARGA MULAI</span><span>STATUS</span><span /></div>{packages.map(item => <div className="manage-row" key={item.id}><div className="manage-package"><span className="manage-thumb" style={{ backgroundImage: `url("${item.image}")` }} /><span><b>{item.name}</b><small>{item.guests}</small></span></div><span className="table-category">{item.category}</span><b>{rupiah(item.price)}</b><span className={`availability ${item.active ? 'on' : 'off'}`}><i />{item.active ? 'Tayang' : 'Disembunyikan'}</span><div className="table-actions"><button className="icon-button" aria-label={`Edit ${item.name}`} onClick={() => onEdit(item)}><Settings2 size={16} /></button><button className="icon-button danger-hover" aria-label={`Hapus ${item.name}`} onClick={() => window.confirm(`Hapus paket ${item.name}?`) && onDelete(item.id)}><X size={16} /></button></div></div>)}</div></section>
}

function FinancePage({ entries, totalIncome, totalExpense, dateFrom, dateTo, category, period, onFrom, onTo, onCategory, onPeriod, onExport, onPrint, onAddExpense }: { entries: FinanceEntry[]; totalIncome: number; totalExpense: number; dateFrom: string; dateTo: string; category: string; period: string; onFrom: (value: string) => void; onTo: (value: string) => void; onCategory: (value: string) => void; onPeriod: (value: string) => void; onExport: () => void; onPrint: () => void; onAddExpense: () => void }) {
  return <section className="content-section"><div className="page-intro"><div><span className="eyebrow">KEUANGAN STUDIO</span><h1>Angka yang <em>terbaca jelas.</em></h1><p>Pemasukan pesanan tercatat otomatis. Biaya operasional bisa ditambahkan manual.</p></div><button className="button button-dark" onClick={onAddExpense}><Plus size={16} /> Catat pengeluaran</button></div><div className="finance-summary"><div><span className="summary-icon income"><ArrowDownToLine size={17} /></span><small>Total pemasukan</small><b>{rupiah(totalIncome)}</b><span>Pesanan terverifikasi</span></div><div><span className="summary-icon expense"><ArrowUpRight size={17} /></span><small>Total pengeluaran</small><b>{rupiah(totalExpense)}</b><span>Biaya operasional</span></div><div><span className="summary-icon balance"><CircleDollarSign size={17} /></span><small>Saldo bersih</small><b>{rupiah(totalIncome - totalExpense)}</b><span>Dari hasil filter saat ini</span></div></div><section className="panel finance-panel"><div className="panel-heading finance-title"><div><span className="eyebrow">RINGKASAN TRANSAKSI</span><h2>Arus kas</h2></div><div className="export-actions"><button className="outline-button" onClick={onPrint}><Printer size={15} /> Simpan PDF</button><button className="outline-button" onClick={onExport}><Download size={15} /> Ekspor CSV</button></div></div><div className="finance-filters"><label className="select-wrap"><span>Periode</span><select value={period} onChange={event => onPeriod(event.target.value)}><option value="all">Semua tanggal</option><option value="day">Hari ini</option><option value="month">Bulan ini</option><option value="custom">Rentang khusus</option></select></label><label className="date-filter"><span>Dari</span><input aria-label="Tanggal mulai" type="date" value={dateFrom} onChange={event => { onPeriod('custom'); onFrom(event.target.value) }} /></label><label className="date-filter"><span>Sampai</span><input aria-label="Tanggal akhir" type="date" value={dateTo} onChange={event => { onPeriod('custom'); onTo(event.target.value) }} /></label><label className="select-wrap"><span>Kategori</span><select value={category} onChange={event => onCategory(event.target.value)}><option>Semua</option><option>Wedding</option><option>Birthday</option><option>Corporate</option><option>Gathering</option><option>Operasional</option></select></label></div><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>TANGGAL</th><th>KETERANGAN</th><th>KATEGORI</th><th>JENIS</th><th className="amount-cell">NILAI</th></tr></thead><tbody>{entries.map(entry => <tr key={entry.id}><td>{formatDate(entry.date)}</td><td><b>{entry.description}</b>{entry.reference && <small>Ref. {entry.reference}</small>}</td><td><span className="table-category">{entry.category}</span></td><td><span className={`transaction-type ${entry.type === 'Pemasukan' ? 'income-text' : 'expense-text'}`}>{entry.type}</span></td><td className={`amount-cell ${entry.type === 'Pemasukan' ? 'income-text' : 'expense-text'}`}>{entry.type === 'Pemasukan' ? '+' : '−'}{rupiah(entry.amount)}</td></tr>)}</tbody></table>{entries.length === 0 && <div className="table-empty">Tidak ada transaksi untuk filter ini.</div>}</div><div className="table-footer"><span>{entries.length} transaksi ditampilkan</span><div><span>Selisih bersih</span><b>{rupiah(totalIncome - totalExpense)}</b></div></div><FinancialReportPrint entries={entries} totalIncome={totalIncome} totalExpense={totalExpense} period={period} dateFrom={dateFrom} dateTo={dateTo} /></section></section>
}

function reportPeriodLabel(period: string, dateFrom: string, dateTo: string) {
  if (period === 'month' && dateFrom) return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${dateFrom}T00:00:00`))
  if (period === 'day' && dateFrom) return formatDate(dateFrom)
  if (dateFrom && dateTo) return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
  if (dateFrom) return `Sejak ${formatDate(dateFrom)}`
  if (dateTo) return `Sampai ${formatDate(dateTo)}`
  return 'Seluruh periode'
}

function FinancialReportPrint({ entries, totalIncome, totalExpense, period, dateFrom, dateTo }: { entries: FinanceEntry[]; totalIncome: number; totalExpense: number; period: string; dateFrom: string; dateTo: string }) {
  return <article className="financial-report-print print-area" aria-label="Lembar laporan keuangan untuk dicetak">
    <header className="report-document-header">
      <span className="report-logo"><Sparkles size={16} strokeWidth={1.8} /></span>
      <b>Ruang Raya</b>
      <span>Ruang Raya Event Studio - Financial Report</span>
    </header>
    <h2 className="report-document-title">RINGKASAN KEUANGAN BULANAN</h2>
    <dl className="report-document-meta">
      <div><dt>Jenis Laporan</dt><dd>Arus Kas / Transaksi</dd></div>
      <div><dt>Periode</dt><dd>{reportPeriodLabel(period, dateFrom, dateTo)}</dd></div>
      <div><dt>Tanggal Cetak</dt><dd>{formatDate(new Date().toISOString().slice(0, 10))}</dd></div>
    </dl>
    <table className="report-document-table">
      <thead><tr><th>NO.</th><th>TANGGAL</th><th>KETERANGAN</th><th>KATEGORI</th><th>JENIS (DEBIT/KREDIT)</th><th>JUMLAH (Rp)</th></tr></thead>
      <tbody>
        {entries.map((entry, index) => <tr key={entry.id}>
          <td>{index + 1}</td>
          <td>{formatDate(entry.date)}</td>
          <td>{entry.description}</td>
          <td>{entry.category}</td>
          <td>{entry.type === 'Pemasukan' ? 'Debit' : 'Kredit'}</td>
          <td className="report-amount">{rupiah(entry.amount)}</td>
        </tr>)}
        {entries.length === 0 && <tr><td className="report-empty-row" colSpan={6}>Tidak ada transaksi pada periode ini.</td></tr>}
      </tbody>
      <tfoot>
        <tr><th colSpan={5}>Total Pendapatan (Debit)</th><td className="report-amount">{rupiah(totalIncome)}</td></tr>
        <tr><th colSpan={5}>Total Pengeluaran (Kredit)</th><td className="report-amount">{rupiah(totalExpense)}</td></tr>
        <tr className="report-net-row"><th colSpan={5}>Saldo Bersih Akhir (Rp)</th><td className="report-amount">{rupiah(totalIncome - totalExpense)}</td></tr>
      </tfoot>
    </table>
  </article>
}

function BookingModal({ item, step, date, name, email, guests, venue, addons, method, total, intent, error, onClose, onStep, onDate, onName, onEmail, onGuests, onVenue, onAddon, onMethod, onPay, onSimulateFailure }: {
  item: EventPackage
  step: number
  date: string
  name: string
  email: string
  guests: number
  venue: string
  addons: string[]
  method: PaymentMethodId
  total: number
  intent: PaymentIntent | null
  error: string
  onClose: () => void
  onStep: (step: number) => void
  onDate: (value: string) => void
  onName: (value: string) => void
  onEmail: (value: string) => void
  onGuests: (value: number) => void
  onVenue: (value: string) => void
  onAddon: (value: string) => void
  onMethod: (value: PaymentMethodId) => void
  onPay: () => void
  onSimulateFailure: () => void
}) {
  const canContinue = Boolean(date && venue.trim() && name.trim() && email.trim())

  return <Modal onClose={onClose} wide><div className="booking-modal">
    <div className="modal-heading"><div><span className="eyebrow">PEMESANAN ACARA</span><h2>{step === 1 ? 'Ceritakan rencanamu.' : step === 2 ? 'Pilih cara pembayaran.' : 'Selesaikan pembayaran.'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={19} /></button></div>
    <div className="step-indicator"><span className="step-active"><i>1</i> Detail acara</span><span className="step-line" /><span className={step >= 2 ? 'step-active' : ''}><i>2</i> Pembayaran</span></div>
    {step === 1 ? <>
      <div className="booking-package"><span className="booking-thumb" style={{ backgroundImage: `url("${item.image}")` }} /><div><small>{item.category}</small><b>{item.name}</b></div><strong>{rupiah(item.price)}</strong></div>
      <div className="form-grid">
        <label className="form-field"><span>Nama pemesan</span><input required value={name} onChange={event => onName(event.target.value)} placeholder="Nama lengkap" /></label>
        <label className="form-field"><span>Email untuk invoice</span><input required type="email" value={email} onChange={event => onEmail(event.target.value)} placeholder="nama@email.com" /></label>
        <label className="form-field"><span>Tanggal acara</span><input required type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={event => onDate(event.target.value)} /></label>
        <label className="form-field"><span>Perkiraan jumlah tamu</span><input type="number" min="1" max="10000" value={guests} onChange={event => onGuests(Number(event.target.value))} /></label>
        <label className="form-field full"><span>Lokasi atau venue</span><input required value={venue} onChange={event => onVenue(event.target.value)} placeholder="Nama gedung, area, atau kota" /></label>
      </div>
      <div className="addon-list"><div className="addon-title"><b>Tambahkan detail (opsional)</b><small>Pilih yang membuat acaramu lebih lengkap</small></div>{addonOptions.map(addon => <label className="addon-option" key={addon.name}><input type="checkbox" checked={addons.includes(addon.name)} onChange={() => onAddon(addon.name)} /><span className="custom-check"><Check size={12} /></span><span>{addon.name}</span><b>+{rupiah(addon.price)}</b></label>)}</div>
      <div className="modal-bottom"><div><small>Estimasi total</small><b>{rupiah(total)}</b></div><button className="button button-dark" disabled={!canContinue} onClick={() => onStep(2)}>Lanjut ke pembayaran <ArrowRight size={15} /></button></div>
    </> : step === 2 ? <>
      <div className="payment-review"><div><span>Paket</span><b>{item.name}</b></div><div><span>Pemesan</span><b>{name} · {email}</b></div><div><span>Tanggal acara</span><b>{formatDate(date)}</b></div><div><span>Lokasi</span><b>{venue}</b></div><div><span>Jumlah tamu</span><b>{guests} orang</b></div>{addons.map(addon => <div key={addon}><span>{addon}</span><b>{rupiah(addonOptions.find(item => item.name === addon)?.price ?? 0)}</b></div>)}</div>
      <div className="payment-methods"><b>Pilih kanal pembayaran</b>{paymentMethodGroups.map(group => <section className="payment-group" key={group.label}><h3>{group.label}</h3>{group.label === 'QRIS' && <p className="payment-group-note">QR universal untuk GoPay, OVO, DANA, ShopeePay, LinkAja, BCA, Mandiri, BNI, dan aplikasi perbankan pendukung.</p>}<div className="payment-method-grid">{group.methods.map(option => <button type="button" key={option.id} className={`payment-method-option ${method === option.id ? 'chosen' : ''}`} onClick={() => onMethod(option.id)}><span>{option.label}</span>{method === option.id && <CheckCircle2 size={15} />}</button>)}</div></section>)}</div>
      {error && <p className="auth-feedback error" role="alert">{error}</p>}
      <div className="checkout-total"><span>Total pembayaran</span><b>{rupiah(total)}</b></div>
      <div className="modal-bottom"><button className="text-link" onClick={() => onStep(1)}>Kembali ke detail</button><button className="button button-dark" onClick={onPay}>Buat transaksi {rupiah(total)} <ArrowRight size={15} /></button></div>
      <p className="sandbox-note"><ShieldCheck size={14} />Gateway sandbox demo. Tidak ada dana yang ditarik.</p>
    </> : <>
      {intent && <div className="payment-instructions">
        <span className={`status-pill ${intent.status === 'paid' ? 'success' : intent.status === 'failed' ? 'danger' : 'waiting'}`}><i />{intent.status === 'paid' ? 'Lunas' : intent.status === 'failed' ? 'Gagal' : 'Menunggu pembayaran'}</span>
        <h3>{intent.instructions.title}</h3>
        {intent.instructions.type === 'qris' ? <div className="payment-qr"><QRCodeSVG value={intent.instructions.value} size={180} level="M" includeMargin /></div> : <div className="payment-code">{intent.instructions.value}</div>}
        <p>{intent.instructions.provider} · {rupiah(intent.amount)}</p>
        <small>{intent.status === 'pending' ? 'Status diperbarui otomatis dari notifikasi gateway simulasi.' : intent.status === 'paid' ? 'Pembayaran berhasil diterima. Rincian tersimpan di pesananmu.' : 'Transaksi gagal. Tidak ada dana yang ditarik.'}</small>
        {intent.status === 'pending' && <button className="text-link payment-failure-test" onClick={onSimulateFailure}>Simulasikan pembayaran gagal</button>}
        <div className="modal-bottom"><button className="button button-dark" onClick={onClose}>{intent.status === 'pending' ? 'Lanjutkan di pesanan' : 'Lihat pesanan'} <ArrowRight size={15} /></button></div>
      </div>}
      {!intent && <div className="inline-empty">Menyiapkan instruksi pembayaran…</div>}
    </>}
  </div></Modal>
}

function printInvoiceDocument() {
  const cleanup = () => document.body.classList.remove('print-invoice-active')
  document.body.classList.add('print-invoice-active')
  window.addEventListener('afterprint', cleanup, { once: true })
  window.print()
}

function InvoiceModal({ order, onClose }: { order: EventOrder; onClose: () => void }) {
  const packageTotal = order.total - order.addons.reduce((sum, addon) =>
    sum + (addonOptions.find(item => item.name === addon)?.price ?? 0), 0)

  return <Modal onClose={onClose}>
    <div className="invoice-sheet print-area">
      <div className="invoice-top">
        <span className="brand-name">ruang<span>raya</span></span>
        <span className="invoice-label">INVOICE</span>
      </div>
      <div className="invoice-meta">
        <div><small>Nomor invoice</small><b>{order.id}</b></div>
        <div><small>Tanggal terbit</small><b>{formatDate(order.createdAt)}</b></div>
        <div><small>Status pembayaran</small><b className={order.paymentStatus === 'Berhasil' ? 'income-text' : 'expense-text'}>{order.paymentStatus}</b></div>
      </div>
      <div className="invoice-rule" />
      <div className="invoice-recipient">
        <div><small>DITAGIHKAN KEPADA</small><b>{order.client}</b><span>{order.email}</span></div>
        <div><small>ACARA</small><b>{order.packageName}</b><span>{formatDate(order.date)} · {order.venue}</span></div>
      </div>
      <div className="invoice-lines">
        <div className="invoice-line invoice-line-head"><span>DESKRIPSI</span><span>JUMLAH</span></div>
        <div className="invoice-line">
          <span>{order.packageName}<small>{order.category} · {order.guests} tamu</small></span>
          <b>{rupiah(packageTotal)}</b>
        </div>
        {order.addons.map(addon => <div className="invoice-line" key={addon}>
          <span>{addon}</span>
          <b>{rupiah(addonOptions.find(item => item.name === addon)?.price ?? 0)}</b>
        </div>)}
      </div>
      <div className="invoice-total"><span>Total pembayaran</span><b>{rupiah(order.total)}</b></div>
      <div className="invoice-foot"><ShieldCheck size={15} /><span>Terima kasih telah mempercayakan momenmu kepada RuangRaya.<br />Bukti pembayaran digital ini sah tanpa tanda tangan.</span></div>
      <div className="invoice-actions">
        <button className="outline-button" onClick={printInvoiceDocument}><Printer size={15} /> Cetak / simpan PDF</button>
        <button className="button button-dark" onClick={onClose}>Selesai</button>
      </div>
    </div>
  </Modal>
}

function DeleteOrderModal({ order, onCancel, onConfirm }: { order: EventOrder; onCancel: () => void; onConfirm: () => void }) {
  return <Modal onClose={onCancel}><div className="confirm-modal">
    <span className="confirm-icon"><Trash2 size={20} /></span>
    <h2>Hapus pesanan?</h2>
    <p>Apakah Anda yakin ingin menghapus pesanan ini? Catatan pemasukan terkait juga akan dihapus.</p>
    <div className="confirm-order"><b>{order.packageName}</b><span>{order.id} · {order.client}</span></div>
    <div className="confirm-actions"><button className="outline-button" onClick={onCancel}>Batal</button><button className="button button-danger" onClick={onConfirm}><Trash2 size={15} /> Hapus pesanan</button></div>
  </div></Modal>
}

function AuthModal({ role, mode, email, error, success, onRole, onMode, onEmail, onClearMessages, onClose, onLogin, onRegister }: {
  role: Role
  mode: 'login' | 'register'
  email: string
  error: string
  success: string
  onRole: (role: Role) => void
  onMode: (mode: 'login' | 'register') => void
  onEmail: (email: string) => void
  onClearMessages: () => void
  onClose: () => void
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (name: string, email: string, password: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => setPassword(''), [role, mode])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    if (mode === 'register') await onRegister(name.trim(), email.trim(), password)
    else await onLogin(email.trim(), password)
    setSubmitting(false)
  }

  return <Modal onClose={onClose}><form className="auth-modal" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">AKSES RUANGRAYA</span><h2>{mode === 'login' ? 'Senang bertemu lagi.' : 'Buat akun klien.'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={19} /></button></div>
    <p>{role === 'admin' ? 'Masuk dengan akun resmi Pemilik EO untuk membuka dashboard.' : 'Masuk untuk melihat pesanan, atau daftar dahulu jika belum memiliki akun.'}</p>
    <div className="auth-role-select"><button type="button" className={role === 'client' ? 'chosen' : ''} onClick={() => { onRole('client'); onClearMessages() }}><UsersRound size={17} />Klien</button><button type="button" className={role === 'admin' ? 'chosen' : ''} onClick={() => { onRole('admin'); onClearMessages() }}><LayoutDashboard size={17} />Pemilik EO</button></div>
    {role === 'client' && <div className="auth-mode"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { onMode('login'); onClearMessages() }}>Masuk</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { onRole('client'); onMode('register'); onClearMessages() }}>Buat akun klien</button></div>}
    {mode === 'register' && role === 'client' && <label className="form-field"><span>Nama lengkap</span><input name="name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={event => { setName(event.target.value); onClearMessages() }} placeholder="Nama lengkap" /></label>}
    <label className="form-field"><span>Email</span><input name="email" type="email" autoComplete="username" required value={email} onChange={event => { onEmail(event.target.value); onClearMessages() }} placeholder={role === 'admin' ? 'admin@ruangraya.id' : 'nama@email.com'} /></label>
    <label className="form-field"><span>Kata sandi</span><input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} value={password} onChange={event => { setPassword(event.target.value); onClearMessages() }} placeholder={mode === 'register' ? 'Minimal 8 karakter' : 'Masukkan kata sandi'} /></label>
    {role === 'admin' && <small className="auth-hint">Email Pemilik EO: admin@ruangraya.id. Kata sandi demo tampil satu kali di terminal saat server auth pertama dijalankan.</small>}
    {error && <p className="auth-feedback error" role="alert">{error}</p>}
    {success && <p className="auth-feedback success" role="status">{success}</p>}
    <button className="button button-dark auth-submit" type="submit" disabled={submitting}>{submitting ? 'Memeriksa…' : mode === 'register' ? 'Buat akun klien' : role === 'admin' ? 'Masuk sebagai Pemilik EO' : 'Masuk sebagai klien'} <ArrowRight size={15} /></button>
    {mode === 'register' && <small className="sandbox-note">Setelah terdaftar, masuk dengan email dan kata sandi akun ini.</small>}
  </form></Modal>
}

function PackageModal({ draft, onChange, onUpload, onClose, onSubmit }: { draft: PackageDraft; onChange: (draft: PackageDraft) => void; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal onClose={onClose} wide><form className="editor-modal" onSubmit={onSubmit}><div className="modal-heading"><div><span className="eyebrow">KATALOG STUDIO</span><h2>{draft.id ? 'Perbarui paket.' : 'Buat paket baru.'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={19} /></button></div><div className="form-grid"><label className="form-field"><span>Nama paket</span><input required value={draft.name} onChange={event => onChange({ ...draft, name: event.target.value })} placeholder="Contoh: Hari Bahagia" /></label><label className="form-field"><span>Kategori acara</span><select value={draft.category} onChange={event => onChange({ ...draft, category: event.target.value as EventCategory })}>{categories.filter(item => item !== 'Semua').map(item => <option key={item}>{item}</option>)}</select></label><label className="form-field"><span>Harga mulai (IDR)</span><input required type="number" min="0" value={draft.price || ''} onChange={event => onChange({ ...draft, price: Number(event.target.value) })} /></label><label className="form-field"><span>Kapasitas</span><input required value={draft.guests} onChange={event => onChange({ ...draft, guests: event.target.value })} placeholder="hingga 100 tamu" /></label><label className="form-field full"><span>Deskripsi singkat</span><textarea required rows={3} value={draft.description} onChange={event => onChange({ ...draft, description: event.target.value })} /></label><label className="form-field full"><span>Fasilitas (pisahkan dengan koma)</span><input value={draft.features.join(', ')} onChange={event => onChange({ ...draft, features: event.target.value.split(',').map(value => value.trim()).filter(Boolean) })} placeholder="Koordinator acara, dekorasi, dokumentasi" /></label><label className="form-field full"><span>Foto paket</span><input type="file" accept="image/*" onChange={onUpload} /><small>Foto tersimpan di browser untuk kebutuhan demo.</small></label><label className="toggle-field"><input type="checkbox" checked={draft.active} onChange={event => onChange({ ...draft, active: event.target.checked })} /><span>Tampilkan paket di katalog klien</span></label></div><div className="modal-bottom"><button type="button" className="text-link" onClick={onClose}>Batal</button><button className="button button-dark" type="submit">Simpan paket <Check size={15} /></button></div></form></Modal>
}

function ExpenseModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <Modal onClose={onClose}><form className="expense-modal" onSubmit={onSubmit}><div className="modal-heading"><div><span className="eyebrow">PENCATATAN MANUAL</span><h2>Catat pengeluaran.</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={19} /></button></div><label className="form-field"><span>Tanggal transaksi</span><input required type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label><label className="form-field"><span>Keperluan</span><input required name="description" placeholder="Contoh: sewa perlengkapan" /></label><label className="form-field"><span>Nominal (IDR)</span><input required type="number" min="1" name="amount" placeholder="0" /></label><div className="modal-bottom"><button type="button" className="text-link" onClick={onClose}>Batal</button><button className="button button-dark" type="submit">Simpan transaksi <Check size={15} /></button></div></form></Modal>
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className={`modal-dialog ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">{children}</div></div>
}

export default App