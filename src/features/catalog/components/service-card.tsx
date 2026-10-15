import type { CountryCode, Locale, ServiceSummary } from '../types';
import { copy, isServiceSlug, requiresAssessment, serviceContent } from '../content';

export function ServiceFacts({slug, locale, country}: {slug: string; locale: Locale; country: CountryCode}) {
  const t = copy[locale];
  if (!isServiceSlug(slug)) return null;
  const content = serviceContent(slug, locale);
  return <dl className="service-facts">
    <div><dt>{t.use}</dt><dd>{content.use}</dd></div>
    <div><dt>{t.included}</dt><dd>{t.includes}</dd></div>
    <div><dt>{t.excluded}</dt><dd>{t.excludes}</dd></div>
    <div><dt>{t.notice}</dt><dd>{t.noticeText}</dd></div>
    <div><dt>{t.region}</dt><dd>{country === 'TZ' ? t.tz : t.th}</dd></div>
  </dl>;
}

export function ServiceCard({service, locale}: {service: ServiceSummary; locale: Locale}) {
  const t = copy[locale];
  const assessment = requiresAssessment(service.slug) || !service.activePrice;
  return <article className="service-card catalog-card">
    <span className={`service-status ${assessment ? 'assessment' : ''}`}>{service.slug === 'armed-transport' ? t.review : assessment ? t.assessment : t.standard}</span>
    <h3>{service.name}</h3>
    <p><strong>{t.scope}: </strong>{service.description}</p>
    <ServiceFacts slug={service.slug} locale={locale} country={service.country} />
    <a className="service-link" href={`/${locale}/services/${service.slug}?country=${service.country}`}>{t.details}<span aria-hidden="true"> ↗</span><span className="sr-only">: {service.name}</span></a>
  </article>;
}
