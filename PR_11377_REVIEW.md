# PR #11377 Review: Referral Dashboard and Registration

**PR Link:** https://github.com/shapeshift/web/pull/11377
**Branch:** referral-dashboard → develop
**Status:** Open
**Risk:** Low (behind feature flag)

## Overview
This PR implements a comprehensive referral program with dashboard UI, code management, and tracking integration. It's feature-flagged (`VITE_FEATURE_REFERRAL`) and low-risk.

---

## ✅ Strengths

1. **Proper Feature Flag Implementation** - Correctly follows ShapeShift's feature flag pattern with environment variables, Redux state, and test mocks
2. **Good i18n Coverage** - All user-facing strings use translation keys in `main.json`
3. **Comprehensive UI Components** - Well-structured component hierarchy with proper separation of concerns
4. **Type Safety** - Good TypeScript types defined in `src/lib/referral/types.ts`
5. **Smart URL-based Tracking** - `useReferralCapture` hook automatically captures `?ref=CODE` from URLs
6. **Proper Error Handling** - API error handling with custom `ReferralApiError` class
7. **React Query Integration** - Uses `@tanstack/react-query` for data fetching and mutations with proper cache invalidation

---

## ⚠️ Issues & Concerns

### 🔴 Critical Issues (MUST FIX BEFORE MERGE)

#### Issue #1: Missing Type Definitions
**Location:** `packages/swapper/src/types.ts:444-459`
**Problem:** `SwapperSpecificMetadata` type is missing three fields being assigned in `src/lib/tradeExecution.ts:182-185`:
- `portalsTransactionMetadata`
- `zrxTransactionMetadata`
- `bebopTransactionMetadata`

**Impact:** TypeScript compilation will fail

**Fix:**
```typescript
export type SwapperSpecificMetadata = {
  chainflipSwapId: number | undefined
  nearIntentsSpecific?: {
    depositAddress: string
    depositMemo?: string
    timeEstimate: number
    deadline: string
  }
  cowswapQuoteSpecific?: OrderQuoteResponse
  portalsTransactionMetadata?: TradeQuoteStep['portalsTransactionMetadata']
  zrxTransactionMetadata?: TradeQuoteStep['zrxTransactionMetadata']
  bebopTransactionMetadata?: TradeQuoteStep['bebopTransactionMetadata']
  relayTransactionMetadata: RelayTransactionMetadata | undefined
  relayerExplorerTxLink: string | undefined
  relayerTxHash: string | undefined
  stepIndex: SupportedTradeQuoteStepIndex
  quoteId: string
  streamingSwapMetadata: StreamingSwapMetadata | undefined
}
```

---

#### Issue #2: Incomplete Feature Flag in Test Mocks
**Location:** `src/test/mocks/store.ts`
**Problem:** Missing `Referral: false` in the `featureFlags` object
**Impact:** Test failures

**Fix:** Add `Referral: false,` to the mock (after `AppRating` at line ~181)

---

### 🟡 Code Quality Issues (SHOULD FIX)

#### Issue #3: Type Duplication in ReferralCodesTable
**Location:** `src/components/Referral/ReferralCodesTable.tsx:16-19`
**Problem:** Defines local `ReferralCode` type that duplicates `src/lib/referral/types.ts:ReferralCode`

**Fix:**
```typescript
import type { ReferralCode as ReferralCodeModel } from '@/lib/referral/types'

type ReferralCode = Pick<ReferralCodeModel, 'code' | 'usageCount' | 'swapVolumeUsd'>
```

---

#### Issue #4: Type Duplication in ReferralCodesManagementTable
**Location:** `src/components/Referral/ReferralCodesManagementTable.tsx:16-21`
**Problem:** Defines `ReferralCodeFull` that overlaps with shared type

**Fix:** Use shared type from `src/lib/referral/types.ts` or `Pick<>` from it

---

#### Issue #5: Component Duplication in Referral Page
**Location:** `src/pages/Referral/Referral.tsx:31-39`
**Problem:** Duplicates `ReferralHeader` component that already exists in `src/components/Referral/ReferralHeader.tsx`

**Fix:** Remove local component and import the shared one

---

#### Issue #6: Hardcoded Currency Formatting
**Location:** `src/components/Referral/ReferralStatsCards.tsx`
**Problem:** Hardcodes `$` + string concatenation (`${currentRewards ?? '0.00'}`)
- Doesn't follow app's fiat formatting conventions
- Breaks i18n for non-USD users

**Current:**
```typescript
${currentRewards ?? '0.00'}
```

**Recommendation:** Use a shared fiat formatter component (like `<Amount.Fiat>`) or `Intl.NumberFormat`

---

#### Issue #7: Fixed Width Not Responsive
**Location:** `src/components/Referral/ReferralCodeCard.tsx:43`
**Problem:** Uses `width='50%'` which may not work well on mobile

**Fix:**
```typescript
width={{ base: 'full', md: '50%' }}
```

---

#### Issue #8: Date Type Inconsistency
**Location:** `src/lib/referral/types.ts`
**Problem:** Types use `Date | string` unions for `createdAt`/`expiresAt` which spreads parsing responsibility

**Recommendation:** API types should use ISO `string`, convert to `Date` at the edge once

---

#### Issue #9: Error Construction Pattern
**Location:** `src/lib/referral/api.ts:13-28`
**Problem:** Creates error then casts it rather than using proper class constructor

**Current:**
```typescript
const apiError = new Error(message) as ReferralApiError
apiError.name = 'ReferralApiError'
apiError.code = code
apiError.statusCode = statusCode
throw apiError
```

**Fix:**
```typescript
throw new ReferralApiError(message, code, statusCode)
```

---

### 🔵 Performance & Best Practices (NICE TO HAVE)

#### Issue #10: Missing Lazy Loading
**Location:** `src/pages/Fox/FoxEcosystemPage.tsx:11`
**Problem:** `ReferralDashboard` is imported directly but only used behind feature flag
**Impact:** Unnecessary bundle size when feature is disabled

**Fix:** Lazy-load with `makeSuspenseful` pattern

---

#### Issue #11: Skeleton Repetition
**Location:** `src/components/Referral/ReferralStatsCards.tsx:20-63`
**Problem:** Repeats identical skeleton Card 3 times

**Fix:** Map over array to reduce duplication

---

### 📋 Testing Gaps

- No unit tests for referral hooks (`useReferral`, `useReferralCapture`)
- No tests for API error handling
- No tests for referral code generation logic

---

### 🔒 Security Considerations

✅ Owner address is sent to backend (hashed for privacy per comment in code)
✅ Referral code stored in localStorage - acceptable for this use case
✅ No sensitive data exposed in client

---

## 🎯 Verdict

**Status: DO NOT MERGE**

Must fix Critical Issues #1 and #2 before merge - TypeScript compilation will fail without the missing type definitions.

Once those are resolved, this is a solid feature implementation that follows ShapeShift's patterns well. The code quality issues are mostly minor refactoring opportunities that could be addressed in follow-up PRs or during this PR.

---

## Action Plan

### Phase 1: Critical Fixes (Required)
- [ ] Issue #1: Add missing type definitions to `SwapperSpecificMetadata`
- [ ] Issue #2: Add `Referral: false` to test mocks

### Phase 2: Code Quality (Recommended)
- [ ] Issue #3: Remove type duplication in ReferralCodesTable
- [ ] Issue #4: Remove type duplication in ReferralCodesManagementTable
- [ ] Issue #5: Remove component duplication in Referral page
- [ ] Issue #6: Fix currency formatting to use app conventions
- [ ] Issue #7: Make ReferralCodeCard responsive

### Phase 3: Optimizations (Optional)
- [ ] Issue #8: Normalize date types to ISO strings
- [ ] Issue #9: Use proper ReferralApiError constructor
- [ ] Issue #10: Lazy-load ReferralDashboard
- [ ] Issue #11: Reduce skeleton repetition
- [ ] Add unit tests for hooks
