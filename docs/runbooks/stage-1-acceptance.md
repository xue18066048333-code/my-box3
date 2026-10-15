# Stage 1 acceptance runbook

Run the single fail-fast gate from the repository root with Node 24 and npm available. The Playwright browser cache stays inside the repository so it can be removed safely after a local run.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = '.playwright-browsers'
$env:CATALOG_DATA_MODE = 'demo'
npm run test:stage1
```

`test:stage1` runs database reset, database tests, typecheck, unit tests, the production build, and the full Playwright matrix in order. It stops at the first nonzero step, starts one hidden demo Next server, waits for `127.0.0.1:3000`, runs Playwright with `STAGE1_GATE=1` so Playwright reuses that server, sends a termination request only to the server process it created, verifies that the process stopped and the port closed, then exits 0. A failed step, readiness timeout, server stop timeout, or open port exits nonzero. Set `STAGE1_PORT` to use another local port; the gate and Playwright configuration derive their server URL from that value.

The gate script supplies `CATALOG_DATA_MODE=demo` and defaults `PLAYWRIGHT_BROWSERS_PATH` to `.playwright-browsers`. It inherits the Node/npm environment, so the Node directory containing `npm.cmd` must be on `PATH` when using the managed runtime.

`CATALOG_DATA_MODE=demo` is for non-production acceptance only. It supplies the local catalog and process-local demo booking adapter. `NODE_ENV=production` always disables demo data, even if `CATALOG_DATA_MODE=demo` is supplied: without configured catalog and persistence adapters, catalog requests return no services and bookings return unavailable. The demo booking store is memory-only and disappears when the local server stops; it must never be used as a production persistence mechanism.

## Synthetic acceptance data

Use only the contacts in `tests/e2e/mobile-acceptance.spec.ts`:

| Journey | Contact | Expected result |
| --- | --- | --- |
| Tanzania airport transfer | `Synthetic Airport Tanzania`, `+255700000001` | TZS priced booking; awaiting deposit |
| Thailand business escort | `Synthetic Business Thailand`, `business.th@example.test` | THB priced booking; awaiting deposit |
| Tanzania travel escort | `Synthetic Travel Tanzania`, `+255700000002` | TZS priced booking; awaiting deposit |
| Thailand site guarding | `Synthetic Site Thailand`, `site.th@example.test` | assessment requested; no total or deposit |
| Thailand risk assessment | `Synthetic Custom Contact`, `custom.th@example.test` | assessment requested; no total or deposit |
| Tanzania armed transport | `Synthetic Armed Contact`, `+255700000004` | assessment requested; no payable total or deposit |

All names, telephone numbers, and email addresses are synthetic. Do not enter customer contact information into a demo run.

## Routes and expected results

| Route | Expected result |
| --- | --- |
| `/en/services/airport-transfer?country=TZ` | Itemized TZS estimate and a payable demo booking after a phone-only contact. |
| `/en/services/business-escort?country=TH` | Itemized THB estimate and a payable demo booking after an email-only contact. |
| `/en/services/travel-escort?country=TZ` | Itemized TZS estimate and a payable demo booking. |
| `/en/services/site-guarding?country=TH` | Fixed-site guarding assessment-only submission; no displayed or persisted fabricated total or deposit. |
| `/en/services/risk-assessment?country=TH` | Assessment-only submission; no displayed or persisted fabricated zero total. Locale navigation to `/zh/services/risk-assessment?country=TH` keeps the country and service. |
| `/en/services/armed-transport?country=TZ` | Review/assessment-only submission; a deposit is never offered. |

The mobile acceptance test uses a 320 by 800 viewport and verifies that the document has no horizontal overflow and the booking submit action can be reached and activated. The Playwright configuration also runs a Chromium desktop project.

## Evidence

`tests/e2e/mobile-acceptance.spec.ts` writes these ignored local screenshots to `test-results/` for each `desktop` and `mobile` project:

| Screenshot name | What it proves |
| --- | --- |
| `stage-1-mobile-320-confirmation-<project>.png` | A 320px Tanzania priced journey can reach submission without horizontal overflow. |
| `stage-1-standard-airport-transfer-TZ-<project>.png` | Tanzania standard booking confirms with TZS. |
| `stage-1-standard-business-escort-TH-<project>.png` | Thailand standard booking confirms with THB. |
| `stage-1-standard-travel-escort-TZ-<project>.png` | Tanzania travel escort confirms as a priced booking. |
| `stage-1-site-guarding-assessment-th-<project>.png` | Thailand fixed-site guarding remains assessment-only with no fabricated total or deposit. |
| `stage-1-risk-assessment-assessment-th-<project>.png` | Custom-service assessment has no fabricated total. |
| `stage-1-armed-assessment-tz-<project>.png` | Armed transport remains assessment-only without a payable deposit. |

For a focused rerun, use:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = '.playwright-browsers'
$env:CATALOG_DATA_MODE = 'demo'
npm run dev -- --port 3000
# In a second terminal:
npm run test:e2e -- tests/e2e/mobile-acceptance.spec.ts
```

Stop the manually started focused-test server with `Ctrl+C` after the run. The focused command remains available for debugging; use `npm run test:stage1` for the complete operator gate and its controlled server lifecycle.

## Cleanup

Stop a locally started Next server with `Ctrl+C`. The demo store has no disk file; stopping that server clears it. After preserving any screenshots needed for review outside ignored test output, remove only generated artifacts with:

```powershell
@('.next', 'playwright-report', 'test-results', '.playwright-browsers') |
  Where-Object { Test-Path $_ } |
  ForEach-Object { Remove-Item -Recurse -Force $_ }
```

Do not use this cleanup command on source directories, committed evidence, or database migrations. Production catalog and persistence adapters remain unconfigured until a later deployment task.
