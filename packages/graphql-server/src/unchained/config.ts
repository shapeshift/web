import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  baseChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  gnosisChainId,
  hyperEvmChainId,
  ltcChainId,
  mayachainChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  suiChainId,
  thorchainChainId,
  tronChainId,
  zecChainId,
} from '@shapeshiftoss/caip'

type ChainType = 'evm' | 'utxo' | 'cosmos' | 'solana' | 'tron' | 'sui' | 'custom'

type ChainConfig = {
  type: ChainType
  httpUrl: string
}

const getEnvOrDefault = (envKey: string, defaultUrl: string): string => {
  return process.env[envKey] || defaultUrl
}

export const getChainConfig = (chainId: ChainId): ChainConfig | null => {
  const configs: Partial<Record<ChainId, ChainConfig>> = {
    [ethChainId]: {
      type: 'evm',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_ETHEREUM_HTTP_URL',
        'https://dev-api.ethereum.shapeshift.com',
      ),
    },
    [avalancheChainId]: {
      type: 'evm',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_AVALANCHE_HTTP_URL',
        'https://dev-api.avalanche.shapeshift.com',
      ),
    },
    [optimismChainId]: {
      type: 'evm',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_OPTIMISM_HTTP_URL',
        'https://dev-api.optimism.shapeshift.com',
      ),
    },
    [bscChainId]: {
      type: 'evm',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_BNBSMARTCHAIN_HTTP_URL',
        'https://dev-api.bnbsmartchain.shapeshift.com',
      ),
    },
    [polygonChainId]: {
      type: 'evm',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_POLYGON_HTTP_URL',
        'https://dev-api.polygon.shapeshift.com',
      ),
    },
    [gnosisChainId]: {
      type: 'evm',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_GNOSIS_HTTP_URL',
        'https://dev-api.gnosis.shapeshift.com',
      ),
    },
    [arbitrumChainId]: {
      type: 'evm',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_ARBITRUM_HTTP_URL',
        'https://dev-api.arbitrum.shapeshift.com',
      ),
    },
    [arbitrumNovaChainId]: {
      type: 'evm',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_ARBITRUM_NOVA_HTTP_URL',
        'https://dev-api.arbitrum-nova.shapeshift.com',
      ),
    },
    [baseChainId]: {
      type: 'evm',
      httpUrl: getEnvOrDefault('UNCHAINED_BASE_HTTP_URL', 'https://dev-api.base.shapeshift.com'),
    },
    [btcChainId]: {
      type: 'utxo',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_BITCOIN_HTTP_URL',
        'https://dev-api.bitcoin.shapeshift.com',
      ),
    },
    [bchChainId]: {
      type: 'utxo',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_BITCOINCASH_HTTP_URL',
        'https://dev-api.bitcoincash.shapeshift.com',
      ),
    },
    [dogeChainId]: {
      type: 'utxo',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_DOGECOIN_HTTP_URL',
        'https://dev-api.dogecoin.shapeshift.com',
      ),
    },
    [ltcChainId]: {
      type: 'utxo',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_LITECOIN_HTTP_URL',
        'https://dev-api.litecoin.shapeshift.com',
      ),
    },
    [zecChainId]: {
      type: 'utxo',
      httpUrl: getEnvOrDefault('UNCHAINED_ZCASH_HTTP_URL', 'https://dev-api.zcash.shapeshift.com'),
    },
    [cosmosChainId]: {
      type: 'cosmos',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_COSMOS_HTTP_URL',
        'https://dev-api.cosmos.shapeshift.com',
      ),
    },
    [thorchainChainId]: {
      type: 'cosmos',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_THORCHAIN_HTTP_URL',
        'https://dev-api.thorchain.shapeshift.com',
      ),
    },
    [mayachainChainId]: {
      type: 'cosmos',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_MAYACHAIN_HTTP_URL',
        'https://dev-api.mayachain.shapeshift.com',
      ),
    },
    [solanaChainId]: {
      type: 'solana',
      httpUrl: getEnvOrDefault(
        'UNCHAINED_SOLANA_HTTP_URL',
        'https://dev-api.solana.shapeshift.com',
      ),
    },
    [tronChainId]: {
      type: 'tron',
      httpUrl: getEnvOrDefault('TRON_NODE_URL', 'https://api.trongrid.io'),
    },
    [suiChainId]: {
      type: 'sui',
      httpUrl: getEnvOrDefault('SUI_NODE_URL', 'https://fullnode.mainnet.sui.io'),
    },
    [monadChainId]: {
      type: 'custom',
      httpUrl: getEnvOrDefault('MONAD_NODE_URL', 'https://rpc.monad.xyz'),
    },
    [hyperEvmChainId]: {
      type: 'custom',
      httpUrl: getEnvOrDefault('HYPEREVM_NODE_URL', ''),
    },
    [plasmaChainId]: {
      type: 'custom',
      httpUrl: getEnvOrDefault('PLASMA_NODE_URL', ''),
    },
  }

  return configs[chainId] || null
}
