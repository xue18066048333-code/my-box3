CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  published_at timestamptz
);

CREATE TABLE service_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('zh', 'en', 'th', 'sw')),
  name text NOT NULL,
  description text NOT NULL,
  published_at timestamptz,
  UNIQUE (service_id, locale)
);

CREATE TABLE packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  country_code text NOT NULL CHECK (country_code IN ('TZ', 'TH')),
  slug text NOT NULL,
  published_at timestamptz,
  UNIQUE (service_id, country_code, slug)
);

CREATE TABLE package_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  code text NOT NULL,
  requires_review boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  UNIQUE (package_id, code)
);

CREATE TABLE price_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_option_id uuid NOT NULL REFERENCES package_options(id) ON DELETE CASCADE,
  currency_code char(3) NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  published_at timestamptz,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE TABLE regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  country_code text NOT NULL CHECK (country_code IN ('TZ', 'TH')),
  code text NOT NULL,
  name text NOT NULL,
  published_at timestamptz,
  UNIQUE (package_id, code)
);

CREATE INDEX packages_service_country_published_idx
  ON packages (service_id, country_code)
  WHERE published_at IS NOT NULL;
CREATE INDEX service_translations_service_locale_published_idx
  ON service_translations (service_id, locale)
  WHERE published_at IS NOT NULL;
CREATE INDEX price_versions_option_effective_idx
  ON price_versions (package_option_id, effective_from DESC)
  WHERE published_at IS NOT NULL;

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY services_public_read ON services FOR SELECT USING (published_at IS NOT NULL);
CREATE POLICY service_translations_public_read ON service_translations FOR SELECT USING (
  published_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM services
    WHERE services.id = service_translations.service_id
      AND services.published_at IS NOT NULL
  )
);
CREATE POLICY packages_public_read ON packages FOR SELECT USING (
  published_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM services
    WHERE services.id = packages.service_id
      AND services.published_at IS NOT NULL
  )
);
CREATE POLICY package_options_public_read ON package_options FOR SELECT USING (
  published_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM packages
    INNER JOIN services ON services.id = packages.service_id
    WHERE packages.id = package_options.package_id
      AND packages.published_at IS NOT NULL
      AND services.published_at IS NOT NULL
  )
);
CREATE POLICY price_versions_public_read ON price_versions FOR SELECT USING (
  published_at IS NOT NULL
  AND effective_from <= CURRENT_TIMESTAMP
  AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
  AND EXISTS (
    SELECT 1 FROM package_options
    INNER JOIN packages ON packages.id = package_options.package_id
    INNER JOIN services ON services.id = packages.service_id
    WHERE package_options.id = price_versions.package_option_id
      AND package_options.published_at IS NOT NULL
      AND packages.published_at IS NOT NULL
      AND services.published_at IS NOT NULL
  )
);
CREATE POLICY regions_public_read ON regions FOR SELECT USING (
  published_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM packages
    INNER JOIN services ON services.id = packages.service_id
    WHERE packages.id = regions.package_id
      AND packages.published_at IS NOT NULL
      AND services.published_at IS NOT NULL
  )
);

REVOKE ALL ON TABLE services, service_translations, packages, package_options, price_versions, regions FROM anon, authenticated;
GRANT SELECT ON TABLE services, service_translations, packages, package_options, price_versions, regions TO anon, authenticated;
