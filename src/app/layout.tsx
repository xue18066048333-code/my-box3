import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { PRODUCT_NAME } from '@/config/product';

import './globals.css';

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} | Borderless Security`,
  description: 'Professional overseas security booking services.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <a className="brand" href="#main-content" aria-label={`${PRODUCT_NAME} home`}>
            <span aria-hidden="true">◈</span>
            {PRODUCT_NAME}
          </a>
          <p>Borderless Security</p>
        </header>
        {children}
        <footer className="site-footer">
          <p>Verified teams. Clear service scope. Human review when required.</p>
          <p>© {PRODUCT_NAME}</p>
        </footer>
      </body>
    </html>
  );
}
