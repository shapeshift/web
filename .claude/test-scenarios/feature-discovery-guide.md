# Feature Discovery Guide

This guide helps the test agent systematically discover and document features in the ShapeShift Web application.

## Discovery Process

### 1. Initial Application Scan

Start by navigating to the application and capturing the main navigation structure:

```
/test-agent discover
```

**Steps**:
1. Navigate to `http://localhost:3000`
2. Take snapshot of initial page
3. Document main navigation items
4. Document visible features/sections

**Areas to Document**:
- Header/Navigation items
- Main content sections
- Footer links
- Wallet connection state
- Any modals or overlays

### 2. Navigation Tree Discovery

Map out all accessible routes:

**Main Routes** (from navigation):
- `/` - Dashboard/Home
- `/trade` - Swap/Trade
- `/earn` - Staking/Earning opportunities
- `/send` - Send assets
- `/receive` - Receive assets
- `/buy` - Fiat on-ramp
- `/transactions` - Transaction history
- `/settings` - User settings
- `/flags` - Feature flags (hidden)

**Dynamic Routes**:
- `/assets/:assetId` - Asset detail pages
- `/trade/:pair` - Specific trading pairs
- `/earn/:opportunityId` - Specific earn opportunities

### 3. Feature Categorization

Organize discovered features into categories:

#### Core Trading Features
- Asset swapping (DEX aggregator)
- Limit orders (if available)
- Cross-chain swaps
- Quote comparison
- Slippage settings
- MEV protection

#### Portfolio Management
- Multi-wallet support
- Portfolio overview
- Asset balances
- NFT display (if supported)
- Historical performance
- Asset allocation charts

#### Earning Features
- Staking
- Liquidity provision
- Yield farming
- Lending (if available)
- Rewards claiming

#### Wallet Features
- Wallet connection/disconnection
- Account switching
- Chain switching
- Address book
- Transaction signing
- Hardware wallet support (Ledger, Trezor)

#### Asset Management
- Send assets
- Receive assets (QR code, address)
- Buy crypto (fiat on-ramp)
- Asset search/filtering
- Asset details/info

#### Settings & Configuration
- Appearance (light/dark mode)
- Language selection (i18n)
- Currency preference
- Notification settings
- Privacy settings
- Feature flags

#### Information & Support
- Transaction history
- Activity feed
- Price charts
- Market data
- Help/Documentation
- Social links

### 4. Feature Flag Discovery

Check for feature-flagged features:

1. Navigate to `/flags`
2. Document all available flags
3. For each flag:
   - Test with flag ON
   - Test with flag OFF
   - Document what changes
   - Create test scenario if needed

### 5. Chain-Specific Features

Test features for each supported chain:

**Supported Chains** (check `ChainId` in codebase):
- Ethereum (ETH)
- Bitcoin (BTC)
- Cosmos (ATOM)
- Thorchain (RUNE)
- Polygon (MATIC)
- Avalanche (AVAX)
- Optimism (OP)
- Arbitrum (ARB)
- BNB Smart Chain (BSC)
- Base
- Gnosis
- And more...

**For Each Chain, Test**:
- Asset display
- Send/receive
- Swapping
- Staking (if available)
- Chain-specific features
- Network fees

### 6. Responsive Design Discovery

Test UI at different breakpoints:

**Breakpoints** (Chakra UI defaults):
- Mobile: < 480px
- Tablet: 768px - 991px
- Desktop: > 992px

**For Each Breakpoint**:
- Navigation changes (hamburger menu)
- Layout adjustments
- Hidden/visible elements
- Touch interactions (on mobile)

### 7. Accessibility Features

Document accessibility features:

- Keyboard navigation
- Screen reader compatibility
- Focus indicators
- ARIA labels
- Color contrast
- Alt text for images

### 8. External Integrations

Discover integrated services:

- DEX Aggregators (0x, 1inch, etc.)
- Price feeds (CoinGecko, etc.)
- Fiat on-ramps
- Analytics services
- Error tracking
- Wallet providers

## Documentation Template

For each discovered feature, create this structure:

```markdown
## Feature: [Feature Name]

**Location**: [Route/UI location]
**Category**: [Category from above]
**Priority**: [Critical | High | Medium | Low]
**Requires**: [Dependencies - wallet, specific chain, etc.]

### Description
[What the feature does]

### How to Access
1. [Step 1]
2. [Step 2]

### Key Functionality
- [Function 1]
- [Function 2]

### Test Scenario Exists?
- [ ] Yes - Link: [path to scenario]
- [ ] No - Needs creation

### Edge Cases to Consider
- [Edge case 1]
- [Edge case 2]

### Known Issues
- [Any known bugs or limitations]
```

## Discovery Checklist

Use this checklist when running feature discovery:

### Navigation & Routing
- [ ] All main nav items documented
- [ ] All sub-navigation discovered
- [ ] Dynamic routes identified
- [ ] 404 handling tested
- [ ] Redirects documented

### User Flows
- [ ] Wallet connection flows
- [ ] Asset management flows
- [ ] Trading flows
- [ ] Earning flows
- [ ] Settings flows

### UI Components
- [ ] Modals discovered
- [ ] Tooltips documented
- [ ] Dropdowns tested
- [ ] Forms identified
- [ ] Buttons cataloged
- [ ] Icons and imagery noted

### State Management
- [ ] Redux slices identified
- [ ] Persisted state documented
- [ ] Feature flags cataloged
- [ ] User preferences found

### Integrations
- [ ] API endpoints discovered
- [ ] External services identified
- [ ] Wallet providers listed
- [ ] Blockchain interactions noted

### Error States
- [ ] Error messages documented
- [ ] Loading states identified
- [ ] Empty states cataloged
- [ ] Network error handling tested

### Performance
- [ ] Slow operations identified
- [ ] Large data sets tested
- [ ] Image loading noted
- [ ] Bundle size checked

## Automated Discovery Script

Use browser MCP to automate discovery:

```javascript
// Pseudo-code for automated discovery

async function discoverFeatures() {
  // 1. Navigate to home
  await browser_navigate({ url: 'http://localhost:3000' })

  // 2. Take snapshot
  const homeSnapshot = await browser_snapshot()

  // 3. Extract navigation links
  const navLinks = extractLinks(homeSnapshot)

  // 4. For each link, navigate and document
  for (const link of navLinks) {
    await browser_click({ element: link.text, ref: link.ref })
    const snapshot = await browser_snapshot()

    // Document page structure
    documentPage({
      route: link.url,
      title: link.text,
      elements: snapshot.elements,
      interactions: snapshot.interactions
    })

    // Check for feature flags
    if (hasFeatureFlags(snapshot)) {
      await discoverFeatureFlags()
    }
  }

  // 5. Generate discovery report
  generateReport()
}
```

## Discovery Output

After discovery, generate:

1. **Feature Inventory** (`feature-inventory.md`)
   - Complete list of all features
   - Categorized and prioritized
   - Coverage status (has test scenario Y/N)

2. **Coverage Report** (`coverage-report.md`)
   - % of features with test scenarios
   - Gaps in testing coverage
   - Recommended scenarios to create

3. **New Test Scenarios**
   - Create scenarios for untested features
   - Prioritize by feature criticality

## Regular Discovery Schedule

### Daily
- Check for new feature flags
- Monitor console for new warnings/errors

### Weekly
- Quick navigation scan for UI changes
- Verify all critical flows still work

### Monthly
- Full feature discovery pass
- Update feature inventory
- Create scenarios for new features
- Archive deprecated features

### After Major Releases
- Complete re-discovery
- Update all documentation
- Verify all scenarios still valid

## Integration with Test Agent

To run automated discovery:

```bash
# Full discovery
/test-agent discover

# Discover specific area
/test-agent discover trade

# Discover and create scenarios
/test-agent discover --create-scenarios

# Update feature inventory
/test-agent discover --update-inventory
```

## Tips for Effective Discovery

1. **Start Broad, Then Deep**: First map all top-level features, then dive into details
2. **Document as You Go**: Don't rely on memory, document immediately
3. **Screenshot Everything**: Visual documentation is invaluable
4. **Test Edge Cases**: Don't just happy path - try to break things
5. **Compare Against Code**: Cross-reference discoveries with codebase
6. **Ask Questions**: If unsure about a feature's purpose, investigate
7. **Track Changes**: Note when features change between discoveries

## Common Discovery Pitfalls

- **Missing Hidden Features**: Remember `/flags` and easter eggs
- **Ignoring Error States**: Test error conditions, not just success
- **Skipping Mobile**: Mobile UI can be very different
- **Forgetting Permissions**: Some features require specific permissions
- **Not Testing All Chains**: Features vary by blockchain
- **Overlooking Integrations**: External services are part of the app

## Success Metrics

You've completed thorough discovery when:
- [ ] All routes documented
- [ ] All feature flags cataloged
- [ ] Test coverage map created
- [ ] Gaps identified and prioritized
- [ ] New scenarios created for critical gaps
- [ ] Feature inventory up to date
- [ ] Discovery report generated

---

This guide should be updated as the application evolves and new discovery patterns emerge.
