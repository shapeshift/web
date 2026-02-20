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
   - `src/config.ts` - `VITE_FEATURE_<CHAIN>` validation + `VITE_<CHAIN>_NODE_URL` validation
   - `src/test/mocks/store.ts` - Mock default
   - `src/vite-env.d.ts` - Type declarations
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
    - Generated adapter JSON in `generated/eip155_<chainId>/`
    - Index export
    - Test coverage
    - **Update multi-chain token test assertions** - `index.test.ts` assertions for tokens that exist across many chains (e.g. `coingeckoToAssetIds('usd-coin')`) must include the new chain's token address

16. **Transaction Status Utility** - `src/lib/utils/<chain>.ts`
    - `is<Chain>ChainAdapter()` type guard
    - `get<Chain>TransactionStatus()` - RPC-based tx receipt polling

16b. **State Migration** - `src/state/migrations/index.ts`
    - A new `clearAssets` migration entry is REQUIRED when adding a chain
    - Bump the migration version number (next sequential integer)
    - Without this, existing users with persisted state won't see the new chain's assets until they manually clear cache

16c. **Market Service Test** - `src/lib/market-service/coingecko/coingecko.test.ts`
    - Expected result counts in both `can flatten multiple responses` and `can return some results if partially rate limited` tests need incrementing (one more chain = one more result in each)

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
    - Transaction status checking for new chain (usually handled by SECOND_CLASS_CHAINS constant)

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
    - Add to `walletConnectV2OptionalChains` if WC2 supports the chain

34. **Treasury** - `packages/utils/src/treasury.ts`
    - Add if DAO treasury exists on the chain

## Phase 4: Consistency Checks

35. **Trailing slashes** on RPC URLs - all `*_NODE_URL` entries should be consistent (no trailing slash)
36. **Chain ID correctness** - verify against the chain's official docs
37. **Explorer URLs** - verify they're the official block explorer
38. **Asset icon URLs** - verify they resolve
39. **Generated data** - verify asset-manifest.json, generatedAssetData.json, relatedAssetIndex.json are regenerated

40. **Related Asset Index** - `public/generated/relatedAssetIndex.json` + `scripts/generateAssetData/generateRelatedAssetIndex/generateRelatedAssetIndex.ts`
    - If the native asset is ETH: verify it's in `manualRelatedAssetIndex[ethAssetId]` array
    - Verify `relatedAssetIndex.json` has been regenerated and contains entries for the new chain's tokens
    - Check `generatedAssetData.json` - the chain's ERC20 tokens should have `relatedAssetKey` values linking them to mainnet counterparts
    - Without this, tokens won't appear in the trade modal "Popular Assets" section

41. **Trade modal "Popular Assets" verification** - after enabling the feature flag, open the trade modal "To" asset selector and filter by the new chain
    - Popular tokens (USDC, USDT, LINK, etc.) should appear WITHOUT needing to search
    - If only the native asset and a handful show, the related asset index likely wasn't regenerated

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
