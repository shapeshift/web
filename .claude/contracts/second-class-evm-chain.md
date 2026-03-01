# Contract: Second-Class EVM Chain Integration

All integration points required when adding a new second-class EVM chain to ShapeShift Web. This is the authoritative checklist - both build and review workflows reference this contract.

## Phase 1: Core Infrastructure

1. **CAIP Constants** - `packages/caip/src/constants.ts`
   - `<chain>AssetId`, `<chain>ChainId`, `CHAIN_REFERENCE.<Chain>Mainnet`, `ASSET_REFERENCE.<Chain>`
   - Added to `VALID_CHAIN_IDS[CHAIN_NAMESPACE.Evm]`

2. **KnownChainIds enum** - `packages/types/src/base.ts`
   - `KnownChainIds.<Chain>Mainnet`
   - Added to `EvmChainId` type union

3. **Chain Adapter** - `packages/chain-adapters/src/evm/<chain>/`
   - Class extending `SecondClassEvmAdapter`
   - Type guard `is<Chain>ChainAdapter()`
   - Proper `rootBip44Params`, `getFeeAssetId()`, `getType()`, display name
   - Exported from `packages/chain-adapters/src/evm/index.ts`

4. **Chain Adapter Types** - `packages/chain-adapters/src/types.ts`
   - Added to `Account`, `FeeData`, `SignTx`, `BuildTxInput`, `GetFeeDataInput` discriminated unions
   - `ChainAdapterDisplayName` enum entry

5. **EVM Base Adapter** - `packages/chain-adapters/src/evm/EvmBaseAdapter.ts`
   - Chain ID imported and handled

6. **Plugin** - `src/plugins/<chain>/index.tsx`
   - Feature flag check
   - RPC URL from config
   - Chain ID mapping
   - Token filtering by chain + namespace
   - Registered in `src/plugins/activePlugins.ts`

7. **Feature Flag** - Multiple files:
   - `src/state/slices/preferencesSlice/preferencesSlice.ts` - FeatureFlags type + initial state
   - `src/config.ts` - `VITE_FEATURE_<CHAIN>` validation (`bool({ default: false })`) + `VITE_<CHAIN>_NODE_URL` validation (must use `url()`, NOT `str()`)
   - `src/test/mocks/store.ts` - Mock default
   - `src/vite-env.d.ts` - Type declarations
   - **RPC URL research**: Check https://chainlist.org/chain/<chainId> for public RPC endpoints as a fallback when official docs don't provide one. Always verify the endpoint works with `curl -s -X POST <url> -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'` before committing. Avoid endpoints requiring API keys in `.env.development`.
   - `.env` - Production default (usually `false`)
   - `.env.development` - Dev default (usually `true`)

8. **HDWallet Support** - ALL wallet implementations:
   - `packages/hdwallet-core/src/wallet.ts` - `supports<Chain>()` predicate
   - `packages/hdwallet-core/src/ethereum.ts` - `_supports<Chain>` boolean property
   - ALL of: `hdwallet-native`, `hdwallet-ledger`, `hdwallet-trezor`, `hdwallet-phantom`, `hdwallet-metamask-multichain`, `hdwallet-walletconnectv2`, `hdwallet-coinbase`, `hdwallet-keepkey`, `hdwallet-gridplus`, `hdwallet-vultisig`

9. **Viem Client** - `packages/contracts/src/viemClient.ts`
   - Import chain from `viem/chains`
   - Create `viem<Chain>Client`
   - Add to `viemClientByChainId`, `viemNetworkIdByChainId`, `viemClientByNetworkId`

10. **Ethers Provider** - `packages/contracts/src/ethersProviderSingleton.ts`
    - Case for `KnownChainIds.<Chain>Mainnet` returning `VITE_<CHAIN>_NODE_URL`

11. **Base Asset** - `packages/utils/src/assetData/baseAssets.ts`
    - Full asset object with name, networkName, symbol, precision, color, icon, networkIcon, explorer URLs, relatedAssetKey

12. **Utility Functions** (all in `packages/utils/src/`):
    - `getBaseAsset.ts` - Return base asset
    - `chainIdToFeeAssetId.ts` - Return fee asset ID
    - `getChainShortName.ts` - Return short name
    - `getNativeFeeAssetReference.ts` - Return asset reference
    - `getAssetNamespaceFromChainId.ts` - Return `erc20`

13. **CSP Headers** - `headers/csps/chains/<chain>.ts`
    - RPC URL in connect-src
    - Registered in `headers/csps/index.ts`

14. **Asset Generation** - `scripts/generateAssetData/<chain>/index.ts`
    - Coingecko assets fetched
    - Native asset included
    - Registered in `scripts/generateAssetData/generateAssetData.ts`
    - **Shared coingecko script** - `scripts/generateAssetData/coingecko.ts` must import and use the new chain's `chainId` constant
    - **Per-chain generation**: after wiring, run `source ~/.zshrc && ZERION_API_KEY=$ZERION_API_KEY yarn generate:chain <chainId>` (e.g., `eip155:59144`) to regenerate only this chain's assets (~30s vs 30min for full `generate:all`). Also accepts directory name (e.g., `linea`).

15. **Coingecko Integration** - `packages/caip/src/adapters/coingecko/`
    - Enum value in `CoingeckoAssetPlatform`
    - `chainIdToCoingeckoAssetPlatform()` switch case
    - `coingeckoAssetPlatformToChainId()` switch case
    - `parseData()` in `utils.ts` - platform check for ERC20 token discovery
    - Default asset mapping
    - Generated adapter JSON in `generated/eip155_<chainId>/adapter.json`
    - **Generated index** - `packages/caip/src/adapters/coingecko/generated/index.ts` must import and re-export the new chain's adapter JSON. Without this, `coingeckoToAssetIds()` won't return the chain's assets and the CoinGecko test will fail.
    - Test coverage
    - **Update multi-chain token test assertions** - `index.test.ts` assertions for tokens that exist across many chains (e.g. `coingeckoToAssetIds('usd-coin')`) must include the new chain's token address

16. **Transaction Status** - handled generically by `SecondClassEvmAdapter.getTransactionStatus()`
    - NO per-chain tx status util file needed (the `default` case in `useSendActionSubscriber.tsx` uses `getSecondClassEvmTxStatus()` which detects any `SecondClassEvmAdapter` via `isSecondClassEvmAdapter` type guard)
    - Only non-EVM chains (Tron, Sui, Near, Ton, Starknet) have individual cases

16b. **State Migration** - `src/state/migrations/index.ts`
    - A new `clearAssets` migration entry is REQUIRED when adding a chain
    - Bump the migration version number (next sequential integer)
    - Without this, existing users with persisted state won't see the new chain's assets until they manually clear cache

16c. **Market Service Test** - `src/lib/market-service/coingecko/coingecko.test.ts`
    - **ONLY for ETH-native chains** (where CoinGecko maps the native asset to `'ethereum'`):
    - Expected result counts in both `can flatten multiple responses` and `can return some results if partially rate limited` tests need incrementing (one more ETH-native chain = one more result in each)
    - "flatten" count = number of ETH-native chains + 1 (for BTC), "rate limited" count = number of ETH-native chains
    - Chains with their own native token (CRO, S, MON, etc.) do NOT increment these counts

16d. **Vite Environment Type Declarations** - `src/vite-env.d.ts`
    - Add `readonly VITE_<CHAIN>_NODE_URL: string` and `readonly VITE_FEATURE_<CHAIN>: string`
    - Without this, TypeScript won't know about the env vars (though runtime still works via config.ts validation)

## Phase 2: State & UI Integration

17. **Portfolio Utils** - `src/state/slices/portfolioSlice/utils/index.ts`
    - Chain imported and used in account labeling

18. **Wallet Support Hook** - `src/hooks/useWalletSupportsChain/useWalletSupportsChain.ts`
    - Feature flag check + `supports<Chain>(wallet)` call

19. **EVM Account Derivation** - `src/lib/account/evm.ts`
    - Chain imported and wallet support check

20. **Second Class Chains Constant** - `src/constants/chains.ts`
    - Added to `SECOND_CLASS_CHAINS` array with feature flag gating

21. **Plugin Provider** - `src/context/PluginProvider/PluginProvider.tsx`
    - Feature flag check

22. **Markets Row** - `src/pages/Markets/components/MarketsRow.tsx`
    - Feature flag chain gating

23. **Popular Assets** - `src/components/TradeAssetSearch/hooks/useGetPopularAssetsQuery.tsx`
    - Chain's native asset ID included when flag enabled

24. **Asset Service** - `src/lib/asset-service/service/AssetService.ts`
    - Feature flag gating

25. **Opportunities Mappings** - `src/state/slices/opportunitiesSlice/mappings.ts`
    - Empty array entry for new chain

26. **Action Center Subscriber** - `src/hooks/useActionCenterSubscribers/useSendActionSubscriber.tsx`
    - NO per-chain case needed - the `default` handler auto-detects any `SecondClassEvmAdapter` via `isSecondClassEvmAdapter` and calls `getTransactionStatus()` on it
    - Only add a case if the chain needs non-standard tx status logic (unlikely for EVM chains)

## Phase 3: Swapper & Data Provider Integration

For each of these, RESEARCH whether the service actually supports the new chain before flagging as a gap:

27. **Relay Swapper** - `packages/swapper/src/swappers/RelaySwapper/constant.ts`
    - Check https://relay.link or relay docs for supported chains
    - Add to `chainIdToRelayChainId` and `relayTokenToAssetId`

28. **Across Swapper** - `packages/swapper/src/swappers/AcrossSwapper/constant.ts`
    - Check https://docs.across.to/reference/supported-chains
    - Add to `chainIdToAcrossChainId` if supported

29. **Portals Swapper** - `packages/swapper/src/swappers/PortalsSwapper/constants.ts` + `types.ts`
    - Also `src/lib/portals/constants.ts`
    - Check Portals API docs for supported networks
    - Add to `chainIdToPortalsNetwork` and `PortalsSupportedChainIds` if supported

30. **Zerion** - `packages/types/src/zerion.ts`
    - Check https://zerion.io or Zerion API docs
    - Add to `ZERION_CHAINS` array and `ZERION_CHAINS_MAP` if supported

31. **Coingecko Supported Chain IDs** - `src/lib/coingecko/utils.ts`
    - Add to `getCoingeckoSupportedChainIds()` with feature flag gating
    - Without this, token market data won't load!

32. **Yield.xyz** - `src/lib/yieldxyz/constants.ts` + `types.ts`
    - Check if `YieldNetwork` enum has the chain
    - Add to `CHAIN_ID_TO_YIELD_NETWORK` if supported

33. **WalletConnect V2** - `src/context/WalletProvider/WalletConnectV2/config.ts`
    - All EVM second-class chains MUST be added here for WalletConnect wallet connectivity
    - Four touchpoints in the file, all required:
      1. **viem import**: Add `<viemChainName>` to the `import { ... } from 'viem/chains'` block (append at end per Phase 4.5 convention)
      2. **optionalViemChains**: If feature-flagged, add `if (config.VITE_FEATURE_<CHAIN>) { optionalViemChains.push(<viemChainName>) }` block before the length check. If not flagged, add to the hardcoded array.
      3. **Config destructuring**: Add `VITE_<CHAIN>_NODE_URL` to the `const { ... } = config` destructuring
      4. **rpcMap**: If feature-flagged, add `if (config.VITE_FEATURE_<CHAIN>) { walletConnectV2RpcMap[CHAIN_REFERENCE.<Chain>Mainnet] = VITE_<CHAIN>_NODE_URL }` block. If not flagged, add to the hardcoded rpcMap object.
    - Feature-flagged chains use conditional push/rpcMap blocks; non-flagged chains (like ink) go directly in the hardcoded arrays/objects
    - Ensure viem is up to date enough to export the chain definition (check `viem/chains`)

34. **Treasury** - `packages/utils/src/treasury.ts`
    - Add if DAO treasury exists on the chain

## Phase 3.5: Wrapped Native Asset Detection

For cross-chain swaps where the destination is native (e.g., ETH→MNT via Relay), the receiving Tx often involves an unwrap of the wrapped native token (e.g., WMNT→MNT). Since second-class chains lack `debug_traceTransaction` support, this unwrap is invisible to the Tx parser and causes missing execution prices / incomplete Tx history.

42. **Wrapped Native Contract** - `packages/chain-adapters/src/evm/SecondClassEvmAdapter.ts`
    - Add the chain's wrapped native token address to `WRAPPED_NATIVE_CONTRACT_BY_CHAIN_ID` mapping
    - Common addresses: WBERA `0x6969...`, WMNT `0x78c1b0C9...`, WETH varies by chain
    - The detection logic is already generalized with THREE fallback strategies in order:
      1. `debug_traceTransaction` for internal txs (not supported on all RPCs)
      2. ERC20 `Transfer` burn events (to zero address) on the wrapped contract
      3. WETH9 `Withdrawal(address indexed src, uint256 wad)` event - used by Across on OP Stack L2s where `withdraw()` emits Withdrawal instead of Transfer-to-zero
    - All three fallbacks are in `SecondClassEvmAdapter.parseTx()` and apply to ALL chains automatically
    - To find the wrapped native address: search `W<SYMBOL>` on the chain's block explorer or check the Relay/Across Tx from the user's review comment

## Phase 3.6: Native Token ERC20 Duplicate Blacklisting

Some chains have an ERC20 contract that represents the native token (e.g., Mantle's `0xDeaD...0000` for MNT, Polygon's `0x...1010` for MATIC). CoinGecko returns these as separate tokens, which causes:
- **Duplicate assets in "My Assets"** - native and ERC20 wrapper both appear with different icons
- **Relay swap failures** - the swap picker may select the ERC20 wrapper, which Relay doesn't recognize as native (expects `0x0000...0000`)
- **Incorrect balance display** - double-counting the same balance

44. **Blacklist native ERC20 wrapper** - `scripts/generateAssetData/blacklist.json`
    - If the chain has a special ERC20 contract representing the native token, add it to the blacklist
    - Known patterns: Mantle `eip155:5000/erc20:0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000`, Polygon `eip155:137/erc20:0x0000000000000000000000000000000000001010`
    - To detect: after `yarn generate:chain`, check if there are two entries with the same symbol as the native asset (one `slip44:60`, one `erc20:0x...`)
    - After adding to blacklist, re-run `yarn generate:chain` to apply

## Phase 4: Consistency Checks

35. **Trailing slashes** on RPC URLs - all `*_NODE_URL` entries should be consistent (no trailing slash)
36. **Chain ID correctness** - verify against the chain's official docs
37. **Explorer URLs** - verify they're the official block explorer
38. **Asset icon URLs** - verify they resolve (HTTP 200, not 403/404). Prefer `assets.relay.link/icons/<chainId>/light.png` for networkIcon over CoinGecko URLs which often return 403. **After changing `networkIcon` in `baseAssets.ts`, you MUST re-run `yarn generate:chain` for that chain** - the generated JSON caches the old URL and won't pick up the fix until regenerated.
39. **Generated data** - verify asset-manifest.json, generatedAssetData.json, relatedAssetIndex.json are regenerated

40. **Related Asset Index** - `public/generated/relatedAssetIndex.json` + `scripts/generateAssetData/generateRelatedAssetIndex/generateRelatedAssetIndex.ts`
    - If the native asset is ETH: verify it's in `manualRelatedAssetIndex[ethAssetId]` array
    - **If the native asset is NOT ETH** (e.g., CRO, S, MNT): research whether the same token exists on Ethereum mainnet as an ERC20. If it does, add a manual mapping in `manualRelatedAssetIndex` in BOTH `generateRelatedAssetIndex.ts` AND `generateChainRelatedAssetIndex.ts`.
    - **CRITICAL: The native chain token MUST be the KEY, not a value.** Use `[chainAssetId]: ['eip155:1/erc20:0x...']` (native = key, ETH ERC20 = value). If the ETH ERC20 is the key and the native is a value, the native asset gets `relatedAssetKey` pointing to ETH ERC20, making `isPrimary=false`, which causes it to be excluded from `selectPrimaryAssets` and missing from "Popular Assets". This is because `isPrimary = relatedAssetKey === null || relatedAssetKey === assetId` in AssetService.
    - Verify `relatedAssetIndex.json` has been regenerated and contains entries for the new chain's tokens
    - Check `generatedAssetData.json` - the chain's native asset should have `relatedAssetKey` pointing to ITSELF (self-referencing), NOT to an ETH ERC20
    - Without this, the native token won't appear in the trade modal "Popular Assets" section
    - **Manual stablecoin mappings**: Look up the chain's native USDC, USDT, and DAI contract addresses (NOT bridged variants - CoinGecko auto-discovers those). Add them to `manualRelatedAssetIndex` in BOTH `generateRelatedAssetIndex.ts` AND `generateChainRelatedAssetIndex.ts`, keyed by the Ethereum canonical token's AssetId. Without this, popular stablecoins won't show for the chain in the trade modal.

41. **Trade modal "Popular Assets" verification** - after enabling the feature flag, open the trade modal "To" asset selector and filter by the new chain
    - Popular tokens (USDC, USDT, LINK, etc.) should appear WITHOUT needing to search
    - If only the native asset and a handful show, the related asset index likely wasn't regenerated

## Phase 4.5: Append-Only Convention

When adding a new chain to lists, switch/case blocks, arrays, or object entries, the new chain's entry MUST go LAST (append-only). This prevents merge conflict resolution from breaking closing syntax (missing `}`, `},`, `})`, `break`, etc.) between entries.

43. **All additions are append-only** - new chain entries go at the END of:
    - Switch/case blocks (e.g., `EvmBaseAdapter.ts`, `coingecko.ts`, `useSendActionSubscriber.tsx`)
    - Object literals (e.g., `baseAssets.ts`, `utils.test.ts`)
    - Arrays (e.g., `SECOND_CLASS_CHAINS`, `VALID_CHAIN_IDS`)
    - Import lists
    - `.env` / `.env.development` variable groups
    - This prevents a class of merge conflict resolution bugs where auto-resolvers lose closing syntax between adjacent entries

## Phase 5: Runtime Testing

- Enable feature flag in `.env.development`
- Verify chain appears in chain selector
- Verify native asset balance loads
- Verify swap routes include chain (both directions)
- Verify token search works for chain's tokens
- Verify transaction history works
- Verify swap execution + status detection works
- Verify markets page shows chain's assets
- Verify trade modal "Popular Assets" section shows popular tokens for the chain without searching
- Verify ETH on the chain appears as a related asset of mainnet ETH (if applicable)
- Verify cross-chain swap TO native asset shows execution price (wrapped native detection)
- Verify chain icon and network icon load without perma-loading spinner
- Verify brand chain icon in chain selector is correct and displays properly
- Verify native asset does NOT appear twice in "My Assets" (once as slip44, once as ERC20 wrapper) - if it does, blacklist the ERC20 wrapper in `scripts/generateAssetData/blacklist.json` and regen
