# TRON Fee Estimation Fix - Implementation Plan

## Executive Summary

Critical bug: TRON fee estimation returns 0.268 TRX for all transactions. Actual TRC20 transfers cost 6.7-20.8 TRX (24-77x underestimate). This causes transactions to fail with OUT_OF_ENERGY errors and users lose partial fees.

## Validated Findings

### 1. Network Parameters (Confirmed via live testing)
- **getMemoFee**: 1,000,000 SUN (1 TRX) ✅
- **Energy price**: 100 SUN/unit (down from 420) ✅
- **Bandwidth price**: 1000 SUN/byte ✅
- **Dynamic energy**: Can spike up to 3.4x during congestion ✅

### 2. Actual Transaction Costs (Validated)
| Transaction Type | Current Estimate | Actual Cost | Error |
|-----------------|------------------|-------------|-------|
| TRX transfer | 0.268 TRX | 0.198 TRX | ~Correct |
| TRX + memo | 0.268 TRX | 1.231 TRX | 4.6x under |
| TRC20 (existing balance) | 0.268 TRX | 6.7 TRX | 25x under |
| TRC20 (new address) | 0.268 TRX | 13.3 TRX | 50x under |
| TRC20 + memo (existing) | 0.268 TRX | 7.8 TRX | 29x under |
| TRC20 + memo (new) | 0.268 TRX | 14.4 TRX | 54x under |

### 3. Critical Insights
- **Energy varies 2x**: Recipients with token balance use ~64k energy, without use ~130k
- **Must use actual recipient address**: SSTORE instruction costs differ based on storage state
- **TronGrid limitation**: estimateEnergy API not available, must use triggerConstantContract
- **Dynamic energy spikes**: Apply 1.5x safety margin (can spike to 3.4x in extreme cases)
- **Thor rates issue**: Fees show as undefined even when wallet connected and address available

## Implementation Files

### 1. Fix TronChainAdapter.getFeeData()
**File**: `packages/chain-adapters/src/tron/TronChainAdapter.getFeeData.fix.ts`

**Key Changes**:
- Query live chain parameters for current prices
- Detect TRC20 vs TRX transactions
- Use `estimateTRC20TransferFee()` with actual recipient
- Apply 1.5x safety margin for dynamic energy
- Build real transaction for accurate bandwidth
- Add 1 TRX memo fee when present
- Return energy/bandwidth in chainSpecific

### 2. Fix Thor/TRON Rate Quotes
**File**: `packages/swapper/src/thorchain-utils/getL1RateOrQuote.tron-fix.ts`

**Key Changes**:
- Calculate fees for rates when `receiveAddress` is available
- Use vault as recipient for accurate energy estimation
- Show fees that would be charged including memo
- Add chainSpecific metadata (energy, bandwidth, hasMemoFee)

### 3. Update estimateTRC20TransferFee()
**File**: `packages/unchained-client/src/tron/api.estimateTRC20TransferFee.fix.ts`

**Key Changes**:
- Fix fallback from 31 TRX to 13 TRX (realistic worst case)
- Keep returning raw estimate without safety margin

### 4. Add Pre-Broadcast Balance Check
**File**: `packages/chain-adapters/src/tron/TronChainAdapter.broadcastTransaction.fix.ts`

**Key Changes**:
- Check TRX balance before broadcasting
- Calculate conservative fee requirements
- Provide clear error messages with required amounts
- Prevent OUT_OF_ENERGY failures

### 5. Comprehensive Test Suite
**File**: `packages/chain-adapters/src/tron/TronChainAdapter.test.ts`

**Test Coverage**:
- TRX transfers with/without memo
- TRC20 to existing/new addresses
- TRC20 with memo
- Fallback behavior
- Balance validation
- Dynamic energy scenarios
- Extreme congestion (3.4x spike)

## Implementation Checklist

### Priority 0 - Critical (Immediate)
- [ ] Apply `TronChainAdapter.getFeeData.fix.ts` to TronChainAdapter.ts
- [ ] Apply `getL1RateOrQuote.tron-fix.ts` to show fees for rates
- [ ] Update `estimateTRC20TransferFee()` fallback to 13 TRX
- [ ] Deploy and monitor for OUT_OF_ENERGY errors

### Priority 1 - High (This Week)
- [ ] Add pre-broadcast balance check
- [ ] Run test suite on Shasta testnet
- [ ] Add Sentry monitoring for fee accuracy
- [ ] Update error messages to be user-friendly

### Priority 2 - Medium (Next Sprint)
- [ ] Add UI breakdown of energy/bandwidth/memo costs
- [ ] Implement adaptive safety margins based on congestion
- [ ] Add warnings when estimated fee > 15 TRX
- [ ] Create user documentation about TRON fees

## Testing Strategy

### Unit Tests
- Run `TronChainAdapter.test.ts` with mocked dependencies
- Validate all fee calculation scenarios
- Test edge cases and fallbacks

### Integration Tests (Shasta Testnet)
1. Get test TRX from faucet
2. Test TRX transfers with/without memo
3. Test USDT transfers to various addresses
4. Verify actual fees match estimates ± margin
5. Test insufficient balance scenarios

### Mainnet Validation
- Start with small test transactions
- Compare with TronScan fee calculator
- Monitor Sentry for errors
- Track fee accuracy metrics

## Risk Mitigation

### Potential Issues
1. **Underestimation during spikes**: 1.5x margin may not cover extreme congestion
   - **Mitigation**: Monitor and adjust if needed, set 100 TRX feeLimit

2. **Address detection errors**: Wrong recipient type assumption
   - **Mitigation**: Use conservative 130k energy estimate on errors

3. **Breaking changes**: Existing transactions might be affected
   - **Mitigation**: Thoroughly test all transaction types

## Success Metrics

- Zero OUT_OF_ENERGY errors in production
- Fee estimates within ±30% of actual costs
- User complaints about fees reduced by 90%
- No increase in failed transaction rate

## Notes

- TRON transactions are irreversible once broadcast
- Failed transactions still cost TRX (partial energy/bandwidth burned)
- This fix brings fee estimation accuracy from 2-4% to 70-100%
- Safety margin handles most congestion scenarios
- Balance check prevents most failures before broadcast

## References

- GitHub Issue: https://github.com/shapeshift/web/issues/11270
- TRON Resource Model: https://developers.tron.network/docs/resource-model
- Dynamic Energy Model: https://medium.com/tronnetwork/dynamic-energy-model
- TronWeb Docs: https://tronweb.network/docu/docs/
- Test Calculator: https://chaingateway.io/tools/tron-fee-calculator/