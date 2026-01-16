# Yield Feature Improvements Analysis

Based on exploration of the codebase, here are categorized improvements for the Yields feature.

## Quick Wins (High Impact, Low Effort)

These can be implemented with minimal code changes:

### 1. Typography Punch - APY Emphasis
**File:** `src/pages/Yields/components/YieldItem.tsx`
- Current: APY uses `GradientApy` but same font weight as other text
- Change: Increase `fontWeight` to `bold` or `semibold`, bump `fontSize` slightly
- Also applies to TVL display in `YieldOpportunityStats.tsx`

### 2. Copy Updates
**Files:** `src/assets/translations/en/main.json`, various components
- "My Positions" → "Your positions"
- "Available to Earn" → "Opportunities" or "Put your spare crypto to work"
- Update `translate()` keys

### 3. Strategy Naming - Use `metadata.name`
**File:** `src/pages/Yields/components/YieldItem.tsx` (line ~86, ~156)
- Currently: Card titles show asset name/symbol, subtitle shows provider
- Change: For single yields, show `metadata.name` (e.g., "Aave v3 USDC Lending") as primary title
- Provider becomes secondary label

### 4. Lightning Icon on Enter/Deposit Buttons
**Files:** `YieldOpportunityCard.tsx`, `YieldHero.tsx`, `YieldEnterModal.tsx`
- Add `FaBolt` icon to "Start Earning", "Deposit", "Enter" buttons
- Pattern: `<Button leftIcon={<FaBolt />}>Deposit</Button>`

### 5. Maintenance/Deprecated Warnings
**Files:** `YieldItem.tsx`, `YieldHero.tsx`
- Data exists: `metadata.underMaintenance`, `metadata.deprecated`
- Add: Warning badge/alert when these are `true`
- Use Chakra `<Alert status='warning'>` or `<Badge colorScheme='orange'>`

---

## Medium Effort Improvements

These require more component work but use existing data:

### 6. Reward Rate Components Breakdown
**Files:** `YieldHero.tsx`, `YieldStats.tsx`, new tooltip component
- Data: `rewardRate.components[]` has `{ rate, token, yieldSource, description }`
- Display: Tooltip or expandable section showing multi-token yield breakdown
- Example: "8.5% APY = 7% ETH + 1.5% COMP rewards"

### 7. Fee Structure Display
**File:** `YieldHero.tsx`, `YieldStats.tsx`
- Data: `mechanics.possibleFeeTakingMechanisms`
  - `{ depositFee, managementFee, performanceFee, validatorRebates }`
- Display: Small badges/pills showing which fees apply
- Pattern: `{depositFee && <Badge>Deposit Fee</Badge>}`

### 8. Type Pills/Tags
**Files:** `YieldItem.tsx`, `YieldFilters.tsx`
- Data: `mechanics.type` (staking, lending, liquidity_pool)
- Display: Colored pill at top-left of card
- Colors: Green for lending, Blue for staking, Purple for LP

### 9. Cooldown/Lockup Period Warning
**File:** `YieldHero.tsx`, `YieldEnterModal.tsx`
- Data: `mechanics.cooldownPeriod?.seconds`
- Display: Warning text like "7-day unstaking period" before deposit
- Pattern: `<Alert status='info'>`

### 10. Entry Limits Display
**File:** `YieldEnterModal.tsx`
- Data: `mechanics.entryLimits` `{ minimum, maximum }`
- Already partially used for validation
- Make more prominent with visible text showing min/max

### 11. Documentation Links
**File:** `YieldHero.tsx`
- Data: `metadata.documentation` (URL string)
- Add: External link button/icon to strategy docs
- Pattern: `<IconButton as={Link} href={documentation} icon={<FaExternalLinkAlt />} />`

### 12. Capacity State Indicator
**Files:** `YieldItem.tsx`, `YieldHero.tsx`
- Data: `state?.capacityState` `{ current, max, remaining }`
- Display: Progress bar or "85% filled" indicator when near capacity
- Alert when `remaining` is low

---

## Larger Efforts (Significant Refactoring)

### 13. Pill-Style Filters
**File:** `src/pages/Yields/components/YieldFilters.tsx`
- Current: Standard Chakra `MenuButton` dropdowns
- Change: Rounded pill buttons with filled state when selected
- Pattern: Custom Button variant `rounded='full'` `bg={selected ? 'blue.500' : 'gray.700'}`

### 14. Featured/Handpicked Section
**Files:** `YieldsList.tsx`, new component
- No curation logic exists currently
- Options:
  a. Backend flag: Add `featured` field from API
  b. Frontend curation: Hardcode list of featured yield IDs
  c. Smart curation: Top 3 by user's held assets weighted by APY
- Display: Separate "Handpicked" card row above main list

### 15. Card Redesign for Grid View
**File:** `YieldItem.tsx` (card variant)
- Current: Flat dark cards with dense info
- Changes:
  - Add ambient glow/gradient background for high-APY cards
  - Restructure: Type pill top-left, Network badge top-right
  - APY as "hero stat" (larger, more prominent)
  - Quick action button (lightning icon) floating bottom-right

### 16. Detail Page 2-Column Layout (Desktop)
**File:** `YieldDetail.tsx`, `YieldHero.tsx`
- Current: Centered single-column layout
- Change: Left column (info/about), Right column (actions/position)
- Mobile: Stacked view (keep current)

---

## Critical Files Reference

| Component | Path | Purpose |
|-----------|------|---------|
| YieldsList | `src/pages/Yields/components/YieldsList.tsx` | Main list with tabs, filters |
| YieldItem | `src/pages/Yields/components/YieldItem.tsx` | Card/row renderer |
| YieldHero | `src/pages/Yields/components/YieldHero.tsx` | Detail page header |
| YieldStats | `src/pages/Yields/components/YieldStats.tsx` | Stats grid (TVL, type) |
| YieldFilters | `src/pages/Yields/components/YieldFilters.tsx` | Filter dropdowns |
| YieldOpportunityStats | `src/pages/Yields/components/YieldOpportunityStats.tsx` | Top dashboard cards |
| YieldEnterModal | `src/pages/Yields/components/YieldEnterModal.tsx` | Deposit modal |
| GradientApy | `src/pages/Yields/components/GradientApy.tsx` | APY gradient text |
| Types | `src/lib/yieldxyz/types.ts` | All yield data types |
| Translations | `src/assets/translations/en/main.json` | Text strings |

---

## Available but Unused Data Fields

These fields exist in the API response but are not currently displayed:

| Field | Type | Potential Use |
|-------|------|---------------|
| `metadata.documentation` | string | External docs link |
| `metadata.underMaintenance` | boolean | Warning banner |
| `metadata.deprecated` | boolean | Hide or warn |
| `rewardRate.components[]` | array | Multi-token yield breakdown |
| `mechanics.possibleFeeTakingMechanisms` | object | Fee badges |
| `mechanics.cooldownPeriod` | object | Lockup warning |
| `mechanics.entryLimits` | object | Min/max display |
| `statistics.uniqueUsers` | number | Social proof |
| `state.capacityState` | object | Capacity indicator |
| `tags[]` | array | Filtering/categorization |

---

## Mobile Considerations

Per the proposal, mobile should retain dense list layout:
- Quick Wins (#1-5) apply to both mobile and desktop
- Pill filters (#13) can work on mobile
- Grid redesign (#15) is desktop-only
- 2-column detail (#16) is desktop-only; mobile stays stacked
