import { SUPPORTED_COUNTRIES } from '@/config/product';

const services = [
  'Airport transfer',
  'Business escort',
  'Travel escort',
  'Site guarding',
  'Event security',
  'Armed transport',
  'Long-term guarding',
  'Risk assessment',
  'Security training',
];

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero" aria-labelledby="home-heading">
        <p className="eyebrow">OVERSEAS SECURITY BOOKING</p>
        <h1 id="home-heading">Security that moves with you.</h1>
        <p className="hero-copy">
          Start with your destination. Our local teams will confirm the right coverage for your journey,
          location, or event.
        </p>
        <a className="service-link" href="/en?country=TZ">Browse services and estimates →</a>
        <label className="country-select" htmlFor="country">
          <span>Service country</span>
          <select id="country" name="country" defaultValue="">
            <option value="" disabled>
              Choose your service country
            </option>
            {SUPPORTED_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="services" aria-labelledby="services-heading">
        <div className="section-heading">
          <p className="eyebrow">SERVICE CATALOG</p>
          <h2 id="services-heading">Select the protection you need</h2>
        </div>
        <div className="service-grid">
          {services.map((service, index) => (
            <article className="service-card" key={service}>
              <span className="service-number">{String(index + 1).padStart(2, '0')}</span>
              <h3>{service}</h3>
              <p>Details and tailored options will be available in the next step.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
