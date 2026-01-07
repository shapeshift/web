# Code Review: PR 11578 (Yield.xyz integration)

## Scope
- Diff vs `origin/develop` at review time.
- Local review only (no GitHub PR comment context available in this environment).

## Findings
### High
1) ChainId inference for aggregate balances is ambiguous across networks.
   - Location: `src/react-queries/queries/yieldxyz/useAllYieldBalances.ts:118-125`
   - Why it matters: the lookup uses `address` only. The same EVM address exists on multiple networks, so balances can be augmented with the wrong `chainId`, leading to incorrect asset IDs, balances, and follow-on actions.
   - Suggested fix: match on both address and network (e.g., use `balance.token.network` if present) or include network in the aggregation response mapping.

### Medium
2) `cosmosPubKey` is populated with the account address instead of a pubkey.
   - Location: `src/pages/Yields/components/YieldActionModal.tsx:383-384`
   - Why it matters: Yield.xyz expects a Cosmos public key; providing a bech32 address is likely invalid and can fail action creation or cause undefined behavior.
   - Suggested fix: derive the pubkey from the wallet or omit the field until a proper pubkey is available.

3) Solana transaction execution logs sensitive data (including signed tx).
   - Location: `src/lib/yieldxyz/executeTransaction.ts:291-425`
   - Why it matters: logging signed transactions and detailed internal state can leak sensitive data and is noisy in production.
   - Suggested fix: remove or guard logs behind a debug flag; never log raw signed transactions.

### Medium
4) Exit flow uses input token `assetId` while displaying yield token symbol.
   - Location: `src/pages/Yields/components/YieldEnterExit.tsx:243-246`
   - Why it matters: if the receipt/yield token differs from the input token, the UI will show mismatched symbol/icon/decimals and may compute incorrect balance formatting.
   - Suggested fix: use the balance token assetId (or `yieldItem.token.assetId`) for exit flows.

### Low
5) Aggregate balance queries are not actually deduplicated.
   - Location: `src/react-queries/queries/yieldxyz/useAllYieldBalances.ts:106-111`
   - Why it matters: the comment says "deduplicate," but the code only maps; this can inflate API calls if duplicate payloads slip in.
   - Suggested fix: implement a real `(address, network)` dedupe or remove the comment.

## Tests
- Not run (review-only).
