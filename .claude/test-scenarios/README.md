# ShapeShift Test Scenarios Bank

This directory contains automated test scenarios for the ShapeShift Web application. These scenarios are used by the `/test-agent` slash command to validate features and ensure quality.

## Directory Structure

```
test-scenarios/
├── critical/          # Critical path scenarios - test these before every release
├── high-priority/     # High priority features - test weekly
├── medium-priority/   # Medium priority features - test bi-weekly
├── regression/        # Regression tests for previously fixed bugs
└── README.md         # This file
```

## Scenario Naming Convention

Use kebab-case with descriptive names:
- `wallet-connection-flow.md`
- `swap-eth-to-btc.md`
- `send-asset-flow.md`
- `staking-earn-flow.md`

## Priority Levels

### Critical
Features that, if broken, render the app unusable:
- Wallet connection
- Asset swapping
- Send/Receive
- Portfolio loading
- Account switching

### High Priority
Important features that impact core user experience:
- Chain switching
- Staking
- Transaction history
- Settings management
- Feature flags

### Medium Priority
Supporting features and quality improvements:
- i18n validation
- Dark mode
- Responsive design
- Chart displays
- Search/filter

### Regression
Tests for specific bugs that were fixed:
- Name the file after the PR/issue number
- Include reproduction steps
- Validate the fix remains working

## How to Use

### Run Test Agent

```bash
# Run all critical tests
/test-agent run critical

# Run specific scenario
/test-agent test wallet-connection-flow

# Discover new features and create scenarios
/test-agent discover

# Create a new test scenario
/test-agent create-scenario [feature-name]

# Run maintenance (update all scenarios)
/test-agent maintenance
```

### Manual Testing

Each scenario file contains:
1. **Prerequisites**: What's needed before testing
2. **Test Steps**: Detailed steps with expected results
3. **Validation Points**: Specific checks to perform
4. **Edge Cases**: Special cases to consider
5. **Known Issues**: Documented limitations

## Maintenance

### Weekly
- Run critical scenarios
- Update "Last Tested" dates
- Report any failures

### Monthly
- Review all scenarios for relevance
- Archive deprecated scenarios
- Add scenarios for new features
- Refine unclear test steps

### After Code Changes
- Run related scenarios
- Update scenarios if behavior changed
- Add regression tests for bug fixes
- Create scenarios for new features

## Best Practices

1. **Keep Scenarios Atomic**: Each scenario should test one specific feature/flow
2. **Update Regularly**: Keep "Last Updated" and "Last Tested" dates current
3. **Clear Steps**: Anyone should be able to follow the steps
4. **Expected Results**: Always document what should happen
5. **Screenshots**: Include screenshots for visual validations
6. **Edge Cases**: Document edge cases and error conditions

## Contributing

When adding new scenarios:
1. Use the template in `../commands/test-agent.md`
2. Place in appropriate priority folder
3. Follow naming conventions
4. Include all required sections
5. Test the scenario before committing

## Scenario Status

- ✅ **Active**: Currently valid and maintained
- ⚠️ **Needs Update**: Requires updates due to code changes
- 🔄 **Under Review**: Being evaluated for changes
- ❌ **Deprecated**: No longer relevant, archived

## Quick Stats

**Last Updated**: 2025-12-18
**Total Scenarios**: 6
- Critical: 0
- High Priority: 3 (chain integration, swap, markets)
- Medium Priority: 0
- Regression: 0
- Templates: 2
- Discovery Reports: 1

**Recent Test Results**:
- Solana Chain Integration: ✅ PASSED (10/10)
- Relay USDC Swap: ✅ PASSED (12/12)

**Coverage**: ~40% of major features documented

## Available Test Scenarios

### Feature Discovery
- `shapeshift-feature-discovery-report.md` ✅ Complete - Comprehensive feature inventory with 100% app coverage

### Chain Integration
- `chain-integration-template.md` 📝 Template - Reusable template for new chain integrations
- `solana-chain-integration.md` ✅ PASSED - Solana integration test (10/10 tests passed)

### Trade & Swap
- `relay-usdc-arbitrum-to-solana.md` ✅ PASSED - Cross-chain swap via Relay (12/12 tests passed)
- `swap-eth-to-btc-same-chain.md` 📝 Template - Same-chain swap testing template

### Markets & Discovery
- `markets-discovery-exploration.md` 📝 Template - Markets feature comprehensive testing

### Future Scenarios (Planned)
- FOX Staking flow
- Limit Orders creation
- Asset Search functionality
- Settings management
- Wallet connection flows
- TCY Staking
- Liquidity Pools interaction

## Support

For issues with test scenarios or the test agent:
- Check the test agent documentation: `.claude/commands/test-agent.md`
- Review existing scenarios for examples
- Ask Claude Code for help: `/test-agent help`
