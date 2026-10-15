# 多语言、内容、安全与上线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成四语内容管理、币种与收款配置、安全加固、跨浏览器验收和可重复上线流程。

**Architecture:** 文案采用数据库版本与发布状态管理，界面固定文案保存在类型安全的locale字典中。国家级业务设置独立版本化，所有敏感后台及订单响应禁用共享缓存。上线以分离的测试/正式环境、数据库迁移和自动化质量门为准。

**Tech Stack:** 延续前三阶段；Next.js 16、TypeScript、Supabase、Vitest、Playwright Chromium/Firefox/WebKit、axe-core、CI。

**Spec:** `outputs/海外安保预约平台产品需求规格书-v1.md`

## Global Constraints

- 支持`zh`、`en`、`th`、`sw`四种语言；缺失或未审核翻译不得误标为已发布。
- 价格、套餐配置和业务状态共享，文案按语言版本化。
- 内部可以美元汇总；展示、合同和付款币种分别配置。
- 坦桑尼亚本地业务默认准备TZS配置，外币能力默认关闭，只有业务确认后才能启用。
- 正式品牌、税率、账户、退款参数、武装开放条件、条款和图片均为发布前录入项。
- 不得在客户端包、日志或仓库中出现服务密钥、完整银行信息或私有文件URL。
- 上线必须通过类型、单元、数据库、构建、跨浏览器、移动端和权限测试。

## Review Focus

- 缺失翻译不能退回错误语言后悄悄发布；Task 1覆盖。
- 历史订单继续显示当时的银行和币种快照；Task 2覆盖。
- 上传、验证及后台端点遭遇高频请求时限流且不泄露存在性；Task 3覆盖。
- 320像素、长泰文和斯瓦希里文文本不得遮挡按钮；Task 4覆盖。
- 部署失败或迁移失败时不能发布一半版本；Task 5覆盖。

---

### Task 1: 四语字典和内容发布工作流

**Files:**
- Create: `src/i18n/locales/zh.ts`
- Create: `src/i18n/locales/en.ts`
- Create: `src/i18n/locales/th.ts`
- Create: `src/i18n/locales/sw.ts`
- Create: `src/i18n/get-dictionary.ts`
- Create: `supabase/migrations/009_content_workflow.sql`
- Create: `src/features/content/publish-translation.ts`
- Create: `src/app/admin/content/page.tsx`
- Create: `tests/unit/i18n-completeness.test.ts`
- Create: `tests/unit/content-publishing.test.ts`

**Interfaces:**
- Produces: `getDictionary(locale: Locale): Dictionary` with identical keys for all locales.
- Produces: `publishTranslation(staff, translationId): Promise<PublishedTranslation>`。
- Produces: states `draft`, `in_review`, `approved`, `published`, `archived`。

- [ ] **Step 1: Write failing language and workflow tests**

```ts
it('requires every locale dictionary to have the same keys')
it('does not publish an incomplete translation')
it('allows only super admin to mark legal and refund text approved')
it('renders the requested published locale without mixing draft content')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/i18n-completeness.test.ts tests/unit/content-publishing.test.ts`  
Expected: FAIL because dictionaries and workflow are absent.

- [ ] **Step 3: Implement typed dictionaries and translation workflow**

Keep system error/status copy in code dictionaries; keep service, package, policy and marketing content in versioned database translations. Record reviewer and publication timestamps.

- [ ] **Step 4: Run language verification**

Run: `npm test -- tests/unit/i18n-completeness.test.ts tests/unit/content-publishing.test.ts`  
Expected: PASS with no missing keys and no unapproved publish path.

- [ ] **Step 5: Commit**

```bash
git add src/i18n supabase src/features/content src/app/admin/content tests/unit
git commit -m "feat: add reviewed four-language content"
```

### Task 2: 国家设置、币种和收款账户版本

**Files:**
- Create: `supabase/migrations/010_country_settings.sql`
- Create: `src/features/settings/types.ts`
- Create: `src/features/settings/publish-country-settings.ts`
- Create: `src/features/settings/snapshot-payment-instructions.ts`
- Create: `src/app/admin/settings/[country]/page.tsx`
- Create: `tests/unit/country-settings.test.ts`

**Interfaces:**
- Produces: `CountrySettingsVersion` with `displayCurrency`, `contractCurrency`, `paymentCurrency`, `foreignCurrencyEnabled`, `taxStatus`, `bankAccountVersionId`。
- Produces: `snapshotPaymentInstructions(orderId, settingsVersionId): Promise<OrderPaymentInstructions>`。

- [ ] **Step 1: Write failing settings tests**

```ts
it('keeps foreign currency disabled for TZ until explicitly approved')
it('allows display, contract and payment currencies to differ')
it('preserves historical payment instructions after account changes')
it('does not publish a bank account missing beneficiary, bank and currency')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/country-settings.test.ts`  
Expected: FAIL before settings versions exist.

- [ ] **Step 3: Implement settings publication and order snapshots**

银行账户表只允许服务端角色访问并由RLS限制国家范围；依赖托管数据库的静态加密，不把账户值写入日志、客户端包或环境变量。对客户只暴露订单快照中选定的启用账户。

- [ ] **Step 4: Run settings verification**

Run: `npm test -- tests/unit/country-settings.test.ts`  
Expected: PASS for foreign currency default, required fields and immutable snapshots.

- [ ] **Step 5: Commit**

```bash
git add supabase src/features/settings src/app/admin/settings tests/unit/country-settings.test.ts
git commit -m "feat: version country currency and payment settings"
```

### Task 3: 安全加固、审计和数据保留

**Files:**
- Create: `supabase/migrations/011_audit_retention.sql`
- Create: `src/lib/security/request-rate-limit.ts`
- Create: `src/lib/security/redact-log.ts`
- Create: `src/features/audit/write-audit-event.ts`
- Create: `src/features/retention/apply-retention-policy.ts`
- Create: `tests/unit/security-controls.test.ts`
- Create: `tests/db/audit-retention.test.ts`
- Create: `docs/runbooks/security-incident.md`

**Interfaces:**
- Produces: `writeAuditEvent(event: AuditEvent): Promise<void>` as append-only.
- Produces: `applyRetentionPolicy(policy: RetentionPolicy, now: Date): Promise<RetentionResult>`。
- Produces: `rateLimit(key, policy): Promise<RateLimitDecision>`。

- [ ] **Step 1: Write failing security tests**

```ts
it('redacts tokens, codes, contacts, bank values and signed URLs from logs')
it('rate limits order verification, proof upload and admin login separately')
it('prevents country managers from deleting audit events')
it('deletes or anonymizes only records past the configured retention date')
it('keeps financial audit records excluded from automatic deletion when policy requires')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/security-controls.test.ts && npm run test:db -- tests/db/audit-retention.test.ts`  
Expected: FAIL before security controls exist.

- [ ] **Step 3: Implement security controls and incident runbook**

Runbook must cover credential rotation, session revocation, signed URL exposure, incorrect country access, proof removal and audit preservation.

- [ ] **Step 4: Run security verification**

Run: `npm test -- tests/unit/security-controls.test.ts && npm run test:db -- tests/db/audit-retention.test.ts`  
Expected: PASS; unauthorized destructive operations fail.

- [ ] **Step 5: Commit**

```bash
git add supabase src/lib/security src/features/audit src/features/retention tests docs/runbooks
git commit -m "feat: harden audit and data retention"
```

### Task 4: 可访问性、长文本和跨浏览器验收

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/e2e/locales-layout.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `tests/e2e/cross-browser-journey.spec.ts`
- Create: `docs/runbooks/business-acceptance.md`

**Interfaces:**
- Consumes: complete customer and admin flows.
- Produces: a single browser acceptance suite for four locales and three browser engines.

- [ ] **Step 1: Add failing layout and accessibility tests**

```ts
test.each(['zh','en','th','sw'])('320px %s pages have no horizontal overflow')
test('customer and admin primary journeys have no serious axe violations')
test('keyboard-only users can configure, submit, verify and confirm')
test('Chromium, Firefox and WebKit complete the standard order journey')
```

- [ ] **Step 2: Run tests and capture current failures**

Run: `npm run test:e2e -- tests/e2e/locales-layout.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/cross-browser-journey.spec.ts`  
Expected: FAIL until long-copy, focus, labels and browser differences are fixed.

- [ ] **Step 3: Fix acceptance failures and write business acceptance script**

The script must cover both countries, one standard order, one assessment order, payment proof, proposal confirmation, cancellation/refund and country isolation.

- [ ] **Step 4: Run cross-browser verification**

Run: `npm run test:e2e`  
Expected: PASS on Chromium, Firefox and WebKit including a 320px project.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e docs/runbooks/business-acceptance.md src
git commit -m "test: verify locales accessibility and browsers"
```

### Task 5: 环境、迁移、备份和发布门

**Files:**
- Create: `.env.example`
- Create: `.github/workflows/ci.yml`
- Create: `scripts/check-production-config.ts`
- Create: `scripts/smoke-production.ts`
- Create: `docs/runbooks/deployment.md`
- Create: `docs/runbooks/rollback.md`
- Create: `docs/runbooks/backup-restore.md`
- Create: `tests/unit/production-config.test.ts`

**Interfaces:**
- Produces: `npm run verify`, `npm run check:production-config`, `npm run smoke:production`。
- Consumes: separate staging and production environment variables; no credential values stored in Git.

- [ ] **Step 1: Write failing production configuration tests**

```ts
it('rejects production when test Supabase or notification credentials are present')
it('rejects missing legal content, bank settings, tax status or enabled locale review')
it('rejects placeholder prices and demo beneficiary names')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/production-config.test.ts`  
Expected: FAIL before the release checker exists.

- [ ] **Step 3: Implement CI, configuration check and runbooks**

CI order: install with lockfile → typecheck → unit/component tests → local database migrations → RLS tests → build → Playwright. Deployment runbook requires a fresh backup and successful staging migration before production migration.

- [ ] **Step 4: Execute the final release gate in staging**

Run: `npm ci && npm run verify && npm run check:production-config && npm run smoke:production -- --base-url=$STAGING_URL`  
Expected: all commands exit 0; smoke test creates and removes only tagged staging data.

- [ ] **Step 5: Perform business acceptance and record approval**

Run: follow `docs/runbooks/business-acceptance.md` using non-sensitive staging data.  
Expected: business owner signs off the recorded build identifier; no production deployment occurs before this sign-off.

- [ ] **Step 6: Commit**

```bash
git add .env.example .github scripts docs/runbooks tests/unit/production-config.test.ts package.json
git commit -m "chore: add verified production release process"
```
