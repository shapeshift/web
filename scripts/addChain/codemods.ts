import fs from 'node:fs'
import path from 'node:path'

import {
  addImportLine,
  addNamedImport,
  appendAfterLastImport,
  appendLineAfterAllPatterns,
  appendLineAfterLastPattern,
  appendLineAfterPattern,
  insertAtPosition,
  insertIntoNamedNode,
  insertIntoSwitch,
} from './engine'
import type { CodemodResult } from './report'
import type { ChainConfig } from './schema'

const ROOT = path.resolve(__dirname, '../..')

function r(...parts: string[]) {
  return path.join(ROOT, ...parts)
}

function wrap(file: string, operation: string, fn: () => boolean): CodemodResult {
  try {
    const changed = fn()
    return { file, operation, status: changed ? 'inserted' : 'skipped' }
  } catch (err) {
    return { file, operation, status: 'error', message: String(err) }
  }
}

function fill(template: string, c: ChainConfig): string {
  return template
    .replace(/\{\{camelName\}\}/g, c.camelName)
    .replace(/\{\{pascalName\}\}/g, c.pascalName)
    .replace(/\{\{upperName\}\}/g, c.upperName)
    .replace(/\{\{chainId\}\}/g, String(c.chainId))
}

export function runAllCodemods(config: ChainConfig): CodemodResult[] {
  const results: CodemodResult[] = []
  const c = config

  const chainAssetId = `eip155:${c.chainId}/slip44:60`
  const chainIdStr = `eip155:${c.chainId}`

  // Helper to read a template
  const tmpl = (name: string) => fs.readFileSync(r(`scripts/addChain/templates/${name}`), 'utf8')

  // ============================================================
  // 1. packages/caip/src/constants.ts
  // ============================================================
  const caipConstants = r('packages/caip/src/constants.ts')

  // 1a) assetId export
  results.push(
    wrap(caipConstants, 'caip-assetId-export', () =>
      appendLineAfterPattern(
        caipConstants,
        /export const \w+AssetId: AssetId = 'eip155:[^']+\/slip44:60'/,
        `export const ${c.camelName}AssetId: AssetId = '${chainAssetId}'`,
        `${c.camelName}AssetId`,
      ),
    ),
  )

  // 1b) chainId export
  results.push(
    wrap(caipConstants, 'caip-chainId-export', () =>
      appendLineAfterPattern(
        caipConstants,
        /export const \w+ChainId: ChainId = 'eip155:\d+'/,
        `export const ${c.camelName}ChainId: ChainId = '${chainIdStr}'`,
        `${c.camelName}ChainId`,
      ),
    ),
  )

  // 1c) CHAIN_REFERENCE entry
  results.push(
    wrap(caipConstants, 'caip-CHAIN_REFERENCE', () =>
      insertIntoNamedNode(
        caipConstants,
        'CHAIN_REFERENCE',
        `  ${c.pascalName}Mainnet: '${c.chainId}', // ${c.explorerUrl}\n`,
        `${c.pascalName}Mainnet:`,
      ),
    ),
  )

  // 1d) ASSET_REFERENCE entry
  results.push(
    wrap(caipConstants, 'caip-ASSET_REFERENCE', () =>
      insertIntoNamedNode(
        caipConstants,
        'ASSET_REFERENCE',
        `  ${c.pascalName}: '60', // evm chain which uses ethereum derivation path as common practice\n`,
        `${c.pascalName}: '60'`,
      ),
    ),
  )

  // 1e) VALID_CHAIN_IDS Evm array - append at true end (before the CosmosSdk key)
  results.push(
    wrap(caipConstants, 'caip-VALID_CHAIN_IDS', () =>
      insertAtPosition(
        caipConstants,
        `\n  ],\n  [CHAIN_NAMESPACE.CosmosSdk]:`,
        true, // insert BEFORE the closing ],
        `    CHAIN_REFERENCE.${c.pascalName}Mainnet,`,
        `CHAIN_REFERENCE.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // 1f) FEE_ASSET_IDS array
  results.push(
    wrap(caipConstants, 'caip-FEE_ASSET_IDS', () =>
      insertIntoNamedNode(
        caipConstants,
        'FEE_ASSET_IDS',
        `  ${c.camelName}AssetId,\n`,
        `${c.camelName}AssetId`,
      ),
    ),
  )

  // ============================================================
  // 2. packages/types/src/base.ts
  // ============================================================
  const typesBase = r('packages/types/src/base.ts')

  // 2a) KnownChainIds enum
  results.push(
    wrap(typesBase, 'types-KnownChainIds', () =>
      insertIntoNamedNode(
        typesBase,
        'KnownChainIds',
        `  ${c.pascalName}Mainnet = '${chainIdStr}',\n`,
        `${c.pascalName}Mainnet`,
      ),
    ),
  )

  // 2b) EvmChainId union type - append at end (before CosmosSdkChainId type)
  results.push(
    wrap(typesBase, 'types-EvmChainId', () =>
      insertAtPosition(
        typesBase,
        `\n\nexport type CosmosSdkChainId`,
        true,
        `  | KnownChainIds.${c.pascalName}Mainnet\n`,
        `KnownChainIds.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // ============================================================
  // 3. packages/chain-adapters/src/evm/index.ts
  // ============================================================
  const chainAdaptersEvmIndex = r('packages/chain-adapters/src/evm/index.ts')

  results.push(
    wrap(chainAdaptersEvmIndex, 'chain-adapters-evm-export', () =>
      appendLineAfterPattern(
        chainAdaptersEvmIndex,
        /export \* as \w+ from '\.\/\w+'/,
        `export * as ${c.camelName} from './${c.camelName}'`,
        `export * as ${c.camelName}`,
      ),
    ),
  )

  // ============================================================
  // 4. packages/chain-adapters/src/types.ts
  // ============================================================
  const chainAdaptersTypes = r('packages/chain-adapters/src/types.ts')

  // 4a) ChainAdapterDisplayName enum
  results.push(
    wrap(chainAdaptersTypes, 'types-ChainAdapterDisplayName', () =>
      insertIntoNamedNode(
        chainAdaptersTypes,
        'ChainAdapterDisplayName',
        `  ${c.pascalName} = '${c.pascalName}',\n`,
        `${c.pascalName} = '${c.pascalName}'`,
      ),
    ),
  )

  // 4b) ChainSpecificAccount - insert before UTXO section (stable separator)
  results.push(
    wrap(chainAdaptersTypes, 'types-ChainSpecificAccount', () =>
      insertAtPosition(
        chainAdaptersTypes,
        `\n    [KnownChainIds.BitcoinMainnet]: utxo.Account`,
        true,
        `    [KnownChainIds.${c.pascalName}Mainnet]: evm.Account\n`,
        `KnownChainIds.${c.pascalName}Mainnet]: evm.Account`,
      ),
    ),
  )

  // 4c) ChainSpecificFeeData - insert before UTXO section (stable separator)
  results.push(
    wrap(chainAdaptersTypes, 'types-ChainSpecificFeeData', () =>
      insertAtPosition(
        chainAdaptersTypes,
        `\n    [KnownChainIds.BitcoinMainnet]: utxo.FeeData`,
        true,
        `    [KnownChainIds.${c.pascalName}Mainnet]: evm.FeeData\n`,
        `KnownChainIds.${c.pascalName}Mainnet]: evm.FeeData`,
      ),
    ),
  )

  // 4d) ChainSpecificBuildTxInput - insert before UTXO section (stable separator)
  results.push(
    wrap(chainAdaptersTypes, 'types-ChainSignTx', () =>
      insertAtPosition(
        chainAdaptersTypes,
        `\n    [KnownChainIds.BitcoinMainnet]: utxo.BuildTxInput`,
        true,
        `    [KnownChainIds.${c.pascalName}Mainnet]: evm.BuildTxInput\n`,
        `KnownChainIds.${c.pascalName}Mainnet]: evm.BuildTxInput`,
      ),
    ),
  )

  // 4e) ChainSpecificGetFeeDataInput - insert before UTXO section (stable separator)
  results.push(
    wrap(chainAdaptersTypes, 'types-ChainSpecificGetFeeData', () =>
      insertAtPosition(
        chainAdaptersTypes,
        `\n    [KnownChainIds.BitcoinMainnet]: utxo.GetFeeDataInput`,
        true,
        `    [KnownChainIds.${c.pascalName}Mainnet]: evm.GetFeeDataInput\n`,
        `KnownChainIds.${c.pascalName}Mainnet]: evm.GetFeeDataInput`,
      ),
    ),
  )

  // ============================================================
  // 5. packages/contracts/src/viemClient.ts
  // ============================================================
  const viemClientFile = r('packages/contracts/src/viemClient.ts')

  // 5a) Add to viem/chains import
  results.push(
    wrap(viemClientFile, 'viemClient-import', () =>
      addNamedImport(viemClientFile, 'viem/chains', c.viemChainName),
    ),
  )

  // 5b) Add client const — anchor after SEI client's unique transport closing line
  // SEI uses fallback([VITE_SEI_NODE_URL].filter...) which is unique among all clients
  results.push(
    wrap(viemClientFile, 'viemClient-const', () =>
      insertAtPosition(
        viemClientFile,
        `transport: fallback([process.env.VITE_SEI_NODE_URL].filter(Boolean).map(url => http(url))),\n}) as PublicClient`,
        false,
        `\n\nexport const viem${c.pascalName}Client = createPublicClient({\n  chain: ${c.viemChainName},\n  transport: createFallbackTransport(process.env.VITE_${c.upperName}_NODE_URL, FALLBACK_RPC_URLS.${c.camelName}),\n}) as PublicClient`,
        `viem${c.pascalName}Client`,
      ),
    ),
  )

  // 5c) viemClientByChainId
  results.push(
    wrap(viemClientFile, 'viemClient-byChainId', () =>
      insertIntoNamedNode(
        viemClientFile,
        'viemClientByChainId',
        `  [KnownChainIds.${c.pascalName}Mainnet]: viem${c.pascalName}Client,\n`,
        `KnownChainIds.${c.pascalName}Mainnet]: viem${c.pascalName}Client`,
      ),
    ),
  )

  // 5d) viemNetworkIdByChainId
  results.push(
    wrap(viemClientFile, 'viemClient-networkId', () =>
      insertIntoNamedNode(
        viemClientFile,
        'viemNetworkIdByChainId',
        `  [KnownChainIds.${c.pascalName}Mainnet]: ${c.viemChainName}.id,\n`,
        `KnownChainIds.${c.pascalName}Mainnet]: ${c.viemChainName}.id`,
      ),
    ),
  )

  // 5e) viemClientByNetworkId
  results.push(
    wrap(viemClientFile, 'viemClient-byNetworkId', () =>
      insertIntoNamedNode(
        viemClientFile,
        'viemClientByNetworkId',
        `  [${c.viemChainName}.id]: viem${c.pascalName}Client,\n`,
        `[${c.viemChainName}.id]: viem${c.pascalName}Client`,
      ),
    ),
  )

  // ============================================================
  // 6. packages/contracts/src/fallbackRpcUrls.ts
  // ============================================================
  const fallbackRpcFile = r('packages/contracts/src/fallbackRpcUrls.ts')

  results.push(
    wrap(fallbackRpcFile, 'fallbackRpcUrls', () =>
      insertIntoNamedNode(
        fallbackRpcFile,
        'FALLBACK_RPC_URLS',
        `  ${c.camelName}: ${JSON.stringify(c.fallbackRpcUrls)},\n`,
        `${c.camelName}:`,
      ),
    ),
  )

  // ============================================================
  // 7. packages/contracts/src/ethersProviderSingleton.ts
  // ============================================================
  const ethersProviderFile = r('packages/contracts/src/ethersProviderSingleton.ts')

  results.push(
    wrap(ethersProviderFile, 'ethersProvider-switch', () =>
      insertIntoSwitch(
        ethersProviderFile,
        'rpcUrlByChainId',
        `      case KnownChainIds.${c.pascalName}Mainnet:\n        return process.env.VITE_${c.upperName}_NODE_URL\n`,
        `KnownChainIds.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // ============================================================
  // 8. src/state/slices/preferencesSlice/preferencesSlice.ts
  // ============================================================
  const preferencesFile = r('src/state/slices/preferencesSlice/preferencesSlice.ts')

  // 8a) FeatureFlags interface - use AST to always insert at end of interface
  results.push(
    wrap(preferencesFile, 'preferences-FeatureFlags', () =>
      insertIntoNamedNode(
        preferencesFile,
        'FeatureFlags',
        `  ${c.pascalName}: boolean\n`,
        `${c.pascalName}: boolean`,
      ),
    ),
  )

  // 8b) featureFlags initialState - last-match so new chains go after previously-added chains
  results.push(
    wrap(preferencesFile, 'preferences-featureFlags-init', () =>
      appendLineAfterLastPattern(
        preferencesFile,
        /\w+: getConfig\(\)\.VITE_FEATURE_\w+,/,
        `    ${c.pascalName}: getConfig().VITE_FEATURE_${c.upperName},`,
        `${c.pascalName}: getConfig().VITE_FEATURE_${c.upperName}`,
      ),
    ),
  )

  // ============================================================
  // 8b. src/test/mocks/store.ts - feature flags mock
  // ============================================================
  const storeMockFile = r('src/test/mocks/store.ts')

  results.push(
    wrap(storeMockFile, 'store-mock-featureFlag', () =>
      appendLineAfterLastPattern(
        storeMockFile,
        /^ {6}[A-Z]\w+: false,/m,
        `      ${c.pascalName}: false,`,
        `${c.pascalName}: false,`,
      ),
    ),
  )

  // ============================================================
  // 9. src/constants/chains.ts
  // ============================================================
  const chainsConstFile = r('src/constants/chains.ts')

  // 9a) SECOND_CLASS_CHAINS array
  results.push(
    wrap(chainsConstFile, 'chains-SECOND_CLASS_CHAINS', () =>
      insertIntoNamedNode(
        chainsConstFile,
        'SECOND_CLASS_CHAINS',
        `  KnownChainIds.${c.pascalName}Mainnet,\n`,
        `KnownChainIds.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // 9b) knownChainIds feature flag filter - last-match so new chains go after previously-added chains
  results.push(
    wrap(chainsConstFile, 'chains-knownChainIds-filter', () =>
      appendLineAfterLastPattern(
        chainsConstFile,
        /if \(chainId === KnownChainIds\.\w+Mainnet && !enabledFlags\.\w+\) return false/,
        `  if (chainId === KnownChainIds.${c.pascalName}Mainnet && !enabledFlags.${c.pascalName}) return false`,
        `KnownChainIds.${c.pascalName}Mainnet && !enabledFlags.${c.pascalName}`,
      ),
    ),
  )

  // ============================================================
  // 10. src/config.ts
  // ============================================================
  const configFile = r('src/config.ts')

  results.push(
    wrap(configFile, 'config-node-url', () =>
      appendLineAfterLastPattern(
        configFile,
        /VITE_\w+_NODE_URL: url\(\)/,
        `  VITE_${c.upperName}_NODE_URL: url(),`,
        `VITE_${c.upperName}_NODE_URL`,
      ),
    ),
  )

  results.push(
    wrap(configFile, 'config-feature-flag', () =>
      appendLineAfterLastPattern(
        configFile,
        /VITE_FEATURE_\w+: bool\(\{ default: false \}\)/,
        `  VITE_FEATURE_${c.upperName}: bool({ default: false }),`,
        `VITE_FEATURE_${c.upperName}`,
      ),
    ),
  )

  // ============================================================
  // 11. src/vite-env.d.ts
  // ============================================================
  const viteEnvFile = r('src/vite-env.d.ts')

  results.push(
    wrap(viteEnvFile, 'vite-env-node-url', () =>
      appendLineAfterLastPattern(
        viteEnvFile,
        /readonly VITE_\w+_NODE_URL: string/,
        `    readonly VITE_${c.upperName}_NODE_URL: string`,
        `VITE_${c.upperName}_NODE_URL`,
      ),
    ),
  )

  results.push(
    wrap(viteEnvFile, 'vite-env-feature-flag', () =>
      appendLineAfterLastPattern(
        viteEnvFile,
        /readonly VITE_FEATURE_\w+: string/,
        `    readonly VITE_FEATURE_${c.upperName}: string`,
        `VITE_FEATURE_${c.upperName}`,
      ),
    ),
  )

  // ============================================================
  // 12. .env and .env.development
  // ============================================================
  const envFile = r('.env')
  const envDevFile = r('.env.development')

  results.push(
    wrap(envFile, 'env-node-url', () =>
      appendLineAfterLastPattern(
        envFile,
        /VITE_\w+_NODE_URL=/,
        `VITE_${c.upperName}_NODE_URL=`,
        `VITE_${c.upperName}_NODE_URL`,
      ),
    ),
  )

  results.push(
    wrap(envFile, 'env-feature-flag', () =>
      appendLineAfterLastPattern(
        envFile,
        /VITE_FEATURE_\w+=false/,
        `VITE_FEATURE_${c.upperName}=false`,
        `VITE_FEATURE_${c.upperName}`,
      ),
    ),
  )

  results.push(
    wrap(envDevFile, 'env-dev-node-url', () =>
      appendLineAfterLastPattern(
        envDevFile,
        /VITE_\w+_NODE_URL=/,
        `VITE_${c.upperName}_NODE_URL=${c.rpcUrl}`,
        `VITE_${c.upperName}_NODE_URL`,
      ),
    ),
  )

  results.push(
    wrap(envDevFile, 'env-dev-feature-flag', () =>
      appendLineAfterLastPattern(
        envDevFile,
        /VITE_FEATURE_\w+=true/,
        `VITE_FEATURE_${c.upperName}=true`,
        `VITE_FEATURE_${c.upperName}`,
      ),
    ),
  )

  // ============================================================
  // 13. packages/utils/src/assetData/baseAssets.ts
  // ============================================================
  const baseAssetsFile = r('packages/utils/src/assetData/baseAssets.ts')

  results.push(
    wrap(baseAssetsFile, 'baseAssets-export', () => {
      const assetObj = `
export const ${c.camelName}: Readonly<Asset> = Object.freeze({
  assetId: caip.${c.camelName}AssetId,
  chainId: caip.${c.camelName}ChainId,
  name: '${c.nativeName}',
  networkName: '${c.pascalName}',
  symbol: '${c.nativeSymbol}',
  precision: ${c.nativePrecision},
  color: '${c.color}',
  networkColor: '${c.color}',
  icon: '${c.nativeIconUrl}',
  networkIcon: '${c.networkIconUrl}',
  explorer: '${c.explorerUrl}',
  explorerAddressLink: '${c.explorerAddressLink}',
  explorerTxLink: '${c.explorerTxLink}',
  relatedAssetKey: '${c.relatedAssetKey}',
})
`
      return appendAfterLastImport(baseAssetsFile, assetObj, `${c.camelName}: Readonly<Asset>`)
    }),
  )

  // ============================================================
  // 14. packages/utils/src/assetData/getBaseAsset.ts
  // ============================================================
  const getBaseAssetFile = r('packages/utils/src/assetData/getBaseAsset.ts')

  // 14a) Import
  results.push(
    wrap(getBaseAssetFile, 'getBaseAsset-import', () =>
      addNamedImport(getBaseAssetFile, './baseAssets', c.camelName),
    ),
  )

  // 14b) Switch case - insert before default
  results.push(
    wrap(getBaseAssetFile, 'getBaseAsset-switch', () =>
      insertIntoSwitch(
        getBaseAssetFile,
        'getBaseAsset',
        `    case KnownChainIds.${c.pascalName}Mainnet:\n      return ${c.camelName}\n`,
        `KnownChainIds.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // ============================================================
  // 15. packages/utils/src/chainIdToFeeAssetId.ts
  // ============================================================
  const chainIdToFeeFile = r('packages/utils/src/chainIdToFeeAssetId.ts')

  // 15a) Import assetId from caip
  results.push(
    wrap(chainIdToFeeFile, 'chainIdToFeeAssetId-import', () =>
      addNamedImport(chainIdToFeeFile, '@shapeshiftoss/caip', `${c.camelName}AssetId`),
    ),
  )

  // 15b) Switch case
  results.push(
    wrap(chainIdToFeeFile, 'chainIdToFeeAssetId-switch', () =>
      insertIntoSwitch(
        chainIdToFeeFile,
        'chainIdToFeeAssetId',
        `    case KnownChainIds.${c.pascalName}Mainnet:\n      return ${c.camelName}AssetId\n`,
        `KnownChainIds.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // ============================================================
  // 16. packages/utils/src/getChainShortName.ts
  // ============================================================
  const getChainShortNameFile = r('packages/utils/src/getChainShortName.ts')

  results.push(
    wrap(getChainShortNameFile, 'getChainShortName-switch', () =>
      insertIntoSwitch(
        getChainShortNameFile,
        'getChainShortName',
        `    case KnownChainIds.${c.pascalName}Mainnet:\n      return '${c.shortName}'\n`,
        `KnownChainIds.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // ============================================================
  // 17. packages/utils/src/getNativeFeeAssetReference.ts
  // ============================================================
  const getNativeFeeFile = r('packages/utils/src/getNativeFeeAssetReference.ts')

  // Nested switch (inside Evm namespace case) - use last-match on generic pattern
  results.push(
    wrap(getNativeFeeFile, 'getNativeFeeAssetReference-switch', () =>
      appendLineAfterLastPattern(
        getNativeFeeFile,
        /case CHAIN_REFERENCE\.\w+Mainnet:\s*\n\s*return ASSET_REFERENCE\.\w+/,
        `          case CHAIN_REFERENCE.${c.pascalName}Mainnet:\n            return ASSET_REFERENCE.${c.pascalName}`,
        `CHAIN_REFERENCE.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // ============================================================
  // 18. packages/utils/src/getAssetNamespaceFromChainId.ts
  // ============================================================
  const getAssetNsFile = r('packages/utils/src/getAssetNamespaceFromChainId.ts')

  // Fall-through case before erc20 return - last-match so new chains go after previously-added chains
  results.push(
    wrap(getAssetNsFile, 'getAssetNamespace-switch', () =>
      appendLineAfterLastPattern(
        getAssetNsFile,
        /case KnownChainIds\.\w+Mainnet:/,
        `    case KnownChainIds.${c.pascalName}Mainnet:`,
        `KnownChainIds.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // ============================================================
  // 19. packages/caip/src/adapters/coingecko/index.ts
  // ============================================================
  const coingeckoAdapterFile = r('packages/caip/src/adapters/coingecko/index.ts')

  // 19a) Import chainId from caip
  results.push(
    wrap(coingeckoAdapterFile, 'coingecko-import-chainId', () =>
      addNamedImport(coingeckoAdapterFile, '../../constants', `${c.camelName}ChainId`),
    ),
  )

  // 19b) CoingeckoAssetPlatform enum
  results.push(
    wrap(coingeckoAdapterFile, 'coingecko-enum', () =>
      insertIntoNamedNode(
        coingeckoAdapterFile,
        'CoingeckoAssetPlatform',
        `  ${c.pascalName} = '${c.coingeckoPlatform}',\n`,
        `${c.pascalName} = '${c.coingeckoPlatform}'`,
      ),
    ),
  )

  // 19c) chainIdToCoingeckoAssetPlatform switch - use AST to always insert before default
  results.push(
    wrap(coingeckoAdapterFile, 'coingecko-chainIdToPlatform', () =>
      insertIntoSwitch(
        coingeckoAdapterFile,
        'chainIdToCoingeckoAssetPlatform',
        `        case CHAIN_REFERENCE.${c.pascalName}Mainnet:\n          return CoingeckoAssetPlatform.${c.pascalName}\n`,
        `CoingeckoAssetPlatform.${c.pascalName}`,
      ),
    ),
  )

  // 19d) coingeckoAssetPlatformToChainId switch - use AST to always insert before default
  results.push(
    wrap(coingeckoAdapterFile, 'coingecko-platformToChainId', () =>
      insertIntoSwitch(
        coingeckoAdapterFile,
        'coingeckoAssetPlatformToChainId',
        `    case CoingeckoAssetPlatform.${c.pascalName}:\n      return ${c.camelName}ChainId\n`,
        `return ${c.camelName}ChainId`,
      ),
    ),
  )

  // ============================================================
  // 20. headers/csps/index.ts
  // ============================================================
  const cspsIndexFile = r('headers/csps/index.ts')

  // 20a) Import CSP
  results.push(
    wrap(cspsIndexFile, 'csps-import', () =>
      addImportLine(
        cspsIndexFile,
        `import { csp as ${c.camelName} } from './chains/${c.camelName}'`,
        `from './chains/${c.camelName}'`,
      ),
    ),
  )

  // 20b) Add to CSP array - insert at end (before closing `)`) using named node
  results.push(
    wrap(cspsIndexFile, 'csps-array', () =>
      appendLineAfterLastPattern(
        cspsIndexFile,
        /^\s+\w+,$/m,
        `  ${c.camelName},`,
        `  ${c.camelName},`,
      ),
    ),
  )

  // ============================================================
  // 21. src/plugins/activePlugins.ts
  // ============================================================
  const activePluginsFile = r('src/plugins/activePlugins.ts')

  // 21a) Import plugin
  results.push(
    wrap(activePluginsFile, 'activePlugins-import', () =>
      addImportLine(
        activePluginsFile,
        `import ${c.camelName} from '@/plugins/${c.camelName}'`,
        `'@/plugins/${c.camelName}'`,
      ),
    ),
  )

  // 21b) Add to activePlugins array
  results.push(
    wrap(activePluginsFile, 'activePlugins-array', () =>
      insertIntoNamedNode(
        activePluginsFile,
        'activePlugins',
        `  ${c.camelName},\n`,
        `  ${c.camelName},`,
      ),
    ),
  )

  // ============================================================
  // 22-31. HDWallet files
  // ============================================================

  // 22. packages/hdwallet-core/src/ethereum.ts - interface field (use AST named node)
  const hdwalletEthFile = r('packages/hdwallet-core/src/ethereum.ts')
  results.push(
    wrap(hdwalletEthFile, 'hdwallet-core-ethereum-interface', () =>
      insertIntoNamedNode(
        hdwalletEthFile,
        'ETHWalletInfo',
        `  readonly _supports${c.pascalName}: boolean\n`,
        `_supports${c.pascalName}`,
      ),
    ),
  )

  // 23. packages/hdwallet-core/src/wallet.ts - supportsX function (last-match on generic pattern)
  const hdwalletWalletFile = r('packages/hdwallet-core/src/wallet.ts')
  results.push(
    wrap(hdwalletWalletFile, 'hdwallet-core-wallet-supports', () =>
      appendLineAfterLastPattern(
        hdwalletWalletFile,
        /export function supports\w+\(wallet: HDWallet\): wallet is ETHWallet \{[\s\S]*?\}/,
        `\nexport function supports${c.pascalName}(wallet: HDWallet): wallet is ETHWallet {\n  return isObject(wallet) && (wallet as any)._supports${c.pascalName}\n}`,
        `supports${c.pascalName}`,
      ),
    ),
  )

  // 24-31. HDWallet implementations - add _supportsX = true
  const hdwalletImplFiles = [
    r('packages/hdwallet-native/src/ethereum.ts'),
    r('packages/hdwallet-ledger/src/ledger.ts'),
    r('packages/hdwallet-trezor/src/trezor.ts'),
    r('packages/hdwallet-phantom/src/phantom.ts'),
    r('packages/hdwallet-metamask-multichain/src/native-multichain.ts'),
    r('packages/hdwallet-metamask-multichain/src/shapeshift-multichain.ts'),
    r('packages/hdwallet-walletconnectv2/src/walletconnectV2.ts'),
    r('packages/hdwallet-coinbase/src/coinbase.ts'),
    r('packages/hdwallet-keepkey/src/keepkey.ts'),
    r('packages/hdwallet-gridplus/src/gridplus.ts'),
    r('packages/hdwallet-vultisig/src/vultisig.ts'),
  ]

  // Wallets that support all EVM chains get `= true`, limited wallets get `= false`
  const falseWallets = new Set([
    r('packages/hdwallet-phantom/src/phantom.ts'),
    r('packages/hdwallet-coinbase/src/coinbase.ts'),
    r('packages/hdwallet-keepkey/src/keepkey.ts'),
    r('packages/hdwallet-gridplus/src/gridplus.ts'),
    r('packages/hdwallet-vultisig/src/vultisig.ts'),
  ])

  for (const implFile of hdwalletImplFiles) {
    const shortName = implFile.replace(ROOT + '/', '')
    const supportsValue = falseWallets.has(implFile) ? 'false' : 'true'
    // Use last-match on generic pattern so new chains always go after previously-added chains
    const anchorPattern = falseWallets.has(implFile)
      ? /readonly _supports\w+ = false/
      : /readonly _supports\w+ = true/
    results.push(
      wrap(implFile, `hdwallet-${shortName}-supports`, () =>
        appendLineAfterLastPattern(
          implFile,
          anchorPattern,
          `  readonly _supports${c.pascalName} = ${supportsValue}`,
          `_supports${c.pascalName}`,
        ),
      ),
    )
  }

  // ============================================================
  // 32. packages/chain-adapters/src/evm/EvmBaseAdapter.ts
  // ============================================================
  const evmBaseAdapterFile = r('packages/chain-adapters/src/evm/EvmBaseAdapter.ts')

  // 32a) Add to evmChainIds array - append at true end (before `] as const`)
  results.push(
    wrap(evmBaseAdapterFile, 'EvmBaseAdapter-evmChainIds', () =>
      insertAtPosition(
        evmBaseAdapterFile,
        `\n] as const\n\nexport type EvmChainAdapter`,
        true,
        `  KnownChainIds.${c.pascalName}Mainnet,`,
        `KnownChainIds.${c.pascalName}Mainnet,`,
      ),
    ),
  )

  // 32b) Add to targetNetwork object - append at true end (before `}[this.chainId]`)
  const nativeSymbol = c.nativeSymbol
  const nativeName = c.nativeName
  results.push(
    wrap(evmBaseAdapterFile, 'EvmBaseAdapter-targetNetwork', () =>
      insertAtPosition(
        evmBaseAdapterFile,
        `\n    }[this.chainId]`,
        true,
        `\n      [KnownChainIds.${c.pascalName}Mainnet]: {\n        name: '${nativeName}',\n        symbol: '${nativeSymbol}',\n        explorer: '${c.explorerUrl}',\n      },`,
        `KnownChainIds.${c.pascalName}Mainnet]: {`,
      ),
    ),
  )

  // 32c) Import supportsX
  results.push(
    wrap(evmBaseAdapterFile, 'EvmBaseAdapter-import-supports', () =>
      addNamedImport(evmBaseAdapterFile, '@shapeshiftoss/hdwallet-core', `supports${c.pascalName}`),
    ),
  )

  // 32d) Add switch case in assertSupportsChain - last-match so new chains go after previously-added
  results.push(
    wrap(evmBaseAdapterFile, 'EvmBaseAdapter-switch', () =>
      appendLineAfterLastPattern(
        evmBaseAdapterFile,
        /case Number\(fromChainId\(KnownChainIds\.\w+Mainnet\)\.chainReference\):\n\s+return supports\w+\(wallet\)/,
        `        case Number(fromChainId(KnownChainIds.${c.pascalName}Mainnet).chainReference):\n          return supports${c.pascalName}(wallet)`,
        `supports${c.pascalName}(wallet)`,
      ),
    ),
  )

  // ============================================================
  // 33. scripts/generateAssetData/generateAssetData.ts
  // ============================================================
  const genAssetDataFile = r('scripts/generateAssetData/generateAssetData.ts')

  // 33a) Import
  results.push(
    wrap(genAssetDataFile, 'generateAssetData-import', () =>
      addImportLine(
        genAssetDataFile,
        `import * as ${c.camelName} from './${c.camelName}'`,
        `from './${c.camelName}'`,
      ),
    ),
  )

  // 33b) getAssets() call - last-match so new chains go after previously-added chains
  results.push(
    wrap(genAssetDataFile, 'generateAssetData-getAssets', () =>
      appendLineAfterLastPattern(
        genAssetDataFile,
        /const \w+Assets = await \w+\.getAssets\(\)/,
        `  const ${c.camelName}Assets = await ${c.camelName}.getAssets()`,
        `${c.camelName}Assets = await ${c.camelName}.getAssets()`,
      ),
    ),
  )

  // 33c) Spread into combined array - last-match
  results.push(
    wrap(genAssetDataFile, 'generateAssetData-spread', () =>
      appendLineAfterLastPattern(
        genAssetDataFile,
        /\.\.\.\w+Assets,/,
        `    ...${c.camelName}Assets,`,
        `...${c.camelName}Assets`,
      ),
    ),
  )

  // ============================================================
  // 34. scripts/generateAssetData/coingecko.ts
  // ============================================================
  const coingeckoFile = r('scripts/generateAssetData/coingecko.ts')

  // 34a) Import chainId
  results.push(
    wrap(coingeckoFile, 'coingecko-gen-import-chainId', () =>
      addNamedImport(coingeckoFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
    ),
  )

  // 34b) Import base asset
  results.push(
    wrap(coingeckoFile, 'coingecko-gen-import-baseAsset', () =>
      addNamedImport(coingeckoFile, '@shapeshiftoss/utils', c.camelName),
    ),
  )

  // 34c) Switch case for chain data - use AST to insert before default
  results.push(
    wrap(coingeckoFile, 'coingecko-gen-switch', () =>
      insertIntoSwitch(
        coingeckoFile,
        'getAssets',
        `      case ${c.camelName}ChainId:\n        return {\n          assetNamespace: ASSET_NAMESPACE.erc20,\n          category: adapters.chainIdToCoingeckoAssetPlatform(chainId),\n          explorer: ${c.camelName}.explorer,\n          explorerAddressLink: ${c.camelName}.explorerAddressLink,\n          explorerTxLink: ${c.camelName}.explorerTxLink,\n        }\n`,
        `case ${c.camelName}ChainId:`,
      ),
    ),
  )

  // ============================================================
  // 35. src/lib/coingecko/utils.ts
  // ============================================================
  const coingeckoUtilsFile = r('src/lib/coingecko/utils.ts')

  // 35a) Import chainId
  results.push(
    wrap(coingeckoUtilsFile, 'coingecko-utils-import', () =>
      addNamedImport(coingeckoUtilsFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
    ),
  )

  // 35b) Feature-gated chain ID array entry - last-match so new chains go after previously-added
  results.push(
    wrap(coingeckoUtilsFile, 'coingecko-utils-chain', () =>
      appendLineAfterLastPattern(
        coingeckoUtilsFile,
        /\.\.\.\(getConfig\(\)\.VITE_FEATURE_\w+ \? \[\w+ChainId\] : \[\]\)/,
        `    ...(getConfig().VITE_FEATURE_${c.upperName} ? [${c.camelName}ChainId] : []),`,
        `VITE_FEATURE_${c.upperName} ? [${c.camelName}ChainId]`,
      ),
    ),
  )

  // ============================================================
  // 36. src/state/slices/opportunitiesSlice/mappings.ts
  // ============================================================
  const opportunitiesMappingsFile = r('src/state/slices/opportunitiesSlice/mappings.ts')

  results.push(
    wrap(opportunitiesMappingsFile, 'opportunities-mapping', () =>
      insertIntoNamedNode(
        opportunitiesMappingsFile,
        'CHAIN_ID_TO_SUPPORTED_DEFI_OPPORTUNITIES',
        `  [KnownChainIds.${c.pascalName}Mainnet]: [],\n`,
        `KnownChainIds.${c.pascalName}Mainnet]: []`,
      ),
    ),
  )

  // ============================================================
  // 37. src/state/migrations/index.ts
  // ============================================================
  const migrationsFile = r('src/state/migrations/index.ts')

  results.push(
    wrap(migrationsFile, 'migrations-clearAssets', () => {
      const src = fs.readFileSync(migrationsFile, 'utf8')
      const matches = [...src.matchAll(/(\d+): clearAssets,/g)]
      if (!matches.length) {
        console.warn('[codemods] Could not find any clearAssets migration entries')
        return false
      }
      const lastNum = Math.max(...matches.map(m => parseInt(m[1], 10)))
      const nextNum = lastNum + 1
      if (src.includes(`${nextNum}: clearAssets`)) return false
      return appendLineAfterPattern(
        migrationsFile,
        new RegExp(`${lastNum}: clearAssets,`),
        `  ${nextNum}: clearAssets,`,
        `${nextNum}: clearAssets`,
      )
    }),
  )

  // ============================================================
  // 38. packages/chain-adapters/src/evm/SecondClassEvmAdapter.ts - WRAPPED_NATIVE
  // ============================================================
  if (c.wrappedNativeAddress) {
    const secondClassFile = r('packages/chain-adapters/src/evm/SecondClassEvmAdapter.ts')

    results.push(
      wrap(secondClassFile, 'SecondClassEvm-wrappedNative', () =>
        insertIntoNamedNode(
          secondClassFile,
          'WRAPPED_NATIVE_CONTRACT_BY_CHAIN_ID',
          `  [${c.camelName}ChainId]: '${c.wrappedNativeAddress}',\n`,
          `[${c.camelName}ChainId]: '${c.wrappedNativeAddress}'`,
        ),
      ),
    )

    // Import chainId for SecondClassEvmAdapter
    results.push(
      wrap(secondClassFile, 'SecondClassEvm-import', () =>
        addNamedImport(secondClassFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
      ),
    )
  }

  // ============================================================
  // 39-43. Conditional swapper insertions
  // ============================================================

  // 39. Relay swapper
  if (c.swappers.relay.supported && c.swappers.relay.relayChainId) {
    const relayConstFile = r('packages/swapper/src/swappers/RelaySwapper/constant.ts')
    results.push(
      wrap(relayConstFile, 'relay-import', () =>
        addNamedImport(relayConstFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
      ),
    )
    results.push(
      wrap(relayConstFile, 'relay-chainIdToRelayChainId', () =>
        insertIntoNamedNode(
          relayConstFile,
          'chainIdToRelayChainId',
          `  [${c.camelName}ChainId]: ${c.swappers.relay.relayChainId},\n`,
          `[${c.camelName}ChainId]:`,
        ),
      ),
    )

    // relayTokenToAssetId - native asset case (insert before default: throw)
    const relayTokenToAssetIdFile = r(
      'packages/swapper/src/swappers/RelaySwapper/utils/relayTokenToAssetId.ts',
    )
    results.push(
      wrap(relayTokenToAssetIdFile, 'relay-tokenToAssetId', () =>
        insertAtPosition(
          relayTokenToAssetIdFile,
          `\n      default:\n        throw Error(`,
          true,
          `\n      case CHAIN_REFERENCE.${c.pascalName}Mainnet:\n        return {\n          assetReference: ASSET_REFERENCE.${c.pascalName},\n          assetNamespace: ASSET_NAMESPACE.slip44,\n        }`,
          `ASSET_REFERENCE.${c.pascalName}`,
        ),
      ),
    )
  }

  // 40. Across swapper - conditional
  if (c.swappers.across.supported) {
    const acrossConstFile = r('packages/swapper/src/swappers/AcrossSwapper/constant.ts')
    if (fs.existsSync(acrossConstFile)) {
      results.push(
        wrap(acrossConstFile, 'across-chain-support', () =>
          addNamedImport(acrossConstFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
        ),
      )
    }
  }

  // 41. Portals swapper - conditional
  if (c.swappers.portals.supported) {
    const portalsConstFile = r('packages/swapper/src/swappers/PortalsSwapper/constants.ts')
    if (fs.existsSync(portalsConstFile)) {
      results.push(
        wrap(portalsConstFile, 'portals-chain-support', () =>
          addNamedImport(portalsConstFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
        ),
      )
    }
  }

  // 42. Zerion - conditional
  if (c.swappers.zerion.supported) {
    const zerionFile = r('packages/types/src/zerion.ts')
    if (fs.existsSync(zerionFile)) {
      results.push(
        wrap(zerionFile, 'zerion-chain-support', () =>
          addNamedImport(zerionFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
        ),
      )
    }
  }

  // ============================================================
  // 44. src/context/WalletProvider/WalletConnectV2/config.ts
  // ============================================================
  const wcConfigFile = r('src/context/WalletProvider/WalletConnectV2/config.ts')

  // Add viem chain import
  results.push(
    wrap(wcConfigFile, 'wc-import', () =>
      addNamedImport(wcConfigFile, 'viem/chains', c.viemChainName),
    ),
  )

  // Add to optional chains array (uses insertIntoNamedNode for robustness)
  results.push(
    wrap(wcConfigFile, 'wc-optionalChains', () =>
      insertIntoNamedNode(
        wcConfigFile,
        'optionalViemChains',
        `\n    ${c.viemChainName},`,
        `    ${c.viemChainName},`,
      ),
    ),
  )

  // Add VITE_X_NODE_URL to getConfig() destructuring
  results.push(
    wrap(wcConfigFile, 'wc-rpcMap-destruct', () =>
      insertAtPosition(
        wcConfigFile,
        '\n} = getConfig()',
        true,
        `\n  VITE_${c.upperName}_NODE_URL,`,
        `VITE_${c.upperName}_NODE_URL,`,
      ),
    ),
  )

  // Add rpcMap entry
  results.push(
    wrap(wcConfigFile, 'wc-rpcMap-entry', () =>
      appendLineAfterLastPattern(
        wcConfigFile,
        /\[CHAIN_REFERENCE\.\w+Mainnet\]: VITE_\w+_NODE_URL,/,
        `    [CHAIN_REFERENCE.${c.pascalName}Mainnet]: VITE_${c.upperName}_NODE_URL,`,
        `CHAIN_REFERENCE.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // ============================================================
  // 44b. packages/caip/src/adapters/coingecko/utils.ts
  // ============================================================
  const coingeckoAdapterUtilsFile = r('packages/caip/src/adapters/coingecko/utils.ts')

  // Import assetId + chainId
  results.push(
    wrap(coingeckoAdapterUtilsFile, 'coingecko-utils-import-assetId', () =>
      addNamedImport(coingeckoAdapterUtilsFile, '../../constants', `${c.camelName}AssetId`),
    ),
  )
  results.push(
    wrap(coingeckoAdapterUtilsFile, 'coingecko-utils-import-chainId', () =>
      addNamedImport(coingeckoAdapterUtilsFile, '../../constants', `${c.camelName}ChainId`),
    ),
  )

  // Add if-block inside parseData reduce
  const coingeckoAdapterUtilsBlock = `
      if (Object.keys(platforms).includes(CoingeckoAssetPlatform.${c.pascalName})) {
        try {
          const assetId = toAssetId({
            chainNamespace: CHAIN_NAMESPACE.Evm,
            chainReference: CHAIN_REFERENCE.${c.pascalName}Mainnet,
            assetNamespace: 'erc20',
            assetReference: platforms[CoingeckoAssetPlatform.${c.pascalName}],
          })
          prev[${c.camelName}ChainId][assetId] = id
        } catch {
          // unable to create assetId, skip token
        }
      }

`
  results.push(
    wrap(coingeckoAdapterUtilsFile, 'coingecko-utils-buildByChainId', () =>
      appendLineAfterLastPattern(
        coingeckoAdapterUtilsFile,
        /\/\/ unable to create assetId, skip token\n\s+\}\n\s+\}/,
        coingeckoAdapterUtilsBlock.trimEnd(),
        `CoingeckoAssetPlatform.${c.pascalName}`,
      ),
    ),
  )

  // Add to initial acc of reduce
  const nativeCoingeckoId = c.isNativeEth ? 'ethereum' : c.coingeckoPlatform
  results.push(
    wrap(coingeckoAdapterUtilsFile, 'coingecko-utils-initial-acc', () =>
      appendLineAfterLastPattern(
        coingeckoAdapterUtilsFile,
        /\[\w+ChainId\]: \{ \[\w+AssetId\]: '[\w-]+' \},/,
        `      [${c.camelName}ChainId]: { [${c.camelName}AssetId]: '${nativeCoingeckoId}' },`,
        `[${c.camelName}ChainId]:`,
      ),
    ),
  )

  // ============================================================
  // 44c. generateRelatedAssetIndex.ts (ETH-native chains only)
  // ============================================================
  if (c.isNativeEth) {
    const relatedAssetIndexFile = r(
      'scripts/generateAssetData/generateRelatedAssetIndex/generateRelatedAssetIndex.ts',
    )

    results.push(
      wrap(relatedAssetIndexFile, 'generateRelatedAssetIndex-import', () =>
        addNamedImport(relatedAssetIndexFile, '@shapeshiftoss/caip', `${c.camelName}AssetId`),
      ),
    )

    results.push(
      wrap(relatedAssetIndexFile, 'generateRelatedAssetIndex-ethArray', () =>
        appendLineAfterLastPattern(
          relatedAssetIndexFile,
          /^ {4}\w+AssetId,$/m,
          `    ${c.camelName}AssetId,`,
          `    ${c.camelName}AssetId,`,
        ),
      ),
    )
  }

  // ============================================================
  // 45. src/hooks/useWalletSupportsChain/useWalletSupportsChain.ts
  // ============================================================
  const walletSupportsChainFile = r('src/hooks/useWalletSupportsChain/useWalletSupportsChain.ts')

  // 45a) Import chainId
  results.push(
    wrap(walletSupportsChainFile, 'useWalletSupportsChain-import-chainId', () =>
      addNamedImport(walletSupportsChainFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
    ),
  )

  // 45b) Import supportsX
  results.push(
    wrap(walletSupportsChainFile, 'useWalletSupportsChain-import-supports', () =>
      addNamedImport(
        walletSupportsChainFile,
        '@shapeshiftoss/hdwallet-core/wallet',
        `supports${c.pascalName}`,
      ),
    ),
  )

  // 45c) Feature flag check - last-match so new chains go after previously-added chains
  results.push(
    wrap(walletSupportsChainFile, 'useWalletSupportsChain-featureFlag', () =>
      appendLineAfterLastPattern(
        walletSupportsChainFile,
        /const is\w+Enabled = selectFeatureFlag\(store\.getState\(\), '\w+'\)/,
        `  const is${c.pascalName}Enabled = selectFeatureFlag(store.getState(), '${c.pascalName}')`,
        `is${c.pascalName}Enabled`,
      ),
    ),
  )

  // 45d) Switch case - use AST to insert before default
  results.push(
    wrap(walletSupportsChainFile, 'useWalletSupportsChain-switch', () =>
      insertIntoSwitch(
        walletSupportsChainFile,
        'walletSupportsChain',
        `    case ${c.camelName}ChainId:\n      return is${c.pascalName}Enabled && supports${c.pascalName}(wallet)\n`,
        `case ${c.camelName}ChainId:`,
      ),
    ),
  )

  // ============================================================
  // 46. src/lib/account/evm.ts
  // ============================================================
  const evmAccountFile = r('src/lib/account/evm.ts')

  // 46a) Import chainId
  results.push(
    wrap(evmAccountFile, 'evm-account-import-chainId', () =>
      addNamedImport(evmAccountFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
    ),
  )

  // 46b) Import supportsX
  results.push(
    wrap(evmAccountFile, 'evm-account-import-supports', () =>
      addNamedImport(
        evmAccountFile,
        '@shapeshiftoss/hdwallet-core/wallet',
        `supports${c.pascalName}`,
      ),
    ),
  )

  // 46c) Continue guard - last-match so new chains go after previously-added chains
  results.push(
    wrap(evmAccountFile, 'evm-account-continue', () =>
      appendLineAfterLastPattern(
        evmAccountFile,
        /if \(chainId === \w+ChainId && !supports\w+\(wallet\)\) continue/,
        `    if (chainId === ${c.camelName}ChainId && !supports${c.pascalName}(wallet)) continue`,
        `${c.camelName}ChainId && !supports${c.pascalName}`,
      ),
    ),
  )

  // ============================================================
  // 47. src/context/PluginProvider/PluginProvider.tsx
  // ============================================================
  const pluginProviderFile = r('src/context/PluginProvider/PluginProvider.tsx')

  results.push(
    wrap(pluginProviderFile, 'pluginProvider-featureFlag', () =>
      appendLineAfterLastPattern(
        pluginProviderFile,
        /if \(!featureFlags\.\w+ && chainId === KnownChainIds\.\w+Mainnet\) return false/,
        `      if (!featureFlags.${c.pascalName} && chainId === KnownChainIds.${c.pascalName}Mainnet) return false`,
        `featureFlags.${c.pascalName} && chainId === KnownChainIds.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // ============================================================
  // 48. src/pages/Markets/components/MarketsRow.tsx
  // ============================================================
  const marketsRowFile = r('src/pages/Markets/components/MarketsRow.tsx')

  // 48a) Feature flag hook - last-match so new chains go after previously-added chains
  results.push(
    wrap(marketsRowFile, 'marketsRow-featureFlagHook', () =>
      appendLineAfterLastPattern(
        marketsRowFile,
        /const is\w+Enabled = useAppSelector\(state => selectFeatureFlag\(state, '\w+'\)\)/,
        `  const is${c.pascalName}Enabled = useAppSelector(state => selectFeatureFlag(state, '${c.pascalName}'))`,
        `is${c.pascalName}Enabled`,
      ),
    ),
  )

  // 48b) Filter condition - last-match
  results.push(
    wrap(marketsRowFile, 'marketsRow-filterCondition', () =>
      appendLineAfterLastPattern(
        marketsRowFile,
        /if \(!is\w+Enabled && chainId === KnownChainIds\.\w+Mainnet\) return false/,
        `      if (!is${c.pascalName}Enabled && chainId === KnownChainIds.${c.pascalName}Mainnet) return false`,
        `is${c.pascalName}Enabled && chainId === KnownChainIds.${c.pascalName}Mainnet`,
      ),
    ),
  )

  // 48c) useMemo dependency - last-match
  results.push(
    wrap(marketsRowFile, 'marketsRow-useMemo-dep', () =>
      appendLineAfterLastPattern(
        marketsRowFile,
        /is\w+Enabled,$/m,
        `    is${c.pascalName}Enabled,`,
        `is${c.pascalName}Enabled,`,
      ),
    ),
  )

  // ============================================================
  // 49. src/components/TradeAssetSearch/hooks/useGetPopularAssetsQuery.tsx
  // ============================================================
  const popularAssetsFile = r('src/components/TradeAssetSearch/hooks/useGetPopularAssetsQuery.tsx')

  // 49a) Import assetId
  results.push(
    wrap(popularAssetsFile, 'popularAssets-import', () =>
      addNamedImport(popularAssetsFile, '@shapeshiftoss/caip', `${c.camelName}AssetId`),
    ),
  )

  // 49b) Feature-gated push - last-match so new chains go after previously-added chains
  results.push(
    wrap(popularAssetsFile, 'popularAssets-push', () =>
      appendLineAfterLastPattern(
        popularAssetsFile,
        /if \(enabledFlags\.\w+\) assetIds\.push\(\w+AssetId\)/,
        `  if (enabledFlags.${c.pascalName}) assetIds.push(${c.camelName}AssetId)`,
        `enabledFlags.${c.pascalName}) assetIds.push(${c.camelName}AssetId)`,
      ),
    ),
  )

  // ============================================================
  // 50. src/lib/asset-service/service/AssetService.ts
  // ============================================================
  const assetServiceFile = r('src/lib/asset-service/service/AssetService.ts')

  // 50a) Import chainId
  results.push(
    wrap(assetServiceFile, 'assetService-import', () =>
      addNamedImport(assetServiceFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
    ),
  )

  // 50b) Feature flag filter - last-match so new chains go after previously-added chains
  results.push(
    wrap(assetServiceFile, 'assetService-filter', () =>
      appendLineAfterLastPattern(
        assetServiceFile,
        /if \(!config\.VITE_FEATURE_\w+ && asset\.chainId === \w+ChainId\) return false/,
        `      if (!config.VITE_FEATURE_${c.upperName} && asset.chainId === ${c.camelName}ChainId) return false`,
        `VITE_FEATURE_${c.upperName} && asset.chainId === ${c.camelName}ChainId`,
      ),
    ),
  )

  // ============================================================
  // 51. src/state/slices/portfolioSlice/utils/index.ts
  // ============================================================
  const portfolioUtilsFile = r('src/state/slices/portfolioSlice/utils/index.ts')

  // 51a) Import chainId
  results.push(
    wrap(portfolioUtilsFile, 'portfolioUtils-import-chainId', () =>
      addNamedImport(portfolioUtilsFile, '@shapeshiftoss/caip', `${c.camelName}ChainId`),
    ),
  )

  // 51b) Import supportsX
  results.push(
    wrap(portfolioUtilsFile, 'portfolioUtils-import-supports', () =>
      addNamedImport(
        portfolioUtilsFile,
        '@shapeshiftoss/hdwallet-core/wallet',
        `supports${c.pascalName}`,
      ),
    ),
  )

  // 51c) Chain label case (fall-through with other EVM chains) - last-match for append-only
  results.push(
    wrap(portfolioUtilsFile, 'portfolioUtils-label', () =>
      appendLineAfterLastPattern(
        portfolioUtilsFile,
        /case \w+ChainId:$/m,
        `    case ${c.camelName}ChainId:`,
        `case ${c.camelName}ChainId:`,
      ),
    ),
  )

  // 51d) supportsChain check - use AST to insert before default
  results.push(
    wrap(portfolioUtilsFile, 'portfolioUtils-supportsChain', () =>
      insertIntoSwitch(
        portfolioUtilsFile,
        'isAssetSupportedByWallet',
        `    case ${c.camelName}ChainId:\n      return supports${c.pascalName}(wallet)\n`,
        `return supports${c.pascalName}(wallet)`,
      ),
    ),
  )

  // ============================================================
  // 52. Coingecko test file - increment ETH-native chain count
  // ============================================================
  if (c.isNativeEth) {
    const testFile = r('src/lib/market-service/coingecko/coingecko.test.ts')
    if (fs.existsSync(testFile)) {
      // Find ethOnBlastKey pattern and add ethOnNewChainKey
      results.push(
        wrap(testFile, 'coingecko-test-key', () =>
          appendLineAfterAllPatterns(
            testFile,
            /ethOnBlastKey,/,
            `        ethOn${c.pascalName}Key,`,
            `ethOn${c.pascalName}Key,`,
          ),
        ),
      )
    }
  }

  // ============================================================
  // NEW FILE CREATION: Chain adapter, plugin, asset generator, CSP
  // ============================================================

  // Chain adapter directory and files
  const adapterDir = r(`packages/chain-adapters/src/evm/${c.camelName}`)
  const adapterFile = r(
    `packages/chain-adapters/src/evm/${c.camelName}/${c.pascalName}ChainAdapter.ts`,
  )
  if (!fs.existsSync(adapterFile)) {
    fs.mkdirSync(adapterDir, { recursive: true })
    fs.writeFileSync(adapterFile, fill(tmpl('chainAdapter.ts.tmpl'), c))
    fs.writeFileSync(
      r(`packages/chain-adapters/src/evm/${c.camelName}/index.ts`),
      fill(tmpl('chainAdapterIndex.ts.tmpl'), c),
    )
    results.push({
      file: adapterFile,
      operation: 'create-chain-adapter',
      status: 'inserted',
    })
  } else {
    results.push({
      file: adapterFile,
      operation: 'create-chain-adapter',
      status: 'skipped',
      message: 'already exists',
    })
  }

  // Plugin
  const pluginDir = r(`src/plugins/${c.camelName}`)
  const pluginFile = r(`src/plugins/${c.camelName}/index.tsx`)
  if (!fs.existsSync(pluginFile)) {
    fs.mkdirSync(pluginDir, { recursive: true })
    fs.writeFileSync(pluginFile, fill(tmpl('plugin.tsx.tmpl'), c))
    results.push({
      file: pluginFile,
      operation: 'create-plugin',
      status: 'inserted',
    })
  } else {
    results.push({
      file: pluginFile,
      operation: 'create-plugin',
      status: 'skipped',
      message: 'already exists',
    })
  }

  // Asset generator
  const assetGenDir = r(`scripts/generateAssetData/${c.camelName}`)
  const assetGenFile = r(`scripts/generateAssetData/${c.camelName}/index.ts`)
  if (!fs.existsSync(assetGenFile)) {
    fs.mkdirSync(assetGenDir, { recursive: true })
    fs.writeFileSync(assetGenFile, fill(tmpl('assetGenerator.ts.tmpl'), c))
    results.push({
      file: assetGenFile,
      operation: 'create-asset-generator',
      status: 'inserted',
    })
  } else {
    results.push({
      file: assetGenFile,
      operation: 'create-asset-generator',
      status: 'skipped',
      message: 'already exists',
    })
  }

  // CSP
  const cspDir = r('headers/csps/chains')
  const cspFile = r(`headers/csps/chains/${c.camelName}.ts`)
  if (!fs.existsSync(cspFile)) {
    fs.mkdirSync(cspDir, { recursive: true })
    fs.writeFileSync(cspFile, fill(tmpl('csp.ts.tmpl'), c))
    results.push({
      file: cspFile,
      operation: 'create-csp',
      status: 'inserted',
    })
  } else {
    results.push({
      file: cspFile,
      operation: 'create-csp',
      status: 'skipped',
      message: 'already exists',
    })
  }

  return results
}
