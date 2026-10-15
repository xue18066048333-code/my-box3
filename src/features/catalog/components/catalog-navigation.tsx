import type { CountryCode, Locale } from '../types';
import { copy } from '../content';

export function CatalogNavigation({country, locale, slug}: {country: CountryCode; locale: Locale; slug?: string}) {
  const t = copy[locale];
  const path = slug ? `/services/${slug}` : '';
  return <div className="catalog-navigation">
    <form action={`/${locale}${path}`} className="country-form">
      <label htmlFor="service-country">{t.country}</label>
      <div className="country-controls"><select name="country" id="service-country" defaultValue={country}>
        <option value="TZ">Tanzania · TZ</option><option value="TH">Thailand · TH</option>
      </select><button type="submit">{t.apply}</button></div>
    </form>
    <nav aria-label="Language" className="locale-nav">
      {([['zh','中文'],['en','English'],['th','ไทย'],['sw','Kiswahili']] as const).map(([code,label]) => <a key={code} href={`/${code}${path}?country=${country}`} hrefLang={code} lang={code} aria-current={code === locale ? 'page' : undefined}>{label}</a>)}
    </nav>
  </div>;
}
