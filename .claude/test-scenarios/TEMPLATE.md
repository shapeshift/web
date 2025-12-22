# Test Scenario: [Feature Name]

**Feature**: [Brief description of what this feature does]
**Priority**: [Critical | High | Medium | Low]
**Last Updated**: [YYYY-MM-DD]
**Last Tested**: [YYYY-MM-DD or "Not yet tested"]
**Status**: [Active | Needs Update | Deprecated | Under Review]

## Prerequisites

- Dev server running on `localhost:3000`
- [Other prerequisite 1]
- [Other prerequisite 2]
- [Required wallet state, test data, etc.]

## Test Steps

### 1. [Step Name]

**Action**: [What action to perform]
**Expected Result**: [What should happen]

**Browser MCP Command** (if applicable):
```javascript
// Example browser command
browser_click({ element: "Button text", ref: "..." })
```

**Validation Points**:
- [ ] [Specific check 1]
- [ ] [Specific check 2]
- [ ] [Specific check 3]

### 2. [Next Step Name]

**Action**: [What to do next]
**Expected Result**: [What should happen]

**Validation Points**:
- [ ] [Check 1]
- [ ] [Check 2]

### 3. [Continue for all steps...]

**Action**:
**Expected Result**:

**Validation Points**:
- [ ]

## Edge Cases

### [Edge Case 1 Name]
- **Scenario**: [Description]
- **Expected Behavior**: [What should happen]
- **Test Steps**: [How to test this edge case]

### [Edge Case 2 Name]
- **Scenario**:
- **Expected Behavior**:
- **Test Steps**:

## Known Issues

- [Known issue 1 - include severity and impact]
- [Known issue 2]
- None currently documented

## Screenshots

- `screenshots/[feature-name]/[scenario-name]-step1.png`
- `screenshots/[feature-name]/[scenario-name]-step2.png`
- `screenshots/[feature-name]/error-state.png`

## Related Scenarios

- `[related-scenario-1].md` - [Brief description of relationship]
- `[related-scenario-2].md`

## Notes

[Any additional context, tips, or important information about this test scenario]

---

## Scenario Metadata (for Test Agent)

**Estimated Duration**: [X minutes]
**Automation Level**: [Full | Partial | Manual]
**Dependencies**: [List of other scenarios that should pass first]
**Tags**: [tag1, tag2, tag3] (e.g., wallet, trading, staking, ui, api)

## Revision History

- **[YYYY-MM-DD]**: Initial creation - [Your name]
- **[YYYY-MM-DD]**: Updated step 3 validation points - [Your name]
- **[YYYY-MM-DD]**: Added edge case for network errors - [Your name]
