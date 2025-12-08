# Common Gotchas & Bugs to Avoid

Critical bugs discovered during previous swapper integrations. **Read this before implementing** to avoid repeating these mistakes!

---

## 1. Slippage Format Bug ⚠️⚠️⚠️

**Problem**: Passing incorrect slippage values to API, causing transactions to fail or use wrong slippage.

**Real Example** (Bebop):
- Sent `slippage=100` (API interpreted as 100%)
- Should have sent `slippage=1` (for 1%)
- Bug: Multiplied by 10000 instead of 100

**Root Cause**: Different APIs expect different formats:
- **Percentage**: `1` means 1% (Bebop, some others)
- **Decimal**: `0.01` means 1% (some APIs)
- **Basis Points**: `100` means 1% (some APIs)

**Solution**: **Check API documentation first!**

```typescript
// ShapeShift internal format: decimal (0.01 = 1%)
const slippageTolerancePercentageDecimal = 0.005 // 0.5%

// If API expects PERCENTAGE (1 = 1%):
const slippagePercentage = bn(slippageTolerancePercentageDecimal)
  .times(100)  // 0.005 * 100 = 0.5
  .toNumber()

// If API expects DECIMAL (0.01 = 1%):
const slippageDecimal = bn(slippageTolerancePercentageDecimal).toNumber()

// If API expects BASIS POINTS (100 = 1%):
const slippageBps = bn(slippageTolerancePercentageDecimal)
  .times(10000)  // 0.005 * 10000 = 50
  .toNumber()
```

**Test**: Send a test request and verify the slippage in the response matches your expectation!

**Affected Files**: `utils/fetchFrom[SwapperName].ts`

---

## 2. Response Structure Parsing Bug ⚠️⚠️

**Problem**: Accessing properties that don't exist in API response, causing runtime errors or showing $0 amounts in UI.

**Real Example** (Bebop):
```typescript
// WRONG - Assumed this structure:
const sellAmount = response.amounts.sell[0]  // Property doesn't exist!

// CORRECT - After checking actual response:
const sellTokenAddress = Object.keys(response.sellTokens)[0]
const sellAmount = response.sellTokens[sellTokenAddress].amount
```

**Solution**:
1. **Log the entire response** when developing:
   ```typescript
   console.log('API Response:', JSON.stringify(response, null, 2))
   ```
2. **Verify structure** matches your code
3. **Define TypeScript types** that match reality

**Affected Files**:
- `get[SwapperName]TradeQuote.ts`
- `get[SwapperName]TradeRate.ts`

---

## 3. Address Checksumming Bug ⚠️⚠️

**Problem**: API requires EIP-55 checksummed addresses but receives lowercase, causing API errors.

**Error Message**: `"Taker/Receiver addresses not checksummed"` or `"Invalid address format"`

**Real Example**:
```typescript
// WRONG
takerAddress: '0x5daf...'  // Lowercase from wallet

// RIGHT
import { getAddress } from 'viem'
takerAddress: getAddress('0x5daf...')  // Returns '0x5daF...'
```

**Solution**: Always checksum addresses before sending to API:
```typescript
import { getAddress } from 'viem'

const checksummedTakerAddress = getAddress(takerAddress)
const checksummedReceiverAddress = getAddress(receiverAddress)
```

**Test**: Some APIs silently accept lowercase but return errors later. Always checksum proactively.

**Affected Files**: `utils/fetchFrom[SwapperName].ts`

---

## 4. Hex Value Conversion Bug ⚠️⚠️

**Problem**: API returns hex strings (like `0x894656a67289`), but code expects decimal strings.

**Error**: `Number '0x894656a67289' is not a valid decimal number`

**Real Example** (Bebop):
```typescript
// WRONG - Passing hex directly
const value = quote.tx.value  // '0x894656a67289'
buildTx({ value })  // TypeError!

// RIGHT - Convert hex to decimal
import { fromHex } from 'viem'
import type { Hex } from 'viem'

const value = fromHex(quote.tx.value as Hex, 'bigint').toString()
// '150935194464905'
```

**Common hex fields**:
- `tx.value`
- `tx.gas`
- `tx.gasPrice`
- Sometimes token amounts

**Solution**:
```typescript
import { fromHex } from 'viem'
import type { Hex } from 'viem'

const gasLimit = quote.tx.gas
  ? fromHex(quote.tx.gas as Hex, 'bigint').toString()
  : '0'
```

**Affected Files**:
- `endpoints.ts`
- `get[SwapperName]TradeQuote.ts`

---

## 5. Error Handling Bug (Partial Route Failures) ⚠️

**Problem**: Rejecting entire quote when some routes fail, even though other routes succeeded.

**Real Example** (Bebop with dual routing):
```json
{
  "routes": [
    { "type": "PMMv3", "quote": { "status": "Success", ... } },
    { "type": "JAMv2", "quote": null }
  ],
  "errors": { "JAMv2": { "message": "Insufficient liquidity" } },
  "bestPrice": "PMMv3"
}
```

**WRONG**:
```typescript
if (response.errors && Object.keys(response.errors).length > 0) {
  return Err(/* fail entire quote */)  // BAD! PMMv3 worked!
}
```

**RIGHT**:
```typescript
// Log partial failures for debugging
if (response.errors && Object.keys(response.errors).length > 0) {
  console.debug('[Swapper] Some routes failed (this is normal):', response.errors)
}

// Only fail if NO valid routes
if (!response.routes || response.routes.length === 0) {
  return Err(makeSwapErrorRight({
    message: 'No routes available',
    code: TradeQuoteError.NoRouteFound
  }))
}
```

**Affected Files**: `utils/fetchFrom[SwapperName].ts`

---

## 6. Rate vs Quote Affiliate Fee Delta Bug ⚠️⚠️

**Problem**: Rate shows optimistic price, quote shows worse price, surprising users.

**Real Example**:
- **Rate**: 0.600 USDC per token
- **Quote**: 0.596 USDC per token
- **Delta**: ~0.6% surprise!

**Root Cause**:
```typescript
// In fetchPrice (rate endpoint)
affiliateBps: '0'  // Hardcoded!

// In fetchQuote (quote endpoint)
affiliateBps: '85'  // Actual fee
```

**Result**: Rate doesn't include affiliate fees, quote does → delta.

**Solution**: Pass the same `affiliateBps` to **BOTH** endpoints:
```typescript
export const fetchPrice = ({
  affiliateBps,  // Accept as parameter
  ...
}) => {
  return fetchQuote({
    ...
    affiliateBps,  // Pass through!
  })
}
```

**Test**: Compare rate and quote for same trade - delta should be < 0.1%.

**Affected Files**:
- `utils/fetchFrom[SwapperName].ts` (both fetchQuote and fetchPrice)
- `get[SwapperName]TradeRate.ts`

**Reference**: Similar to Portals fix in PR #10985

---

## 7. Type Safety Issues ⚠️

**Problem**: Using loose string types instead of proper viem types, losing type safety.

**Examples**:
```typescript
// WRONG
const hexValue: `0x${string}` = '0x123'  // Loose type
const address: string = '0xabc...'       // Not type-safe

// RIGHT
import type { Hex, Address } from 'viem'
import { getAddress } from 'viem'

const hexValue: Hex = '0x123'
const address: Address = getAddress('0xabc...')
```

**Common issues**:
- Using `` `0x${string}` `` instead of `Hex`
- Using `string` instead of `Address`
- String indexing into `Record<Address, T>` without casting

**Solution**:
```typescript
import type { Address, Hex } from 'viem'

// For Address-keyed records:
const tokenAddress = Object.keys(response.buyTokens)[0] as Address
const buyToken = response.buyTokens[tokenAddress]
```

**Affected Files**: All swapper files that handle addresses or hex values

---

## 8. Native Token Handling ⚠️

**Problem**: Different APIs handle native tokens (ETH, MATIC, BNB) differently.

**Scenarios**:
- Some require `0xEeee...EEeE`
- Some require `0x0000...0000`
- Some don't allow selling native (must use WETH)
- Some have other markers

**Solution**:
1. **Check API docs** for native token handling
2. **Test both** buying AND selling native tokens
3. **Define marker** if API uses one

```typescript
// Common marker (but check API docs!)
export const NATIVE_MARKER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export const assetIdToToken = (assetId: AssetId): string => {
  if (!isToken(assetId)) return NATIVE_MARKER
  const { assetReference } = fromAssetId(assetId)
  return getAddress(assetReference)
}
```

**Test cases**:
- Buy native token (USDC → ETH)
- Sell native token (ETH → USDC)
- Sell wrapped token (WETH → USDC)

**Affected Files**: `utils/helpers/helpers.ts`, `types.ts`

---

## 9. Gas Estimation Issues ⚠️

**Problem**: Using API gas estimates that are too low, causing transactions to fail.

**Solution**: Add safety buffer:
```typescript
import BigNumber from 'bignumber.js'

const gasLimit = BigNumber.max(
  feeData.gasLimit,        // Node's estimate
  apiGasEstimate || '0'    // API's estimate
)
  .times(1.15)  // Add 15% buffer
  .toFixed(0)
```

**Alternative**: Trust API estimate but take max of node and API:
```typescript
gasLimit: BigNumber.max(feeData.gasLimit, gas || '0').toFixed()
```

**Affected Files**: `endpoints.ts` (`getUnsignedEvmTransaction`)

---

## 10. Missing Dummy Address Validation ⚠️

**Problem**: Allowing executable quotes with dummy address, causing transaction failures.

**Solution**: Prevent dummy address in quote requests:
```typescript
if (takerAddress === DUMMY_ADDRESS) {
  return Err(
    makeSwapErrorRight({
      message: 'Cannot execute quote with dummy address - wallet required',
      code: TradeQuoteError.UnknownError,
    }),
  )
}
```

**Affected Files**: `get[SwapperName]TradeQuote.ts`

---

## 11. Cross-Account Trade Support ⚠️

**Problem**: Assuming swapper supports `sendAddress !== receiveAddress` when it doesn't.

**Not all swappers support** sending from one address and receiving at another.

**Solution**: Explicitly set in `src/state/helpers.ts`:
```typescript
export const isCrossAccountTradeSupported = (swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.YourSwapper:
      return false  // Check API docs!
    // ...
  }
}
```

**Test**: Try quote with `sendAddress !== receiveAddress`.

**Affected Files**: `src/state/helpers.ts`

---

## 12. Missing Feature Flag ⚠️

**Problem**: Swapper is integrated but always shows, even if not production-ready.

**Solution**: Always add feature flag:

1. **Add to preferences slice** (`src/state/slices/preferencesSlice/preferencesSlice.ts`):
   ```typescript
   export type FeatureFlags = {
     // ...
     [SwapperName]Swap: boolean
   }
   ```

2. **Add to initial state**:
   ```typescript
   featureFlags: {
     // ...
     [SwapperName]Swap: getConfig().VITE_FEATURE_[SWAPPER]_SWAP,
   }
   ```

3. **Wire up in `src/state/helpers.ts`**:
   ```typescript
   export const getEnabledSwappers = (
     { [SwapperName]Swap, ...otherFlags }: FeatureFlags,
     isCrossAccountTrade: boolean,
     ...
   ): Record<SwapperName, boolean> => {
     return {
       // ...
       [SwapperName.[SwapperName]]:
         [SwapperName]Swap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.[SwapperName])),
     }
   }
   ```

4. **Add env var** (`.env`, `.env.development`):
   ```bash
   VITE_FEATURE_[SWAPPER]_SWAP=false  # Start disabled
   ```

**Affected Files**: `src/state/slices/preferencesSlice/preferencesSlice.ts`, `src/state/helpers.ts`, `.env`

---

## Pre-Implementation Checklist

Before writing code, verify you understand:

- [ ] Slippage format (percentage, decimal, or basis points)?
- [ ] Address checksumming required?
- [ ] Native token marker (if any)?
- [ ] Response structure (logged actual response)?
- [ ] Hex vs decimal for values, gas, amounts?
- [ ] How errors are returned (partial failures OK)?
- [ ] Affiliate fee support (same for rate and quote)?
- [ ] Cross-account trade support?
- [ ] Gas estimation strategy?

---

## Testing Checklist

After implementation, verify:

- [ ] Slippage is correct in API requests
- [ ] Addresses are checksummed
- [ ] Hex values are converted to decimal
- [ ] Response parsing works (no undefined errors)
- [ ] Rate vs quote delta < 0.1%
- [ ] Native token swaps work (both buy and sell)
- [ ] Gas estimates are reasonable
- [ ] Feature flag toggles swapper
- [ ] Cross-account trades handled correctly

---

## When You See These Errors

**"Taker address not checksummed"**
→ Use `getAddress()` from viem

**"Number '0x...' is not a valid decimal"**
→ Convert hex to decimal with `fromHex()`

**"Sell amount lower than fee"**
→ Check response parsing, likely accessing wrong structure

**Large rate vs quote delta**
→ Pass `affiliateBps` to both rate and quote endpoints

**$0 showing in UI**
→ Response parsing bug, log response and verify structure

**Transaction fails with "slippage"**
→ Wrong slippage format sent to API

---

## 13. TRON-Specific: Human-Readable Amounts ⚠️

**Problem**: TRON aggregator APIs (like Sun.io) return amounts in human-readable format, not base units.

**Real Example** (Sun.io):
```json
{
  "amountIn": "1.000000",      // Human-readable (1 USDT)
  "amountOut": "1.071122"      // Human-readable (1.071122 USDC)
}
```

**Solution**: Must multiply by `10^precision` to convert to crypto base units:
```typescript
const buyAmountCryptoBaseUnit = bn(route.amountOut)
  .times(bn(10).pow(buyAsset.precision))
  .toFixed(0)
```

**Affected Chains**: TRON swappers using aggregator APIs

---

## 14. TRON-Specific: Smart Contract Transaction Building ⚠️⚠️

**Problem**: TRON swappers require calling smart contracts (not simple sends), which is different from deposit-to-address swappers.

**Wrong Assumption**: Can use generic `getUnsignedTronTransaction` from tron-utils
**Reality**: Generic util only handles simple TRC-20 sends, not smart contract calls

**Solution**: Build custom TRON transaction using TronWeb:
```typescript
import { TronWeb } from 'tronweb'

const tronWeb = new TronWeb({ fullHost: rpcUrl })

const txData = await tronWeb.transactionBuilder.triggerSmartContract(
  contractAddress,
  functionSelector,
  options,
  parameters,
  from
)

const rawDataHex = typeof txData.transaction.raw_data_hex === 'string'
  ? txData.transaction.raw_data_hex
  : (txData.transaction.raw_data_hex as Buffer).toString('hex')
```

**Affected Files**: `endpoints.ts` (custom `getUnsignedTronTransaction`)

---

## 15. TRON-Specific: Address Format (Not EVM!) ⚠️

**Problem**: TRON addresses use Base58 encoding (start with 'T'), not EVM hex with checksum.

**Wrong**: Using `getAddress()` from viem for TRON addresses
**Right**: TRON addresses are already in correct format, no checksumming needed

**Native TRX Address**: `T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb`

**Solution**:
```typescript
export const assetIdToTronToken = (assetId: AssetId): string => {
  if (isToken(assetId)) {
    const { assetReference } = fromAssetId(assetId)
    return assetReference // Already in Base58 format
  }
  return 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb' // Native TRX
}
```

**Affected Files**: `utils/helpers/helpers.ts`

---

## 16. TRON-Specific: RPC URL Access ⚠️

**Problem**: SwapperConfig doesn't have VITE_UNCHAINED_TRON_HTTP_URL

**Solution**: Access RPC URL from TRON chain adapter instance:
```typescript
const adapter = assertGetTronChainAdapter(chainId)
const rpcUrl = adapter.httpProvider.getRpcUrl()
```

**Note**: Use `httpProvider.getRpcUrl()` for type-safe access (matches pattern in src/lib/utils/tron.ts).

**Affected Files**: `endpoints.ts` (getUnsignedTronTransaction), approval utilities

---

## 17. TRON-Specific: Address Format for triggerSmartContract ⚠️⚠️

**Problem**: triggerSmartContract requires addresses in **hex format**, not Base58.

**Error**: `invalid address (argument="address", value="TRwyik9Fb6HNjNhThJP3KJv4MAr1o7mCVv", code=INVALID_ARGUMENT)`

**Root Cause**: Even though TRON addresses are Base58, `triggerSmartContract` internally validates them as EVM addresses and needs hex format.

**Solution**: Convert all addresses to hex using `tronWeb.address.toHex()`:
```typescript
const parameters = [
  {
    type: 'address[]',
    value: routeParams.path.map(addr => tronWeb.address.toHex(addr))
  },
  {
    type: 'tuple',
    value: {
      to: tronWeb.address.toHex(recipientBase58),
      // ... other fields
    }
  }
]

const txData = await tronWeb.transactionBuilder.triggerSmartContract(
  contractAddress,
  functionSelector,
  options,
  parameters,
  tronWeb.address.toHex(fromAddress)  // issuerAddress also needs hex
)
```

**Test with `node -e`**:
```bash
node -e "
const TronWeb = require('tronweb');
const tw = new TronWeb({ fullHost: 'https://api.trongrid.io' });
console.log(tw.address.toHex('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'));
"
```

**Affected Files**: `endpoints.ts` (getUnsignedTronTransaction)

---

## 18. TRON-Specific: Immutable Array Parameters ⚠️

**Problem**: TronWeb mutates parameter arrays internally, causing errors if arrays are frozen/immutable.

**Error**: `Cannot assign to read only property '0' of object '[object Array]'`

**Root Cause**: TronWeb's `encodeArgs` function mutates the arrays when converting addresses. If arrays come from API responses or const declarations, they may be frozen.

**Solution**: Clone arrays before passing to TronWeb:
```typescript
const parameters = [
  { type: 'address[]', value: [...addressArray].map(addr => tronWeb.address.toHex(addr)) },
  { type: 'string[]', value: [...poolVersions] },
  { type: 'uint256[]', value: [...versionLengths] },
]
```

**Affected Files**: `endpoints.ts` (triggerSmartContract calls)

---

---

## 19. TRON-Specific: TronWeb 6.x Tuple Address Bug ⚠️⚠️⚠️

**Problem**: TronWeb 6.x doesn't convert TRON Base58 addresses to EVM format when they appear inside tuple parameters, causing ethers.js AbiCoder to reject them.

**Error**: `invalid address (argument="address", value="TRwyik9Fb6HNjNhThJP3KJv4MAr1o7mCVv", code=INVALID_ARGUMENT, version=6.13.5)`

**Root Cause**:
- TronWeb 6.x uses ethers.js internally for ABI parameter encoding
- It auto-converts addresses for `address` and `address[]` types: `TRwyik9...` → `41xxx...` → `0xxx...`
- BUT it forgets to convert addresses inside tuples!
- ethers.js AbiCoder expects EVM format (`0x...`), rejects TRON Base58 (`T...`)

**Real Example** (Sun.io swapper):
```typescript
// ✗ FAILS
{
  type: 'tuple(uint256,uint256,address,uint256)',
  value: ['100000', '95000', 'TRwyik9Fb6HNjNhThJP3KJv4MAr1o7mCVv', 1234567890]
}
// Error: invalid address

// ✓ WORKS
{
  type: 'tuple(uint256,uint256,address,uint256)',
  value: ['100000', '95000', '0xaf46828a4d975381e62bdb9f272388d97daf14b6', 1234567890]
}
```

**Solution**: Manually convert TRON addresses in tuple values to EVM format:

```typescript
/**
 * Converts TRON Base58 addresses to EVM hex format (0x-prefixed).
 * Required for TronWeb 6.x tuple parameters containing addresses.
 */
const convertAddressesToEvmFormat = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(v => convertAddressesToEvmFormat(v))
  }

  if (typeof value === 'string' && value.startsWith('T') && TronWeb.isAddress(value)) {
    const hex = TronWeb.address.toHex(value)  // TRwyik... → 41af46828a...
    return hex.replace(/^41/, '0x')           // 41af... → 0xaf...
  }

  return value
}

// Apply to tuple values before passing to triggerSmartContract
{
  type: 'tuple(uint256,uint256,address,uint256)',
  value: convertAddressesToEvmFormat([
    amountIn,
    amountOutMin,
    recipientAddress,  // Will be converted if TRON Base58
    deadline,
  ])
}
```

**Why EVM format for TRON?**: TronWeb uses ethers.js (Ethereum library) internally for ABI encoding. The conversion is only for parameter encoding - the actual TRON transaction still uses TRON addresses.

**Test with `node -e`**:
```bash
node -e "
const { TronWeb } = require('tronweb');
const addr = 'TRwyik9Fb6HNjNhThJP3KJv4MAr1o7mCVv';
const hex = TronWeb.address.toHex(addr);
const evm = hex.replace(/^41/, '0x');
console.log('TRON Base58:', addr);
console.log('TRON Hex:', hex);
console.log('EVM Format:', evm);
// Output: EVM Format: 0xaf46828a4d975381e62bdb9f272388d97daf14b6
"
```

**Affected Scenarios**:
- Any TRON swapper using triggerSmartContract with tuple parameters
- Smart contract functions with struct parameters containing addresses
- Multi-parameter contract calls with addresses in complex types

**NOT Affected**:
- Simple `address` type parameters ✅ TronWeb handles
- `address[]` array parameters ✅ TronWeb handles
- TRC20 token transfers ✅ Use simple address type

**Affected Files**: Any file calling `triggerSmartContract` with tuple/struct parameters

---

**Remember**: Most bugs come from assumptions about API behavior. Always verify with actual API calls and responses!

**PROTIP**: Use `node -e` to quickly test library behavior, address conversions, and API parsing before writing full code!
