CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'admin')),
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Wedding', 'Birthday', 'Corporate', 'Gathering')),
  description TEXT NOT NULL,
  price BIGINT NOT NULL CHECK (price >= 0),
  guest_capacity TEXT NOT NULL,
  image_url TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES users(id),
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Wedding', 'Birthday', 'Corporate', 'Gathering')),
  event_date DATE NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  venue TEXT NOT NULL,
  addons JSONB NOT NULL DEFAULT '[]'::jsonb,
  agreed_amount BIGINT NOT NULL CHECK (agreed_amount >= 0),
  status TEXT NOT NULL DEFAULT 'Menunggu pembayaran'
    CHECK (status IN ('Menunggu pembayaran', 'Pembayaran diverifikasi', 'Persiapan', 'Selesai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'manual',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('QRIS', 'Transfer Bank', 'E-Wallet')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  provider_transaction_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  transaction_id UUID UNIQUE REFERENCES transactions(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('Wedding', 'Birthday', 'Corporate', 'Gathering', 'Operasional')),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('Pemasukan', 'Pengeluaran')),
  description TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by UUID NOT NULL REFERENCES users(id),
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  category TEXT CHECK (category IN ('Wedding', 'Birthday', 'Corporate', 'Gathering', 'Operasional')),
  total_income BIGINT NOT NULL DEFAULT 0,
  total_expense BIGINT NOT NULL DEFAULT 0,
  export_format TEXT NOT NULL CHECK (export_format IN ('PDF', 'CSV')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (date_to >= date_from)
);

CREATE INDEX events_client_date_idx ON events (client_id, event_date DESC);
CREATE INDEX events_status_idx ON events (status);
CREATE INDEX transactions_status_created_idx ON transactions (status, created_at DESC);
CREATE INDEX financial_records_date_category_idx ON financial_records (occurred_at, category);

CREATE FUNCTION record_paid_transaction() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    INSERT INTO financial_records (event_id, transaction_id, category, entry_type, description, amount, occurred_at)
    SELECT e.id, NEW.id, e.category, 'Pemasukan',
           'Pembayaran ' || e.package_name || ' · ' || u.full_name,
           NEW.amount, COALESCE(NEW.paid_at::date, CURRENT_DATE)
      FROM events e
      JOIN users u ON u.id = e.client_id
     WHERE e.id = NEW.event_id
    ON CONFLICT (transaction_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_record_income
AFTER INSERT OR UPDATE OF status ON transactions
FOR EACH ROW EXECUTE FUNCTION record_paid_transaction();