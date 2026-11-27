export type EventCategory = 'Wedding' | 'Birthday' | 'Corporate' | 'Gathering'

export type EventPackage = {
  id: string
  name: string
  category: EventCategory
  description: string
  price: number
  guests: string
  image: string
  features: string[]
  active: boolean
}

export type EventOrder = {
  id: string
  client: string
  email: string
  packageId: string
  packageName: string
  category: EventCategory
  date: string
  guests: number
  venue: string
  addons: string[]
  total: number
  status: 'Menunggu pembayaran' | 'Pembayaran diverifikasi' | 'Persiapan' | 'Selesai'
  paymentStatus: 'Menunggu pembayaran' | 'Berhasil' | 'Gagal'
  paymentMethod: string
  createdAt: string
  paymentIntentId?: string
}

export type PaymentIntentStatus = 'pending' | 'paid' | 'failed'

export type PaymentMethodId = 'QRIS' | 'VA_BNI' | 'VA_MANDIRI' | 'VA_DANAMON' | 'VA_PERMATA' | 'VA_CIMB' | 'VA_BSI' | 'VA_MAYBANK' | 'VA_BRI' | 'VA_SINARMAS' | 'STORE_ALFAMART' | 'STORE_ALFAMIDI' | 'STORE_INDOMARET' | 'STORE_LAWSON' | 'STORE_DANDAN'

export type PaymentIntent = {
  id: string
  orderId: string
  status: PaymentIntentStatus
  method: PaymentMethodId
  amount: number
  instructions: {
    type: 'qris' | 'code'
    provider: string
    value: string
    title: string
  }
  expiresAt: string
}

export type FinanceEntry = {
  id: string
  date: string
  description: string
  category: EventCategory | 'Operasional'
  type: 'Pemasukan' | 'Pengeluaran'
  amount: number
  reference?: string
}

export const initialPackages: EventPackage[] = [
  {
    id: 'PKG-001',
    name: 'Hari Bahagia',
    category: 'Wedding',
    description: 'Pernikahan intim yang hangat, tertata, dan tetap terasa personal.',
    price: 28500000,
    guests: 'hingga 200 tamu',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
    features: ['Koordinator acara', 'Dekorasi dan bunga', 'Dokumentasi 6 jam'],
    active: true,
  },
  {
    id: 'PKG-005',
    name: 'Janji Suci',
    category: 'Wedding',
    description: 'Perayaan pernikahan elegan dengan alur acara yang tertata untuk keluarga besar.',
    price: 45000000,
    guests: 'hingga 300 tamu',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85',
    features: ['Wedding planner khusus', 'Dekorasi premium', 'Dokumentasi foto dan video'],
    active: true,
  },
  {
    id: 'PKG-006',
    name: 'Mahligai Cinta',
    category: 'Wedding',
    description: 'Pernikahan intim dengan sentuhan hangat untuk momen keluarga terdekat.',
    price: 15000000,
    guests: 'hingga 100 tamu',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=85',
    features: ['Koordinator hari acara', 'Dekorasi intimate', 'Dokumentasi 4 jam'],
    active: true,
  },
  {
    id: 'PKG-007',
    name: 'Royal Wedding',
    category: 'Wedding',
    description: 'Produksi pernikahan skala besar dengan layanan menyeluruh dan detail eksklusif.',
    price: 75000000,
    guests: 'hingga 500 tamu',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=85',
    features: ['Perencanaan full service', 'Dekorasi grand ballroom', 'Tim produksi dan protokol'],
    active: true,
  },
  {
    id: 'PKG-002',
    name: 'Ruang Ceria',
    category: 'Birthday',
    description: 'Pesta ulang tahun yang ringan, seru, dan mudah dinikmati semua usia.',
    price: 8500000,
    guests: 'hingga 80 tamu',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1000&q=85',
    features: ['Konsep dan dekorasi', 'MC dan permainan', 'Meja kudapan'],
    active: true,
  },
  {
    id: 'PKG-008',
    name: 'Sweet Seventeen Star',
    category: 'Birthday',
    description: 'Pesta tujuh belas tahun dengan panggung, musik, dan suasana penuh energi.',
    price: 12000000,
    guests: 'hingga 150 tamu',
    image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1000&q=85',
    features: ['Konsep dan dekorasi tematik', 'MC dan DJ', 'Panggung serta tata cahaya'],
    active: true,
  },
  {
    id: 'PKG-009',
    name: 'Kids Fantasy',
    category: 'Birthday',
    description: 'Perayaan anak yang ceria dengan aktivitas bermain dan dekorasi penuh warna.',
    price: 6000000,
    guests: 'hingga 50 tamu',
    image: 'https://images.unsplash.com/photo-1533294160622-d6fe9d9fb6b5?auto=format&fit=crop&w=1000&q=85',
    features: ['Dekorasi karakter pilihan', 'Pemandu permainan anak', 'Meja kudapan'],
    active: true,
  },
  {
    id: 'PKG-010',
    name: 'Golden Age Milestone',
    category: 'Birthday',
    description: 'Perayaan ulang tahun keluarga yang berkesan dengan suasana nyaman dan akrab.',
    price: 10500000,
    guests: 'hingga 100 tamu',
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1000&q=85',
    features: ['Dekorasi elegan', 'MC acara keluarga', 'Dokumentasi dan slideshow'],
    active: true,
  },
  {
    id: 'PKG-003',
    name: 'Ruang Berkarya',
    category: 'Corporate',
    description: 'Acara perusahaan yang profesional tanpa kehilangan sisi manusianya.',
    price: 19500000,
    guests: 'hingga 150 peserta',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=85',
    features: ['Rundown dan produksi', 'Audio visual', 'Registrasi peserta'],
    active: true,
  },
  {
    id: 'PKG-011',
    name: 'Annual Summit Pro',
    category: 'Corporate',
    description: 'Konferensi tahunan terstruktur untuk menyatukan pemimpin, tim, dan mitra bisnis.',
    price: 35000000,
    guests: 'hingga 300 peserta',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=85',
    features: ['Manajemen konferensi', 'Panggung dan audio visual', 'Registrasi serta usher'],
    active: true,
  },
  {
    id: 'PKG-012',
    name: 'Product Launching Elite',
    category: 'Corporate',
    description: 'Peluncuran produk dengan pengalaman merek yang konsisten dari panggung hingga tamu.',
    price: 25000000,
    guests: 'hingga 200 peserta',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85',
    features: ['Konsep dan alur peluncuran', 'Panggung serta branding area', 'Dokumentasi acara'],
    active: true,
  },
  {
    id: 'PKG-013',
    name: 'Executive Workshop',
    category: 'Corporate',
    description: 'Lokakarya profesional berukuran ringkas dengan fokus pada diskusi dan kolaborasi.',
    price: 14000000,
    guests: 'hingga 50 peserta',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=85',
    features: ['Koordinasi agenda workshop', 'Tata ruang dan audio visual', 'Registrasi peserta'],
    active: true,
  },
  {
    id: 'PKG-004',
    name: 'Satu Meja',
    category: 'Gathering',
    description: 'Pertemuan akrab untuk tim atau keluarga yang ingin lebih dekat.',
    price: 12500000,
    guests: 'hingga 100 tamu',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=85',
    features: ['Aktivitas kebersamaan', 'Konsumsi prasmanan', 'Dokumentasi acara'],
    active: true,
  },
  {
    id: 'PKG-014',
    name: 'Family Day Out',
    category: 'Gathering',
    description: 'Hari kebersamaan keluarga dengan permainan, santap bersama, dan kegiatan lintas usia.',
    price: 22000000,
    guests: 'hingga 250 tamu',
    image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=85',
    features: ['Aktivitas keluarga terpandu', 'Konsumsi prasmanan', 'Dokumentasi dan area bermain'],
    active: true,
  },
  {
    id: 'PKG-015',
    name: 'Reunion Vibe',
    category: 'Gathering',
    description: 'Temu kangen penuh cerita dengan alur santai dan ruang untuk bernostalgia.',
    price: 16000000,
    guests: 'hingga 120 tamu',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=85',
    features: ['Konsep reuni dan rundown', 'MC serta hiburan musik', 'Sudut foto kenangan'],
    active: true,
  },
  {
    id: 'PKG-016',
    name: 'Community Circle',
    category: 'Gathering',
    description: 'Pertemuan komunitas yang akrab untuk berbagi ide dan mempererat jejaring.',
    price: 9000000,
    guests: 'hingga 75 tamu',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1000&q=85',
    features: ['Tata ruang komunal', 'Koordinasi acara', 'Konsumsi ringan dan audio'],
    active: true,
  },
]

export const initialOrders: EventOrder[] = [
  {
    id: 'RR-2608-014',
    client: 'Nadia Putri',
    email: 'nadia@email.com',
    packageId: 'PKG-001',
    packageName: 'Hari Bahagia',
    category: 'Wedding',
    date: '2026-11-28',
    guests: 180,
    venue: 'Rumah Atsiri, Karanganyar',
    addons: ['Videografer sinematik'],
    total: 34500000,
    status: 'Persiapan',
    paymentStatus: 'Berhasil',
    paymentMethod: 'QRIS',
    createdAt: '2026-08-12',
  },
  {
    id: 'RR-2608-019',
    client: 'Bima Prakoso',
    email: 'bima@email.com',
    packageId: 'PKG-003',
    packageName: 'Ruang Berkarya',
    category: 'Corporate',
    date: '2026-11-20',
    guests: 120,
    venue: 'The Alana Hotel, Solo',
    addons: [],
    total: 19500000,
    status: 'Pembayaran diverifikasi',
    paymentStatus: 'Berhasil',
    paymentMethod: 'Transfer BCA',
    createdAt: '2026-08-18',
  },
]

export const initialFinance: FinanceEntry[] = [
  { id: 'FIN-001', date: '2026-08-12', description: 'Pelunasan Hari Bahagia · Nadia Putri', category: 'Wedding', type: 'Pemasukan', amount: 34500000, reference: 'RR-2608-014' },
  { id: 'FIN-002', date: '2026-08-13', description: 'Bunga dan dekorasi pernikahan', category: 'Operasional', type: 'Pengeluaran', amount: 7800000 },
  { id: 'FIN-003', date: '2026-08-18', description: 'Pelunasan Ruang Berkarya · Bima Prakoso', category: 'Corporate', type: 'Pemasukan', amount: 19500000, reference: 'RR-2608-019' },
  { id: 'FIN-004', date: '2026-08-19', description: 'Sewa perangkat audio', category: 'Operasional', type: 'Pengeluaran', amount: 3250000 },
  { id: 'FIN-005', date: '2026-08-22', description: 'Honor kru lapangan', category: 'Operasional', type: 'Pengeluaran', amount: 1800000 },
]

export const addonOptions = [
  { name: 'Videografer sinematik', price: 6000000 },
  { name: 'Live streaming acara', price: 2500000 },
  { name: 'Meja kudapan tambahan', price: 1800000 },
]

export const paymentMethodGroups: { label: string; methods: { id: PaymentMethodId; label: string }[] }[] = [
  { label: 'QRIS', methods: [{ id: 'QRIS', label: 'QRIS Universal' }] },
  {
    label: 'Virtual Account',
    methods: [
      { id: 'VA_BNI', label: 'BNI VA' },
      { id: 'VA_MANDIRI', label: 'Mandiri VA' },
      { id: 'VA_DANAMON', label: 'Danamon VA' },
      { id: 'VA_PERMATA', label: 'Permata VA' },
      { id: 'VA_CIMB', label: 'CIMB Niaga VA' },
      { id: 'VA_BSI', label: 'BSI VA' },
      { id: 'VA_MAYBANK', label: 'Maybank VA' },
      { id: 'VA_BRI', label: 'BRI VA' },
      { id: 'VA_SINARMAS', label: 'Bank Sinarmas VA' },
    ],
  },
  {
    label: 'Gerai tunai',
    methods: [
      { id: 'STORE_ALFAMART', label: 'Alfamart' },
      { id: 'STORE_ALFAMIDI', label: 'Alfamidi' },
      { id: 'STORE_INDOMARET', label: 'Indomaret' },
      { id: 'STORE_LAWSON', label: 'Lawson' },
      { id: 'STORE_DANDAN', label: 'Dan+Dan' },
    ],
  },
]

export function paymentMethodLabel(id: string) {
  return paymentMethodGroups.flatMap(group => group.methods).find(method => method.id === id)?.label ?? id
}

export const rupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T00:00:00`))