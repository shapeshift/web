## Testing

Bug fixes and features should always come with tests.

### Testing Tools

- Unit - test both frontend code in isolation
  - [vitest](https://vitest.dev/guide/), [react testing library](https://testing-library.com/docs/react-testing-library/intro/), [react testing library](https://testing-library.com/docs/react-testing-library/api/#renderhook)
- Workflows - tools and libraries for GitHub Workflows or any DevOps processes
  - [act](https://github.com/nektos/act) - Emulates GitHub Workflows virtual environment via Docker containers.

### Testing UI Business Logic

Separate the business logic from the view as much as possible. Create hooks, helpers & reducers to utilize this logic from the UI and test that code in isolation from its UI.

# Unit Testing

This is an example of how we structure our unit tests.

```js
import mockAxios from 'axios'
import { isLoggedIn } from './isLoggedIn'
import { describe, it, expect } from 'vitest'

const UserData = { id: 1, name: 'UserName' }

const mockUserData = id => {
  mockAxios.get.mockImplementationOnce(() => Promise.resolve(id ? data : undefined))
}

describe('isLoggedIn', () => {
  describe('isLoggedIn', () => {
    it('should return true when passed a userId', () => {
      const userId = 1
      mockUserData(userId)
      expect(isLoggedIn(userId)).toBe(true)
    })

    it('should return false when userId is undefined', () => {
      const userId = undefined
      mockUserData(userId)
      expect(isLoggedIn(userId)).toBe(false)
    })
  })
})
```

# Hook Testing

This is an example of how we structure our hook tests.

```js
import { renderHook } from '@testing-library/react'
import { useIsComponentMounted } from './useIsComponentMounted'

const setup = () => {
  return renderHook(() => useIsComponentMounted())
}
describe('useIsComponentMounted hook', () => {
  it('should be true on render', () => {
    const { result } = setup()
    expect(result.current.current).toBe(true)
  })

  it('should false on unmount', () => {
    const { result, unmount } = setup()
    unmount()
    expect(result.current.current).toBe(false)
  })
})
```

### Workflow Testing

Requirements: 
- [act](https://github.com/nektos/act) - `brew install act`
  - Requires [Docker Desktop](https://docs.docker.com/get-docker/)
- [GitHub Personal Access Token](https://docs.github.com/en/actions/security-guides/automatic-token-authentication) - via GitHub Settings

Example command to test a GitHub action locally:
```sh
# run from project root
act -s GITHUB_TOKEN=$GITHUB_TOKEN -j <job-name> --reuse
```

**NOTE:** there are two parameters set in the project's root `.actrc` file.

Two important flags that can be passed to the `act` command:
- `--reuse` - persist state across runs
- `--rm` - remove container on failure

## Swapper Integration Testing

For PRs related to swapper integrations, swapper behavior changes, or quote aggregation, **actual swap execution testing is required** to ensure production readiness.

### When Swap Execution Testing is Required

Execute actual swaps when the PR involves:

1. **New Swapper Integration**: Adding support for a new DEX aggregator, bridge, or swapper
   - Examples: Integrating Bebop, Portals, Jupiter, 0x, 1inch, Relay, Cetus, etc.

2. **Swapper Behavior Changes**: Modifying existing swapper logic
   - Fee calculation changes
   - Quote fetching modifications
   - Route optimization updates
   - Slippage tolerance adjustments

3. **Chain Adapter Modifications**: Changes to chain adapters affecting swap flows
   - New chain support for swaps
   - Gas estimation changes
   - Transaction building modifications

4. **Quote Aggregation Changes**: Updates to how quotes are fetched, sorted, or presented
   - Multi-swapper aggregation logic
   - Quote filtering/sorting algorithms
   - Rate calculation modifications

### Testing Requirements

#### Minimum Testing Scope

For each swapper-related PR, execute **at least 2 successful swaps**:

1. **Primary swap direction**: Test the main use case
   - Example: ETH → USDC on the new swapper

2. **Secondary swap direction**: Test reverse or alternative route
   - Example: USDC → ETH or ETH → BTC

#### Comprehensive Testing Checklist

- [ ] **Quote Accuracy**: Verify quoted rates match executed rates (within acceptable slippage)
- [ ] **Balance Updates**: Confirm source and destination balances update correctly post-swap
- [ ] **Fee Estimation**: Validate transaction fees match estimates
- [ ] **Transaction Completion**: Ensure swaps complete successfully with proper notifications
- [ ] **Error Handling**: Test edge cases (insufficient balance, no routes, etc.)
- [ ] **Multi-chain Support**: For cross-chain swappers, test bridge functionality
- [ ] **Price Impact**: Verify price impact calculations are accurate
- [ ] **Slippage Tolerance**: Test swaps near slippage limits

### Testing Methodology

#### Local Development Testing

```bash
# 1. Start local development environment
yarn dev

# 2. Use browser automation (Playwright) or manual testing
# Connect wallet and execute test swaps

# 3. Document results in PR comment
```

#### Required Test Documentation

Include the following in your PR:

```markdown
## Swap Execution Test Results

### Test 1: [Asset A] → [Asset B]

**Setup**:
- Direction: [Asset A] → [Asset B]
- Amount: [amount]
- Protocol: [swapper name]

**Pre-Swap Balances**:
- [Asset A]: [balance]
- [Asset B]: [balance]

**Quote Details**:
- Expected output: [amount]
- Exchange rate: [rate]
- Fee: [fee]
- Price impact: [%]

**Execution**: ✅ Success / ❌ Failed
- Transaction hash: [hash]
- Block explorer: [link]

**Post-Swap Balances**:
- [Asset A]: [balance] (change: [delta])
- [Asset B]: [balance] (change: [delta])

**Verification**:
- ✅/❌ Quote accuracy
- ✅/❌ Balance updates
- ✅/❌ Fee estimation
- ✅/❌ Transaction notification

**Notes**: [any observations]
```

### Testing Best Practices

1. **Use Testnet When Possible**: Prefer testnets for initial validation, but include at least 1 mainnet swap for production verification
2. **Document Edge Cases**: Note any limitations, directional liquidity issues, or unsupported routes
3. **Test Multiple Amounts**: Small, medium, and large swaps may have different behaviors
4. **Monitor Console Errors**: Document any errors or warnings during swap execution
5. **Verify UI/UX**: Ensure loading states, notifications, and error messages display correctly

### Example Test Reports

See `.playwright-mcp/swap-execution-test-report.md` for comprehensive testing examples.

### Automated Testing (Future)

While manual swap execution is currently required, we aim to automate this with:
- Playwright end-to-end tests
- Mock swapper responses for unit tests
- Testnet automation for CI/CD pipelines
