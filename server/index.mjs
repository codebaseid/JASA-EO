import express from 'express'
import session from 'express-session'
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'

const app = express()
const port = Number(process.env.AUTH_PORT ?? 3001)
const userFile = resolve('data/auth-users.json')
const scrypt = promisify(scryptCallback)
const cookieName = 'ruangraya.sid'
const paymentIntents = new Map()
const paymentMethods = new Set([
  'QRIS', 'VA_BNI', 'VA_MANDIRI', 'VA_DANAMON', 'VA_PERMATA', 'VA_CIMB',
  'VA_BSI', 'VA_MAYBANK', 'VA_BRI', 'VA_SINARMAS', 'STORE_ALFAMART',
  'STORE_ALFAMIDI', 'STORE_INDOMARET', 'STORE_LAWSON', 'STORE_DANDAN',
])

app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))
app.use(session({
  name: cookieName,
  secret: process.env.SESSION_SECRET ?? randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
  },
}))

let users = []

async function persistUsers() {
  await mkdir(dirname(userFile), { recursive: true })
  await writeFile(userFile, JSON.stringify(users, null, 2), { mode: 0o600 })
}

async function hashPassword(password, salt = randomBytes(16)) {
  const hash = await scrypt(password, salt, 64)
  return `${salt.toString('hex')}:${Buffer.from(hash).toString('hex')}`
}

async function verifyPassword(password, storedHash) {
  const [saltHex, hashHex] = storedHash.split(':')
  if (!saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = Buffer.from(await hashPassword(password, Buffer.from(saltHex, 'hex')).then(value => value.split(':')[1]), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: 'Silakan masuk terlebih dahulu.' })
    if (req.session.user.role !== role) return res.status(403).json({ error: 'Anda tidak memiliki akses ke halaman ini.' })
    next()
  }
}

function publicPaymentIntent(intent) {
  return {
    id: intent.id,
    orderId: intent.orderId,
    status: intent.status,
    method: intent.method,
    amount: intent.amount,
    instructions: intent.instructions,
    expiresAt: intent.expiresAt,
  }
}

function findPaymentByOrderId(orderId) {
  return [...paymentIntents.values()].find(intent => intent.orderId === orderId)
}

function applyGatewayNotification(notification) {
  const intent = findPaymentByOrderId(notification.order_id ?? notification.external_id)
  if (!intent || intent.status !== 'pending') return null

  const gatewayStatus = String(notification.transaction_status ?? notification.status ?? 'pending').toLowerCase()
  if (['settlement', 'capture', 'paid', 'success'].includes(gatewayStatus)) intent.status = 'paid'
  else if (['deny', 'cancel', 'expire', 'expired', 'failed'].includes(gatewayStatus)) intent.status = 'failed'
  else intent.status = 'pending'

  if (intent.status !== 'pending' && intent.timer) clearTimeout(intent.timer)
  return intent
}

function sameSecret(actual, expected) {
  if (!actual || !expected) return false
  const actualBytes = Buffer.from(actual)
  const expectedBytes = Buffer.from(expected)
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
}

await mkdir(dirname(userFile), { recursive: true })
try {
  users = JSON.parse(await readFile(userFile, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  users = []
}

const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@ruangraya.id').trim().toLowerCase()
if (!users.some(user => user.email === adminEmail && user.role === 'admin')) {
  const adminPassword = process.env.ADMIN_PASSWORD ?? randomBytes(18).toString('base64url')
  users.push({
    id: randomBytes(16).toString('hex'),
    name: 'Pemilik RuangRaya',
    email: adminEmail,
    role: 'admin',
    passwordHash: await hashPassword(adminPassword),
  })
  await persistUsers()
  console.log(`Akun Pemilik EO demo: ${adminEmail}`)
  if (!process.env.ADMIN_PASSWORD) console.log(`Kata sandi demo sekali tampil: ${adminPassword}`)
}

app.get('/api/auth/session', (req, res) => {
  if (!req.session.user) return res.json({ user: null })
  const user = users.find(item => item.id === req.session.user.id)
  if (!user) {
    req.session.destroy(() => {})
    return res.json({ user: null })
  }
  return res.json({ user: publicUser(user) })
})

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body.password === 'string' ? req.body.password : ''

    if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Nama harus terdiri dari 2 sampai 100 karakter.' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Masukkan alamat email yang valid.' })
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Kata sandi harus terdiri dari 8 sampai 128 karakter.' })
    if (users.some(user => user.email === email)) return res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk.' })

    const user = {
      id: randomBytes(16).toString('hex'),
      name,
      email,
      role: 'client',
      passwordHash: await hashPassword(password),
    }
    users.push(user)
    await persistUsers()
    return res.status(201).json({ user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    const expectedRole = req.body.role === 'admin' ? 'admin' : 'client'
    const user = users.find(item => item.email === email)

    if (!user || user.role !== expectedRole || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email, kata sandi, atau jenis akun tidak sesuai.' })
    }

    await new Promise((resolvePromise, rejectPromise) => {
      req.session.regenerate(error => error ? rejectPromise(error) : resolvePromise())
    })
    req.session.user = { id: user.id, role: user.role }
    return res.json({ user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(error => {
    if (error) return res.status(500).json({ error: 'Sesi tidak dapat ditutup.' })
    res.clearCookie(cookieName, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
    return res.status(204).end()
  })
})

app.use('/api/admin', requireRole('admin'))
app.use('/api/client', requireRole('client'))

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Terjadi gangguan pada layanan autentikasi.' })
})

app.listen(port, '127.0.0.1', () => {
  console.log(`Layanan autentikasi aktif di http://127.0.0.1:${port}`)
})

app.post('/api/client/payments', requireRole('client'), (req, res) => {
  const orderId = typeof req.body.orderId === 'string' ? req.body.orderId.trim() : ''
  const method = typeof req.body.method === 'string' ? req.body.method : ''
  const amount = Number(req.body.amount)
  if (!orderId || !paymentMethods.has(method) || !Number.isSafeInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Detail transaksi atau metode pembayaran tidak valid.' })
  }

  const existing = findPaymentByOrderId(orderId)
  if (existing) return res.status(409).json({ error: 'Transaksi untuk pesanan ini sudah dibuat.' })

  const id = `PAY-${randomBytes(8).toString('hex').toUpperCase()}`
  const isQris = method === 'QRIS'
  const isVirtualAccount = method.startsWith('VA_')
  const providerName = method.replace(/^(VA_|STORE_)/, '').replaceAll('_', ' ')
  const instructions = isQris
    ? { type: 'qris', provider: 'QRIS Universal', value: `RUANGRAYA-SANDBOX|${orderId}|${amount}|${id}`, title: 'QR demo, bukan kode pembayaran aktif' }
    : isVirtualAccount
      ? { type: 'code', provider: providerName, value: `88088${randomBytes(5).readUIntBE(0, 5)}`.slice(0, 16), title: `Nomor Virtual Account demo ${providerName}` }
      : { type: 'code', provider: providerName, value: `RR${randomBytes(6).toString('hex').toUpperCase()}`, title: `Kode pembayaran demo ${providerName}` }

  const intent = {
    id,
    orderId,
    clientId: req.session.user.id,
    method,
    amount,
    status: 'pending',
    instructions,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  }
  intent.timer = setTimeout(() => {
    applyGatewayNotification({
      order_id: orderId,
      transaction_id: id,
      transaction_status: 'settlement',
      status_code: '200',
      gross_amount: String(amount),
    })
  }, 4000)
  intent.timer.unref?.()
  paymentIntents.set(id, intent)
  return res.status(201).json({ intent: publicPaymentIntent(intent), gateway: 'midtrans-sandbox-simulator' })
})

app.get('/api/client/payments/:paymentId', requireRole('client'), (req, res) => {
  const intent = paymentIntents.get(req.params.paymentId)
  if (!intent || intent.clientId !== req.session.user.id) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' })
  return res.json({ intent: publicPaymentIntent(intent) })
})

app.post('/api/client/payments/:paymentId/simulate-failure', requireRole('client'), (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Rute demo tidak tersedia.' })
  const intent = paymentIntents.get(req.params.paymentId)
  if (!intent || intent.clientId !== req.session.user.id) return res.status(404).json({ error: 'Transaksi tidak ditemukan.' })
  applyGatewayNotification({ order_id: intent.orderId, transaction_status: 'deny' })
  return res.json({ intent: publicPaymentIntent(intent) })
})

app.post('/api/admin/payments/:orderId/cancel', requireRole('admin'), (req, res) => {
  const intent = findPaymentByOrderId(req.params.orderId)
  if (intent?.timer) clearTimeout(intent.timer)
  if (intent) paymentIntents.delete(intent.id)
  return res.status(204).end()
})

app.post('/api/payments/webhooks/:provider', (req, res) => {
  const { provider } = req.params
  if (provider === 'midtrans') {
    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) return res.status(503).json({ error: 'MIDTRANS_SERVER_KEY belum dikonfigurasi.' })
    const signature = createHash('sha512')
      .update(`${req.body.order_id}${req.body.status_code}${req.body.gross_amount}${serverKey}`)
      .digest('hex')
    if (!sameSecret(req.body.signature_key, signature)) return res.status(401).json({ error: 'Signature Midtrans tidak valid.' })
  } else if (provider === 'xendit') {
    if (!sameSecret(req.get('x-callback-token'), process.env.XENDIT_CALLBACK_TOKEN)) {
      return res.status(401).json({ error: 'Token callback Xendit tidak valid.' })
    }
  } else {
    return res.status(404).json({ error: 'Provider pembayaran tidak dikenal.' })
  }

  const intent = applyGatewayNotification(req.body)
  if (!intent) return res.status(404).json({ error: 'Order transaksi tidak ditemukan atau sudah final.' })
  return res.status(200).json({ received: true, status: intent.status })
})