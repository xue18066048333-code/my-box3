CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference text NOT NULL UNIQUE DEFAULT ('BK-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  service_slug text NOT NULL,
  country text NOT NULL CHECK (country IN ('TZ','TH')),
  status text NOT NULL CHECK (status IN ('awaiting_deposit','assessment_requested')),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  total_minor bigint,
  deposit_minor bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (public_reference ~ '^BK-[A-F0-9]{32}$'),
  CHECK ((status = 'assessment_requested' AND total_minor IS NULL AND deposit_minor = 0)
    OR (status = 'awaiting_deposit' AND total_minor IS NOT NULL AND total_minor > 0
      AND deposit_minor >= 0 AND deposit_minor <= total_minor))
);

CREATE TABLE order_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  phone text CHECK (phone IS NULL OR length(btrim(phone)) BETWEEN 1 AND 80),
  email text CHECK (email IS NULL OR length(btrim(email)) BETWEEN 3 AND 254),
  wechat text CHECK (wechat IS NULL OR length(btrim(wechat)) BETWEEN 1 AND 100),
  whatsapp text CHECK (whatsapp IS NULL OR length(btrim(whatsapp)) BETWEEN 1 AND 80),
  CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE TABLE order_quote_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  event_type text NOT NULL CHECK (event_type = 'booking_created'),
  status text NOT NULL CHECK (status IN ('awaiting_deposit','assessment_requested')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE FUNCTION prevent_quote_snapshot_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Quote snapshots are immutable';
END;
$$;
CREATE TRIGGER immutable_quote_snapshot BEFORE UPDATE OR DELETE ON order_quote_snapshots
FOR EACH ROW EXECUTE FUNCTION prevent_quote_snapshot_change();

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
ALTER TABLE order_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE order_quote_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_quote_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON orders, order_contacts, order_quote_snapshots, order_events FROM PUBLIC, anon, authenticated;
-- No client policies: creation is only through a trusted server transaction with BYPASSRLS.
-- Public references are display-only identifiers; there is intentionally no public lookup policy.
