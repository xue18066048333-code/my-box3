import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PRODUCT_NAME } from '@/config/product';
import Home from '@/app/page';

describe('product shell', () => {
  it('exposes the product shell', () => {
    expect(PRODUCT_NAME).toBe('境安');
  });

  it('renders a country selector and nine service placeholders', () => {
    const markup = renderToStaticMarkup(Home());

    expect(markup).toContain('Service country');
    expect((markup.match(/<article/g) ?? [])).toHaveLength(9);
  });
});
