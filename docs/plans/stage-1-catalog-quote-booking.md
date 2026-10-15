# 服务展示、报价与预约 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建成可在手机上浏览九类服务、调整标准套餐、查看费用明细并提交预约的第一条可用客户链路。

**Architecture:** 使用Next.js App Router提供服务端页面和服务端操作；核心报价逻辑保持为无数据库依赖的纯TypeScript模块。Supabase PostgreSQL保存服务、翻译、套餐、价格版本和预约，RLS默认拒绝客户端直写，公开读取仅开放已发布内容。

**Tech Stack:** Node.js 24 LTS、Next.js 16、React 19、TypeScript 5.1+、Tailwind CSS、Supabase PostgreSQL、Zod、Vitest、Testing Library、Playwright。

**Spec:** `outputs/海外安保预约平台产品需求规格书-v1.md`

## Global Constraints

- 第一阶段为移动网页，最小宽度320像素；支持Chrome 111+、Edge 111+、Firefox 111+、Safari 16.4+。
- 服务国家只有`TZ`和`TH`；九类服务slug固定为`airport-transfer`、`business-escort`、`travel-escort`、`site-guarding`、`event-security`、`armed-transport`、`long-term-guarding`、`risk-assessment`、`security-training`。
- 客户无需注册；姓名必填，手机号或邮箱至少一项。
- 不完整价格显示“评估后报价”，绝不显示0元。
- 武装配置是申请，始终显示“需审核确认”。
- 演示数据与正式数据使用不同Supabase项目；正式数据不得包含原型假价格。
- 所有数据库表启用RLS，并撤销不需要的`anon`和`authenticated`权限。
- 每个任务执行红—绿—重构测试循环并单独提交。

## Review Focus

- 人数、天数或时长为0、负数、极大值时拒绝报价；Task 3覆盖。
- 地区或价格缺失时返回`requiresAssessment=true`；Task 3覆盖。
- 武装选项在未开放地区仍不能形成自动承诺；Task 4覆盖。
- 姓名存在但手机号和邮箱都为空时不能提交；Task 5覆盖。
- 320像素宽度下价格明细和主按钮不得横向溢出；Task 6覆盖。

---

### Task 1: 项目骨架与测试基线

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `tests/unit/smoke.test.ts`
- Create: `tests/e2e/home.spec.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `typecheck`, `test`, `test:e2e` and alias `@/* -> src/*`。

- [ ] **Step 1: Write the failing smoke tests**

```ts
it('exposes the product shell', () => expect(PRODUCT_NAME).toBe('境安'))
test('home renders a country selector and nine service placeholders')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/smoke.test.ts && npm run test:e2e -- tests/e2e/home.spec.ts`  
Expected: FAIL because the product shell and page do not exist.

- [ ] **Step 3: Scaffold the application and implement the shared shell**

Create `src/config/product.ts` exporting `PRODUCT_NAME`, `SUPPORTED_COUNTRIES`, `SUPPORTED_LOCALES`; create the responsive header, footer and placeholder service grid. Pin Node with `.nvmrc` value `24` and `package.json.engines.node` value `>=24 <25`.

- [ ] **Step 4: Run baseline verification**

Run: `npm run typecheck && npm test && npm run build && npm run test:e2e -- tests/e2e/home.spec.ts`  
Expected: all commands exit 0 and home displays at 320px and desktop widths.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold security booking web app"
```

### Task 2: 服务目录、翻译与价格版本数据模型

**Files:**
- Create: `supabase/migrations/001_catalog.sql`
- Create: `supabase/seed.sql`
- Create: `src/features/catalog/types.ts`
- Create: `src/features/catalog/repository.ts`
- Create: `tests/db/catalog-rls.test.ts`
- Create: `tests/unit/catalog-repository.test.ts`

**Interfaces:**
- Produces: `CountryCode = 'TZ' | 'TH'`, `Locale = 'zh' | 'en' | 'th' | 'sw'`。
- Produces: `CatalogRepository.listPublished(country, locale): Promise<ServiceSummary[]>`。
- Produces: tables `services`, `service_translations`, `packages`, `package_options`, `price_versions`, `regions`。

- [ ] **Step 1: Write failing schema and repository tests**

```ts
it('returns only published services for the requested country and locale')
it('denies anonymous writes to every catalog table')
it('keeps an expired price version out of active results')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/catalog-repository.test.ts && npm run test:db -- tests/db/catalog-rls.test.ts`  
Expected: FAIL because migrations and repository are absent.

- [ ] **Step 3: Implement migrations and typed repository**

Use UUID primary keys, ISO currency codes, integer minor units for money, `effective_from`/`effective_to` for price versions, and `published_at` for public visibility. Seed the nine service identities only; do not seed unverified formal prices.

- [ ] **Step 4: Verify database behavior**

Run: `npm run db:reset && npm test -- tests/unit/catalog-repository.test.ts && npm run test:db -- tests/db/catalog-rls.test.ts`  
Expected: PASS; anonymous reads see published catalog rows and anonymous writes are rejected.

- [ ] **Step 5: Commit**

```bash
git add supabase src/features/catalog tests
git commit -m "feat: add versioned service catalog"
```

### Task 3: 纯函数报价引擎

**Files:**
- Create: `src/features/pricing/types.ts`
- Create: `src/features/pricing/calculate-standard-quote.ts`
- Create: `src/features/pricing/calculate-deposit.ts`
- Create: `tests/unit/pricing.test.ts`

**Interfaces:**
- Consumes: `CountryCode` and active `PriceVersion` from Task 2.
- Produces: `calculateStandardQuote(input: StandardQuoteInput, rates: StandardRates): QuoteResult`。
- Produces: `QuoteResult = { lines: QuoteLine[]; subtotalMinor: number | null; taxMinor: number | null; totalMinor: number | null; depositMinor: number; requiresAssessment: boolean; reasons: string[] }`。

- [ ] **Step 1: Write failing pricing tests**

```ts
it('calculates personnel, overtime, vehicle, tax and percentage deposit in minor units')
it.each([0, -1, 1001])('rejects invalid people count %s')
it('requires assessment when regional price is missing')
it('never converts a missing price into zero')
it('labels armed selection as approval-required')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/pricing.test.ts`  
Expected: FAIL with missing pricing functions.

- [ ] **Step 3: Implement the pricing interfaces**

Validate with Zod. Use integer minor units only. Cap people at1000, days at365, hours per day at24 and vehicles at100. A missing required rate returns a null total and `requiresAssessment=true`.

- [ ] **Step 4: Run pricing verification**

Run: `npm test -- tests/unit/pricing.test.ts`  
Expected: PASS for all calculation and rejection cases.

- [ ] **Step 5: Commit**

```bash
git add src/features/pricing tests/unit/pricing.test.ts
git commit -m "feat: add safe quote calculator"
```

### Task 4: 客户服务首页和详情配置器

**Files:**
- Create: `src/app/[locale]/page.tsx`
- Create: `src/app/[locale]/services/[slug]/page.tsx`
- Create: `src/features/catalog/components/service-card.tsx`
- Create: `src/features/quote/components/quote-configurator.tsx`
- Create: `src/features/quote/actions/preview-quote.ts`
- Create: `tests/component/quote-configurator.test.tsx`
- Create: `tests/e2e/catalog.spec.ts`

**Interfaces:**
- Consumes: `CatalogRepository.listPublished` and `calculateStandardQuote`。
- Produces: server action `previewQuote(input: StandardQuoteInput): Promise<QuoteResult>`。

- [ ] **Step 1: Write failing component and browser tests**

```tsx
it('updates the itemized quote when people, hours or vehicle count changes')
it('shows assessment-required rather than a zero total for custom services')
it('shows armed service as an application requiring review')
test('country selection filters published services')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/component/quote-configurator.test.tsx && npm run test:e2e -- tests/e2e/catalog.spec.ts`  
Expected: FAIL because pages and actions are absent.

- [ ] **Step 3: Implement the customer catalog and quote configurator**

Use server components for catalog reads and one client component for interactive configuration. Show inclusions, exclusions, minimum notice and regional caveats before the primary action.

- [ ] **Step 4: Run UI verification**

Run: `npm test -- tests/component/quote-configurator.test.tsx && npm run test:e2e -- tests/e2e/catalog.spec.ts`  
Expected: PASS on Chromium mobile emulation and desktop.

- [ ] **Step 5: Commit**

```bash
git add src/app src/features/catalog src/features/quote tests
git commit -m "feat: add customer catalog and quote configurator"
```

### Task 5: 预约提交与价格快照

**Files:**
- Create: `supabase/migrations/002_bookings.sql`
- Create: `src/features/booking/schema.ts`
- Create: `src/features/booking/create-booking.ts`
- Create: `src/features/booking/actions/submit-booking.ts`
- Create: `src/features/booking/components/booking-form.tsx`
- Create: `tests/unit/create-booking.test.ts`
- Create: `tests/e2e/booking.spec.ts`

**Interfaces:**
- Consumes: `QuoteResult` from Task 3.
- Produces: `createBooking(input: BookingInput, quote: QuoteResult): Promise<{ orderId: string; publicReference: string }>`。
- Produces: tables `orders`, `order_contacts`, `order_quote_snapshots`, `order_events`。

- [ ] **Step 1: Write failing booking tests**

```ts
it('rejects a booking without a name')
it('rejects a booking when phone and email are both blank')
it('stores the exact quote and price version snapshot used at submission')
it('creates an assessment order when total is unknown without storing zero')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/create-booking.test.ts && npm run test:e2e -- tests/e2e/booking.spec.ts`  
Expected: FAIL because booking storage and form do not exist.

- [ ] **Step 3: Implement booking schema, transaction and form**

Create orders in `awaiting_deposit` for priced bookings and `assessment_requested` for unpriced bookings. Store contact details separately from public references. Generate references for display only; do not grant access with them.

- [ ] **Step 4: Run booking verification**

Run: `npm run db:reset && npm test -- tests/unit/create-booking.test.ts && npm run test:e2e -- tests/e2e/booking.spec.ts`  
Expected: PASS, with no anonymous direct read of stored bookings.

- [ ] **Step 5: Commit**

```bash
git add supabase src/features/booking tests
git commit -m "feat: accept bookings with quote snapshots"
```

### Task 6: 阶段1验收与移动端回归

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/e2e/mobile-acceptance.spec.ts`
- Create: `docs/runbooks/stage-1-acceptance.md`

**Interfaces:**
- Consumes: completed public catalog, quote and booking flows.
- Produces: repeatable Stage 1 acceptance command and evidence checklist.

- [ ] **Step 1: Add failing acceptance tests**

```ts
test('320px viewport has no horizontal overflow and the submit action remains reachable')
test('a user can quote and submit each standard service')
test('custom services submit without a fabricated total')
```

- [ ] **Step 2: Run acceptance tests and record current failures**

Run: `npm run test:e2e -- tests/e2e/mobile-acceptance.spec.ts`  
Expected: FAIL until all responsive issues are corrected.

- [ ] **Step 3: Fix only the acceptance failures and write the runbook**

Runbook must list local setup, seed command, test data, expected screenshots and cleanup.

- [ ] **Step 4: Run the complete Stage 1 gate**

Run: `npm run typecheck && npm test && npm run build && npm run test:e2e`  
Expected: all commands exit 0; Playwright passes Chromium mobile and desktop projects.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e docs/runbooks
git commit -m "test: complete stage one acceptance"
```
