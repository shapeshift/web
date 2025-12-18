# Test Agent Quick Start Guide

Get started with automated testing for ShapeShift Web in 5 minutes!

## Prerequisites

1. **Browser MCP installed** - Follow setup in main README
2. **Dev server running** - `yarn dev` in terminal
3. **Claude Code** - Ready to accept slash commands

## Quick Commands

### Run Your First Test

```bash
/test-agent run critical
```

This runs all critical test scenarios (wallet connection, swap flow, etc.)

### Test a Specific Feature

```bash
# Test wallet connection
/test-agent test wallet-connection-flow

# Test swap functionality
/test-agent test asset-swap-flow

# Test feature flags
/test-agent test feature-flags-validation
```

### Discover New Features

```bash
/test-agent discover
```

This automatically explores the app and documents what it finds.

### Create a New Test Scenario

```bash
/test-agent create-scenario send-asset-flow
```

Creates a new test scenario file with template.

## What Gets Tested?

### Critical Scenarios ⚠️
Must pass before any release:
- Wallet connection/disconnection
- Asset swapping
- Send/receive assets
- Portfolio loading
- Chain switching

### High Priority Scenarios 📊
Test weekly:
- Staking flows
- Transaction history
- Settings changes
- Feature flags
- Account switching

### Medium Priority Scenarios ✅
Test bi-weekly:
- i18n validation
- Dark mode
- Responsive design
- Asset search
- Chart displays

## Understanding Test Results

### ✅ Test Passed
```
✅ wallet-connection-flow
   - All validation points passed
   - No console errors
   - Screenshots saved
```

### ❌ Test Failed
```
❌ asset-swap-flow
   - Issue: Quote failed to load
   - Expected: Destination amount calculated
   - Actual: Loading spinner stuck
   - Screenshot: test-results/swap-error-2025-01-18.png
```

### ⚠️ Test Warning
```
⚠️ feature-flags-validation
   - Warning: Slow response time (5s)
   - All checks passed but performance concern
```

## Test Scenario Structure

Each test scenario includes:

1. **Prerequisites** - What you need before starting
2. **Test Steps** - Detailed steps with expected results
3. **Validation Points** - Specific checks to perform
4. **Edge Cases** - Special scenarios to test
5. **Screenshots** - Visual documentation

## Creating Your First Custom Scenario

1. **Identify Feature**: What do you want to test?
2. **Use Template**: Run `/test-agent create-scenario [name]`
3. **Fill In Details**:
   - Prerequisites
   - Step-by-step instructions
   - Expected outcomes
   - Edge cases
4. **Test It**: Run `/test-agent test [name]`
5. **Refine**: Update based on results

## Best Practices

### DO ✅
- Run critical tests before merging PRs
- Update scenarios when features change
- Document edge cases you discover
- Take screenshots of failures
- Keep test steps clear and simple

### DON'T ❌
- Skip prerequisites
- Ignore warnings
- Test with real funds
- Forget to update "Last Tested" dates
- Leave broken scenarios unfixed

## Common Issues

### "Dev server not running"
```bash
# Start dev server first
yarn dev

# Then run test
/test-agent run critical
```

### "Browser MCP not responding"
```bash
# Restart Claude Code
# Verify browser MCP installed in config
```

### "Test scenario not found"
```bash
# List available scenarios
ls .claude/test-scenarios/critical/
ls .claude/test-scenarios/high-priority/

# Use exact filename without .md
/test-agent test wallet-connection-flow
```

### "Screenshot failed to save"
```bash
# Create screenshots directory
mkdir -p screenshots/test-results
```

## Example: Testing After Code Change

You just modified the swap flow. Here's what to do:

```bash
# 1. Start dev server if not running
yarn dev

# 2. Run swap-related tests
/test-agent test asset-swap-flow

# 3. If it passes, run related scenarios
/test-agent test asset-approval-flow
/test-agent test transaction-history

# 4. Before PR, run all critical tests
/test-agent run critical
```

## Reading Test Reports

Test reports are generated in this format:

```
## Test Execution Report

**Date**: 2025-01-18 14:30:00
**Branch**: feat/improve-swap-ui
**Scenarios Tested**: 5

### ✅ Passed (4)
- wallet-connection-flow - All checks passed
- asset-swap-flow - Quote loading improved
- feature-flags-validation - All flags work
- portfolio-loading - Fast load times

### ❌ Failed (1)
- send-asset-flow
  - **Issue**: Gas estimation timeout
  - **Expected**: Gas fee displayed within 3s
  - **Actual**: Timeout after 10s
  - **Screenshot**: screenshots/send-gas-timeout.png
  - **Reproduction**:
    1. Connect wallet
    2. Navigate to /send
    3. Select ETH
    4. Enter amount > 0.1 ETH
    5. Wait for gas estimation (times out)

### 🐛 Bugs Found
- Gas estimation fails for large ETH amounts
  - **Severity**: High
  - **Impact**: Users cannot send large amounts
  - **Fix needed**: Increase timeout or improve gas API
```

## Integration with CI/CD

Future enhancement: Run tests automatically on PR creation

```yaml
# .github/workflows/test-agent.yml (example)
name: Automated Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install deps
        run: yarn install
      - name: Start dev server
        run: yarn dev &
      - name: Run critical tests
        run: /test-agent run critical --ci
```

## Maintenance Schedule

### Daily (if actively developing)
- Run tests for features you modified
- Update scenarios if behavior changed

### Weekly
- Run full critical suite
- Check for new console errors
- Update feature flag list

### Monthly
- Full discovery pass
- Create scenarios for untested features
- Archive deprecated scenarios
- Review and improve existing scenarios

## Getting Help

### In Claude Code
```bash
# Get help
/test-agent help

# Show available scenarios
/test-agent list

# Show scenario details
/test-agent info wallet-connection-flow
```

### Documentation
- **Full Agent Docs**: `.claude/commands/test-agent.md`
- **Test Scenarios**: `.claude/test-scenarios/README.md`
- **Discovery Guide**: `.claude/test-scenarios/feature-discovery-guide.md`

## Next Steps

1. **Run your first test**: `/test-agent test wallet-connection-flow`
2. **Explore scenarios**: `ls .claude/test-scenarios/critical/`
3. **Create custom scenario**: For a feature you're working on
4. **Set up routine**: Decide when to run tests (PR, daily, weekly)
5. **Improve coverage**: Add scenarios for untested features

## Quick Reference Card

```
╔═══════════════════════════════════════════════════════╗
║             TEST AGENT QUICK REFERENCE                ║
╠═══════════════════════════════════════════════════════╣
║ COMMANDS                                              ║
║ /test-agent run critical     → Run critical tests    ║
║ /test-agent test [name]      → Run specific test     ║
║ /test-agent discover         → Find features         ║
║ /test-agent create-scenario  → New scenario          ║
║ /test-agent maintenance      → Update all            ║
║                                                       ║
║ LOCATIONS                                             ║
║ .claude/test-scenarios/      → All scenarios         ║
║ .claude/commands/            → Agent config          ║
║ screenshots/                 → Test screenshots      ║
║                                                       ║
║ PRIORITIES                                            ║
║ ⚠️  Critical     → Must pass before release          ║
║ 📊 High         → Test weekly                        ║
║ ✅ Medium       → Test bi-weekly                     ║
║                                                       ║
║ WORKFLOW                                              ║
║ 1. yarn dev                  → Start server          ║
║ 2. /test-agent test [name]   → Run test              ║
║ 3. Review results            → Check pass/fail       ║
║ 4. Fix issues                → If any failures       ║
║ 5. Update scenario           → If behavior changed   ║
╚═══════════════════════════════════════════════════════╝
```

---

**Ready to start testing?** Run your first test now:

```bash
/test-agent test wallet-connection-flow
```

Happy testing! 🧪
