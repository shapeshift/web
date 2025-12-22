# Test Scenario: Feature Flags Validation

**Feature**: Feature flag system functionality
**Priority**: High
**Last Updated**: 2025-01-18
**Last Tested**: Not yet tested
**Status**: Active

## Prerequisites

- Dev server running on `localhost:3000`
- Clean browser session (no cached flags)
- Knowledge of active feature flags in codebase

## Test Steps

### 1. Access Feature Flags Panel

**Action**: Navigate to app, then access hidden flags panel
**Expected Result**: Feature flags UI opens

**Browser MCP Command**:
```javascript
// Navigate to home
browser_navigate({ url: "http://localhost:3000" })

// Open settings modal (click settings icon)
browser_click({ element: "Settings button", ref: "..." })

// Click settings modal header 5 times to reveal flags
// (This is the secret gesture to access /flags)
```

**Alternative**: Navigate directly to `http://localhost:3000/flags`

**Validation Points**:
- [ ] Feature flags panel accessible
- [ ] List of all feature flags displayed
- [ ] Current state (on/off) shown for each flag
- [ ] Toggle switches functional
- [ ] No console errors opening panel

### 2. Identify Active Flags

**Action**: Review list of feature flags
**Expected Result**: All flags from code are listed

**Validation Points**:
- [ ] Each flag has descriptive name
- [ ] Current value displayed (true/false)
- [ ] Default values match environment variables
- [ ] No missing flags from `preferencesSlice.ts`

### 3. Toggle Flag On

**Action**: Select a disabled feature flag, toggle it on
**Expected Result**: Flag enables, feature becomes available

**Validation Points**:
- [ ] Toggle switch updates visually
- [ ] Redux state updates immediately
- [ ] Feature UI appears/enables without page refresh
- [ ] No console errors on toggle
- [ ] Flag state persists during session

### 4. Verify Feature Functionality

**Action**: Use the newly enabled feature
**Expected Result**: Feature works as expected

**Validation Points**:
- [ ] Feature fully functional
- [ ] No errors related to flag state
- [ ] Feature integrates properly with app
- [ ] Redux selectors return correct value

### 5. Toggle Flag Off

**Action**: Toggle the same flag back off
**Expected Result**: Feature hides/disables

**Validation Points**:
- [ ] Toggle switch updates visually
- [ ] Redux state updates immediately
- [ ] Feature UI hides/disables without page refresh
- [ ] No console errors on toggle
- [ ] Graceful degradation if feature was in use

### 6. Test Flag Persistence (Session Only)

**Action**: Toggle flags, then refresh page
**Expected Result**: Flags reset to environment defaults

**Validation Points**:
- [ ] After refresh, flags return to `.env` values
- [ ] No flags persisted in localStorage
- [ ] Redux state reinitializes from config
- [ ] This confirms flags NOT persisted (by design)

### 7. Test Multiple Flag Combinations

**Action**: Enable multiple related flags
**Expected Result**: Features work together correctly

**Test Combinations**:
- Multiple chain flags (e.g., Tron + Sui)
- Multiple feature flags that interact
- All flags on
- All flags off

**Validation Points**:
- [ ] No conflicts between flags
- [ ] Features compose correctly
- [ ] No unexpected side effects
- [ ] Performance remains acceptable

### 8. Verify Environment Variable Integration

**Action**: Check flag defaults match environment
**Expected Result**: Flags initialize from `.env` correctly

**Validation Points**:
- [ ] Dev environment: Check `.env.development` values match
- [ ] Production environment: Would match `.env.production`
- [ ] Each flag has `VITE_FEATURE_*` env var
- [ ] Config validation in `src/config.ts` works

### 9. Test Flag-Gated UI Elements

**Action**: Navigate to pages with flag-gated features
**Expected Result**: UI responds to flag state

**Common Flag-Gated Features**:
- New chain support (check asset list)
- Experimental swap features
- Beta features in settings
- Dashboard widgets

**Validation Points**:
- [ ] When flag off: UI hidden or disabled
- [ ] When flag on: UI visible and functional
- [ ] Transitions smooth (no flash of content)
- [ ] No errors in console for either state

### 10. Test useFeatureFlag Hook

**Action**: Verify hook usage in components
**Expected Result**: Hook returns correct boolean

**Validation Points** (via browser console):
```javascript
// Check Redux state
window.store.getState().preferences.featureFlags

// Verify specific flag
window.store.getState().preferences.featureFlags.MyFlag
```

- [ ] Hook returns boolean
- [ ] Hook updates on flag change
- [ ] Components re-render appropriately

## Edge Cases

### Flag Toggle During Feature Use
- Enable feature, start using it
- Disable flag while feature active
- Should handle gracefully (close modal, disable feature, etc.)

### Flag Toggle Rapid Succession
- Toggle flag on/off repeatedly quickly
- Should not cause errors or race conditions
- State should be consistent

### Missing Environment Variable
- Flag exists in code but not in `.env`
- Should use fallback default (usually `false`)
- Should log warning (check console)

### New Flag Without Migration
- Adding new flag to existing slice
- Should not break existing state
- Should initialize with default value

## Known Issues

- Feature flags are not persisted between sessions (by design)
- Flags reset on page refresh
- No way to persist specific flag states without modifying `.env`

## Screenshots

- `screenshots/feature-flags/flags-panel.png`
- `screenshots/feature-flags/flag-enabled.png`
- `screenshots/feature-flags/flag-disabled.png`

## Related Scenarios

- `redux-state-persistence.md`
- `chain-switching-flow.md`
- Any feature that uses flags

## Development Notes

### Adding New Feature Flag

When developers add new flags, verify:

1. **Type Definition** (`preferencesSlice.ts`):
```typescript
type FeatureFlags = {
  // ...
  MyNewFlag: boolean
}
```

2. **Config Validation** (`config.ts`):
```typescript
VITE_FEATURE_MY_NEW_FLAG: bool({ default: false })
```

3. **Initial State** (`preferencesSlice.ts`):
```typescript
featureFlags: {
  // ...
  MyNewFlag: getConfig().VITE_FEATURE_MY_NEW_FLAG
}
```

4. **Test Mock** (`test/mocks/store.ts`):
```typescript
featureFlags: {
  // ...
  MyNewFlag: false
}
```

5. **Environment Files**:
- `.env.development`: `VITE_FEATURE_MY_NEW_FLAG=true`
- `.env.production`: `VITE_FEATURE_MY_NEW_FLAG=false`

## Testing Checklist

For each feature flag:
- [ ] Flag appears in `/flags` panel
- [ ] Toggle works without errors
- [ ] Feature shows/hides appropriately
- [ ] useFeatureFlag hook works
- [ ] Redux state correct
- [ ] Environment variable integration works
- [ ] No persistence between sessions
- [ ] No console errors or warnings

## Notes

Feature flags are critical for progressive rollout and A/B testing. They allow features to be shipped to production but kept hidden until ready.

The non-persistence is intentional - flags are session-only runtime toggles for testing. Production behavior is controlled by environment variables deployed with the app.
