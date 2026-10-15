import { notFound } from 'next/navigation';
import { loadCatalog } from '@/features/catalog/data';
import { copy, isLocale } from '@/features/catalog/content';
import { CatalogNavigation } from '@/features/catalog/components/catalog-navigation';
import { ServiceCard } from '@/features/catalog/components/service-card';

export const dynamic = 'force-dynamic';

export default async function CatalogPage({params, searchParams}: {params: Promise<{locale:string}>; searchParams: Promise<{country?:string}>}) {
  const {locale} = await params;
  if (!isLocale(locale)) notFound();
  const {country: requested} = await searchParams;
  if (requested && requested !== 'TZ' && requested !== 'TH') notFound();
  const country = requested === 'TH' ? 'TH' : 'TZ';
  const {services, demo} = await loadCatalog(country, locale);
  const t = copy[locale];
  return <main id="main-content" lang={locale}>
    <CatalogNavigation locale={locale} country={country} />
    {demo && <aside className="demo-banner"><strong>{t.demo}</strong><p>{t.demoNote}</p></aside>}
    <section className="hero catalog-hero"><p className="eyebrow">{t.catalog} · {country}</p><h1>{t.heading}</h1><p className="hero-copy">{t.intro}</p></section>
    <section className="services" aria-label={t.catalog}>
      {services.length ? <div className="service-grid">{services.map(service => <ServiceCard key={service.id} service={service} locale={locale} />)}</div> : <p className="empty-state" role="status">{t.unavailable}</p>}
    </section>
  </main>;
}
