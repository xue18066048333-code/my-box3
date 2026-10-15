# 订单查询与免注册验证 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让未注册客户通过随机查询链接和独立验证码安全访问自己的订单、方案与付款待办。

**Architecture:** 显示用订单编号与访问凭据完全分离。服务端存储访问令牌摘要和一次性验证码摘要；邮件和短信通过统一发送接口交付，开发环境使用记录型适配器，正式环境必须配置经业务方批准的供应商。

**Tech Stack:** 延续阶段1；Supabase PostgreSQL、Next.js Server Actions、Zod、Vitest、Playwright、Resend邮件API、Twilio SMS API；发送渠道通过Provider接口隔离。

**Spec:** `outputs/海外安保预约平台产品需求规格书-v1.md`

## Global Constraints

- 客户无账号；订单号本身不能授权访问。
- 查询令牌至少256位随机熵，数据库只保存SHA-256摘要。
- 验证码6位、10分钟失效、单次使用；同一订单连续失败5次锁定15分钟。
- 页面、日志、分析事件和错误信息不得包含完整令牌、验证码或联系方式。
- 订单访问页面使用`Cache-Control: private, no-store`。
- 邮件或短信发送失败不能丢失订单，客户可在限流允许后重试。

## Review Focus

- 猜测订单号不能获得任何订单数据；Task 1覆盖。
- 过期、重复使用及错误验证码全部拒绝；Task 2覆盖。
- 验证页面不能泄露手机号或邮箱是否存在；Task 2覆盖。
- 发送供应商超时后允许安全重试且不重复创建订单；Task 3覆盖。
- 通过一个国家订单的验证不能读取另一个订单；Task 4覆盖。

---

### Task 1: 访问令牌和订单查询会话

**Files:**
- Create: `supabase/migrations/003_order_access.sql`
- Create: `src/features/order-access/token.ts`
- Create: `src/features/order-access/session.ts`
- Create: `tests/unit/order-access-token.test.ts`
- Create: `tests/db/order-access-rls.test.ts`

**Interfaces:**
- Produces: `issueOrderAccessToken(orderId: string): Promise<{ rawToken: string; expiresAt: Date }>`。
- Produces: `verifyOrderAccessToken(rawToken: string): Promise<{ orderId: string } | null>`。
- Produces: tables `order_access_tokens`, `order_access_sessions`。

- [ ] **Step 1: Write failing token and RLS tests**

```ts
it('stores only a SHA-256 token digest')
it('rejects an expired or revoked token')
it('does not authorize by public order reference')
it('denies anonymous direct select from order access tables')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/order-access-token.test.ts && npm run test:db -- tests/db/order-access-rls.test.ts`  
Expected: FAIL because token storage is absent.

- [ ] **Step 3: Implement token issuance and server-side lookup**

Use `crypto.randomBytes(32)` and `crypto.createHash('sha256')`. Raw tokens may appear only once in the customer link returned from the server.

- [ ] **Step 4: Run token verification**

Run: `npm run db:reset && npm test -- tests/unit/order-access-token.test.ts && npm run test:db -- tests/db/order-access-rls.test.ts`  
Expected: PASS; database stores no raw token.

- [ ] **Step 5: Commit**

```bash
git add supabase src/features/order-access tests
git commit -m "feat: add secure order access tokens"
```

### Task 2: 联系方式验证挑战

**Files:**
- Create: `src/features/order-access/challenge.ts`
- Create: `src/features/order-access/rate-limit.ts`
- Create: `src/features/order-access/mask-contact.ts`
- Create: `tests/unit/order-access-challenge.test.ts`

**Interfaces:**
- Produces: `createChallenge(orderId: string, channel: 'email' | 'sms'): Promise<VerificationChallenge>`。
- Produces: `verifyChallenge(challengeId: string, code: string): Promise<VerifiedOrderSession>`。
- Produces: `maskContact(value: string, channel): string`。

- [ ] **Step 1: Write failing challenge tests**

```ts
it('accepts one correct code within ten minutes')
it('rejects an expired code and a reused code')
it('locks attempts for fifteen minutes after five failures')
it('returns the same public response for known and unknown contacts')
it('masks email and phone without revealing the full value')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/order-access-challenge.test.ts`  
Expected: FAIL with missing challenge functions.

- [ ] **Step 3: Implement challenge storage and validation**

Store only a salted code digest, attempt count, expiration, use time and lock time. Create a short-lived httpOnly, secure, sameSite=lax order session cookie after successful verification.

- [ ] **Step 4: Run challenge verification**

Run: `npm test -- tests/unit/order-access-challenge.test.ts`  
Expected: PASS for expiry, reuse, lock and enumeration cases.

- [ ] **Step 5: Commit**

```bash
git add src/features/order-access tests/unit/order-access-challenge.test.ts
git commit -m "feat: verify customer order access"
```

### Task 3: 可替换的邮件和短信发送接口

**Files:**
- Create: `src/features/notifications/verification-delivery.ts`
- Create: `src/features/notifications/providers/recording.ts`
- Create: `src/features/notifications/providers/resend.ts`
- Create: `src/features/notifications/providers/twilio.ts`
- Create: `tests/unit/verification-delivery.test.ts`
- Create: `docs/runbooks/notification-provider-setup.md`

**Interfaces:**
- Produces: `VerificationDelivery.send(message: VerificationMessage): Promise<{ providerMessageId: string }>`。
- Consumes: business-approved provider credentials from server-only environment variables.

- [ ] **Step 1: Write failing provider contract tests**

```ts
it('records development messages without external transmission')
it('redacts codes and contacts from application logs')
it('maps provider timeout to a retryable delivery failure')
it('never retries a non-retryable destination error automatically')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/verification-delivery.test.ts`  
Expected: FAIL because the provider contract is absent.

- [ ] **Step 3: Implement adapters and setup runbook**

使用Resend发送邮件验证码，使用Twilio发送短信验证码。Production adapters must remain disabled until `RESEND_API_KEY`、`RESEND_FROM`、`TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN`和`TWILIO_FROM`配置完成。Do not hard-code a vendor account, sender name or phone number.

- [ ] **Step 4: Run notification verification**

Run: `npm test -- tests/unit/verification-delivery.test.ts`  
Expected: PASS using the recording adapter; no live message is sent.

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications tests docs/runbooks
git commit -m "feat: add pluggable verification delivery"
```

### Task 4: 客户订单页与状态时间线

**Files:**
- Create: `src/app/[locale]/orders/access/[token]/page.tsx`
- Create: `src/app/[locale]/orders/verify/page.tsx`
- Create: `src/app/[locale]/orders/[orderId]/page.tsx`
- Create: `src/features/orders/customer-order-repository.ts`
- Create: `src/features/orders/components/order-timeline.tsx`
- Create: `tests/e2e/order-access.spec.ts`

**Interfaces:**
- Consumes: verified order session from Task 2.
- Produces: `CustomerOrderRepository.getForSession(session, orderId): Promise<CustomerOrderView>`。

- [ ] **Step 1: Write failing browser tests**

```ts
test('an unverified visitor sees no order details')
test('a verified customer sees only the authorized order')
test('another order id returns not found without leaking its existence')
test('the response is private and no-store')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:e2e -- tests/e2e/order-access.spec.ts`  
Expected: FAIL because order access pages are absent.

- [ ] **Step 3: Implement verification and customer order pages**

Render order status, quote snapshot and customer-visible events only. Never include internal notes, staff IDs, private proof paths or audit metadata.

- [ ] **Step 4: Run Stage 2 gate**

Run: `npm run typecheck && npm test && npm run build && npm run test:e2e -- tests/e2e/order-access.spec.ts`  
Expected: all commands exit 0 and cross-order access is denied.

- [ ] **Step 5: Commit**

```bash
git add src/app src/features/orders tests/e2e/order-access.spec.ts
git commit -m "feat: add verified customer order portal"
```
