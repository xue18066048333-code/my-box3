import { notFound } from 'next/navigation';
import { loadCatalog, loadQuoteRates } from '@/features/catalog/data';
import { copy, isLocale, isServiceSlug, requiresAssessment } from '@/features/catalog/content';
import { CatalogNavigation } from '@/features/catalog/components/catalog-navigation';
import { ServiceFacts } from '@/features/catalog/components/service-card';
import { QuoteConfigurator } from '@/features/quote/components/quote-configurator';

export const dynamic = 'force-dynamic';

export default async function ServicePage({params, searchParams}: {params: Promise<{locale:string; slug:string}>; searchParams: Promise<{country?:string}>}) {
  const {locale, slug} = await params;
  if (!isLocale(locale) || !isServiceSlug(slug)) notFound();
  const {country: requested} = await searchParams;
  if (requested && requested !== 'TZ' && requested !== 'TH') notFound();
  const country = requested === 'TH' ? 'TH' : 'TZ';
  const {services, demo} = await loadCatalog(country, locale);
  const service = services.find(item => item.slug === slug);
  const t = copy[locale];
  // A known slug alone is never enough to expose an unpublished service or its rates.
  if (!service) return <main id="main-content" lang={locale}><CatalogNavigation country={country} locale={locale} slug={slug} /><p className="empty-state" role="status">{t.unavailable}</p><a className="service-link" href={`/${locale}?country=${country}`}>{t.back}</a></main>;
  const rates = await loadQuoteRates();
  const assessment = requiresAssessment(slug) || !service.activePrice;
  return <main id="main-content" lang={locale}>
    <CatalogNavigation country={country} locale={locale} slug={slug} />
    <a className="back-link" href={`/${locale}?country=${country}`}>← {t.back}</a>
    {demo && <aside className="demo-banner"><strong>{t.demo}</strong><p>{t.demoNote}</p></aside>}
    <section className="detail-intro"><p className="eyebrow">{country} · {slug === 'armed-transport' ? t.review : assessment ? t.assessment : t.standard}</p><h1>{service.name}</h1><p className="hero-copy">{service.description}</p></section>
    <QuoteConfigurator key={`${country}-${slug}`} serviceSlug={slug} country={country} locale={locale} rates={rates} custom={assessment} armedService={slug === 'armed-transport'} demo={demo} />
    <section className="detail-scope" aria-labelledby="scope-heading"><h2 id="scope-heading">{t.scope}</h2><ServiceFacts slug={slug} locale={locale} country={country} /></section>
  </main>;
}
