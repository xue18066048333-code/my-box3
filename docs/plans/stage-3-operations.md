# 后台资金、方案与运营 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建成两国负责人和总管理员使用的运营后台，支持人工核款、方案版本、客户确认、退款和服务安排。

**Architecture:** 后台使用Supabase Auth和PostgreSQL RLS执行国家级权限隔离；所有状态变化通过服务端命令完成，不允许页面直接更新订单状态。付款凭证存入私有Storage桶，通过短时签名URL查看；订单事件和审计日志追加写入。

**Tech Stack:** 延续阶段1和2；Supabase Auth/RLS/Storage、Next.js 16服务端页面、Zod、Vitest、Playwright。

**Spec:** `outputs/海外安保预约平台产品需求规格书-v1.md`

## Global Constraints

- 角色仅为`super_admin`、`country_manager`；国家负责人必须绑定`TZ`或`TH`。
- 负责人只能读取和操作自己国家的数据；总管理员可访问全部。
- 上传付款凭证不等于到账，必须由有权限人员核实。
- 方案每次实质修改创建新版本并使旧确认失效。
- 退款申请、退款处理中和已退款为不同状态。
- 关键状态和资金记录不得物理删除，只能冲正或追加更正记录。
- 后台认证页面和响应必须`private, no-store`。

## Review Focus

- 泰国负责人无法通过改URL或请求体访问坦桑尼亚订单；Task 1覆盖。
- 恶意文件、超大文件和伪造扩展名不能进入凭证桶；Task 2覆盖。
- 重复核款请求不能产生两笔到账记录；Task 3覆盖。
- 已确认方案被修改后客户确认必须失效；Task 4覆盖。
- 退款申请不能被显示成已退款；Task 5覆盖。

---

### Task 1: 员工认证和国家权限隔离

**Files:**
- Create: `supabase/migrations/004_staff_roles.sql`
- Create: `src/lib/supabase/server.ts`
- Create: `src/features/staff/authorize.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `tests/db/staff-rls.test.ts`
- Create: `tests/e2e/admin-auth.spec.ts`

**Interfaces:**
- Produces: `StaffContext = { userId: string; role: 'super_admin' | 'country_manager'; country: CountryCode | null }`。
- Produces: `requireStaff(): Promise<StaffContext>` and `requireOrderAccess(staff, orderId): Promise<void>`。

- [ ] **Step 1: Write failing authorization tests**

```ts
it('allows TZ manager to read TZ orders only')
it('denies TH manager access to a TZ order even with a known UUID')
it('allows super admin to read both countries')
test('authenticated admin pages are never cached publicly')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:db -- tests/db/staff-rls.test.ts && npm run test:e2e -- tests/e2e/admin-auth.spec.ts`  
Expected: FAIL before roles and policies exist.

- [ ] **Step 3: Implement staff profiles, RLS and protected layout**

Use Supabase SSR cookies and server-side claims validation. Do not enable ISR on authenticated routes. Store authorization roles in protected database rows, not user-editable metadata.

- [ ] **Step 4: Run authorization verification**

Run: `npm run db:reset && npm run test:db -- tests/db/staff-rls.test.ts && npm run test:e2e -- tests/e2e/admin-auth.spec.ts`  
Expected: PASS for country isolation and no-store behavior.

- [ ] **Step 5: Commit**

```bash
git add supabase src/lib src/features/staff src/app/admin tests
git commit -m "feat: isolate staff access by country"
```

### Task 2: 私有付款凭证上传与查看

**Files:**
- Create: `supabase/migrations/005_payment_proofs.sql`
- Create: `supabase/storage/payment-proofs.sql`
- Create: `src/features/payments/proof-schema.ts`
- Create: `src/features/payments/upload-proof.ts`
- Create: `src/features/payments/create-proof-view-url.ts`
- Create: `tests/unit/payment-proof.test.ts`
- Create: `tests/db/payment-proof-storage.test.ts`

**Interfaces:**
- Produces: `uploadPaymentProof(input: ProofUploadInput): Promise<PaymentProof>`。
- Produces: `createProofViewUrl(staff, proofId, 300): Promise<string>`。

- [ ] **Step 1: Write failing proof tests**

```ts
it('accepts PDF, JPEG, PNG and WebP up to 10 MB')
it('rejects executable content renamed as an image')
it('stores objects under country/order/random-key paths')
it('creates a five-minute signed URL only for authorized staff')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/payment-proof.test.ts && npm run test:db -- tests/db/payment-proof-storage.test.ts`  
Expected: FAIL because private storage is absent.

- [ ] **Step 3: Implement content validation and private storage**

Validate magic bytes server-side, ignore the client filename for storage keys, preserve a sanitized display name and log upload metadata without the signed URL.

- [ ] **Step 4: Run proof verification**

Run: `npm test -- tests/unit/payment-proof.test.ts && npm run test:db -- tests/db/payment-proof-storage.test.ts`  
Expected: PASS; anonymous storage reads fail.

- [ ] **Step 5: Commit**

```bash
git add supabase src/features/payments tests
git commit -m "feat: secure payment proof storage"
```

### Task 3: 付款台账和幂等核款

**Files:**
- Create: `supabase/migrations/006_payment_ledger.sql`
- Create: `src/features/payments/payment-state.ts`
- Create: `src/features/payments/record-payment.ts`
- Create: `src/features/payments/verify-payment.ts`
- Create: `src/app/admin/orders/[orderId]/payments/page.tsx`
- Create: `tests/unit/payment-ledger.test.ts`

**Interfaces:**
- Produces: `recordPayment(input: PaymentInput, idempotencyKey: string): Promise<Payment>`。
- Produces: `verifyPayment(staff: StaffContext, paymentId: string, received: Money): Promise<Payment>`。
- Produces: immutable `payment_ledger_entries` plus current `payments.status`。

- [ ] **Step 1: Write failing ledger tests**

```ts
it('keeps proof-submitted separate from received')
it('records partial receipt without marking fully paid')
it('returns the same result for a repeated idempotency key')
it('rejects currency mismatch and overpayment without an explicit adjustment')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/payment-ledger.test.ts`  
Expected: FAIL before ledger commands exist.

- [ ] **Step 3: Implement payment state machine and admin screen**

Allowed states: `awaiting_payment`, `proof_pending`, `partially_received`, `received`, `verification_failed`, `refund_pending`, `partially_refunded`, `refunded`.

- [ ] **Step 4: Run ledger verification**

Run: `npm test -- tests/unit/payment-ledger.test.ts`  
Expected: PASS, including duplicate command protection.

- [ ] **Step 5: Commit**

```bash
git add supabase src/features/payments src/app/admin tests/unit/payment-ledger.test.ts
git commit -m "feat: add auditable payment ledger"
```

### Task 4: 最终方案版本和客户确认

**Files:**
- Create: `supabase/migrations/007_proposals.sql`
- Create: `src/features/proposals/create-proposal-version.ts`
- Create: `src/features/proposals/confirm-proposal.ts`
- Create: `src/app/admin/orders/[orderId]/proposal/page.tsx`
- Create: `src/app/[locale]/orders/[orderId]/proposal/page.tsx`
- Create: `tests/unit/proposal-versioning.test.ts`
- Create: `tests/e2e/proposal-confirmation.spec.ts`

**Interfaces:**
- Produces: `createProposalVersion(staff, input): Promise<ProposalVersion>`。
- Produces: `confirmProposal(orderSession, proposalVersionId, acceptedTermsVersion): Promise<ProposalConfirmation>`。

- [ ] **Step 1: Write failing proposal tests**

```ts
it('stores total, deposit credit, balance, configuration and cancellation terms')
it('expires the previous customer confirmation when a material field changes')
it('rejects confirmation of a superseded or expired proposal')
it('records the accepted proposal and terms versions with a timestamp')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/proposal-versioning.test.ts && npm run test:e2e -- tests/e2e/proposal-confirmation.spec.ts`  
Expected: FAIL before proposal versioning exists.

- [ ] **Step 3: Implement proposal editing, customer review and explicit confirmation**

Customer confirmation requires a visible checkbox and exact version IDs. Any money, service configuration or cancellation-term change creates a new version.

- [ ] **Step 4: Run proposal verification**

Run: `npm test -- tests/unit/proposal-versioning.test.ts && npm run test:e2e -- tests/e2e/proposal-confirmation.spec.ts`  
Expected: PASS for confirmation invalidation and balance display.

- [ ] **Step 5: Commit**

```bash
git add supabase src/features/proposals src/app tests
git commit -m "feat: version and confirm final proposals"
```

### Task 5: 取消、退款和服务安排

**Files:**
- Create: `supabase/migrations/008_cancellations_refunds.sql`
- Create: `src/features/orders/request-cancellation.ts`
- Create: `src/features/payments/refund.ts`
- Create: `src/features/operations/arrange-service.ts`
- Create: `src/app/admin/orders/[orderId]/operations/page.tsx`
- Create: `tests/unit/cancellation-refund.test.ts`
- Create: `tests/e2e/admin-order-lifecycle.spec.ts`

**Interfaces:**
- Produces: `requestCancellation(actor, orderId, reason): Promise<Cancellation>`。
- Produces: `recordRefund(staff, input): Promise<Refund>`。
- Produces: `arrangeService(staff, input): Promise<ServiceArrangement>`。

- [ ] **Step 1: Write failing lifecycle tests**

```ts
it('calculates full deposit refund before proposal confirmation')
it('uses the accepted cancellation rule after confirmation')
it('keeps refund_pending distinct from refunded')
it('creates a refund difference when final amount is below the received deposit')
it('requires verified required payment before service arrangement')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/cancellation-refund.test.ts && npm run test:e2e -- tests/e2e/admin-order-lifecycle.spec.ts`  
Expected: FAIL before cancellation and arrangement commands exist.

- [ ] **Step 3: Implement cancellation, refund ledger entries and service arrangements**

Store the cancellation rule snapshot used for the calculation. Arrangement records only the agreed configuration summary, meeting place/time and responsible contact in this phase.

- [ ] **Step 4: Run Stage 3 gate**

Run: `npm run typecheck && npm test && npm run build && npm run test:e2e -- tests/e2e/admin-order-lifecycle.spec.ts`  
Expected: all commands exit 0; country isolation and refund states remain correct.

- [ ] **Step 5: Commit**

```bash
git add supabase src/features/orders src/features/payments src/features/operations src/app/admin tests
git commit -m "feat: complete operational order lifecycle"
```
