# Stage 1 final-fix report

## Changes

- Classified fixed site guarding (`site-guarding`) as assessment-only with the other services that cannot use the standard short-service price engine. It now has no demo hourly price, never creates an automatic total or deposit, and creates an assessment request on submission. The existing `long-term-guarding` classification remains unchanged.
- Updated the product requirements to define fixed site guarding as a site-based, role/shift/month service and to record the Phase 1 limitation: the monthly site-guarding model is not implemented, so the customer flow is “quote after assessment” and submit requirements.
- Updated the English service description, Playwright acceptance matrix, and operator runbook. The priced standard-service matrix now contains only airport transfer, business escort, and travel escort; site guarding is verified as an assessment flow on desktop and mobile.
- Upgraded `next` exactly from 16.0.7 to 16.4.1 in both `package.json` and `package-lock.json`. React and React DOM remain at 19.2.0 because Next 16.4.1 accepts React 19 without a compatibility upgrade.
- Added `127.0.0.1` to `allowedDevOrigins` so the existing Stage 1 Playwright gate can load Next 16.4.1 development resources through its loopback base URL. Without it, Next blocks the client bundle and the interactive controls remain disabled.

## Verification

- Regression red/green: new catalog and booking tests first failed while site guarding was incorrectly priced, then passed after the assessment classification change.
- `npm test`: 7 files, 60 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with Next.js 16.4.1.
- Focused `tests/e2e/mobile-acceptance.spec.ts`: 10 desktop/mobile tests passed.
- `npm run test:stage1`: passed; database reset/tests, typecheck, unit tests, build, and 32 Playwright tests completed successfully. The gate stopped its demo server and verified port 3000 closed.

## Remaining limitations

- Phase 1 deliberately has no customer-facing monthly site-guarding calculator, staffed role/shift optimizer, automatic site-guarding price, or automatic deposit. A local team must assess the submitted request before providing a quote.
- Production catalog and booking persistence adapters remain outside the current Stage 1 scope; the verified booking flow uses the existing non-production demo adapter.
