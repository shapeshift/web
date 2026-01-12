import type { ChainId } from '../types'

export type ChainMeta = {
  chainId: ChainId
  name: string
  shortName: string
  color: string
  icon: string
}

export const CHAIN_METADATA: Record<ChainId, ChainMeta> = {
  'eip155:1': {
    chainId: 'eip155:1',
    name: 'Ethereum',
    shortName: 'ETH',
    color: '#627EEA',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/ethereum/info/logo.png',
  },
  'eip155:42161': {
    chainId: 'eip155:42161',
    name: 'Arbitrum One',
    shortName: 'ARB',
    color: '#2D374B',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/arbitrum/info/logo.png',
  },
  'eip155:42170': {
    chainId: 'eip155:42170',
    name: 'Arbitrum Nova',
    shortName: 'NOVA',
    color: '#E57310',
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrumnova/info/logo.png',
  },
  'eip155:10': {
    chainId: 'eip155:10',
    name: 'Optimism',
    shortName: 'OP',
    color: '#FF0420',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/optimism/info/logo.png',
  },
  'eip155:137': {
    chainId: 'eip155:137',
    name: 'Polygon',
    shortName: 'MATIC',
    color: '#8247E5',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/polygon/info/logo.png',
  },
  'eip155:8453': {
    chainId: 'eip155:8453',
    name: 'Base',
    shortName: 'BASE',
    color: '#0052FF',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/base/info/logo.png',
  },
  'eip155:43114': {
    chainId: 'eip155:43114',
    name: 'Avalanche',
    shortName: 'AVAX',
    color: '#E84142',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/avalanchec/info/logo.png',
  },
  'eip155:56': {
    chainId: 'eip155:56',
    name: 'BNB Smart Chain',
    shortName: 'BNB',
    color: '#F0B90B',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/binance/info/logo.png',
  },
  'eip155:100': {
    chainId: 'eip155:100',
    name: 'Gnosis',
    shortName: 'GNO',
    color: '#04795B',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/xdai/info/logo.png',
  },
  'bip122:000000000019d6689c085ae165831e93': {
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    name: 'Bitcoin',
    shortName: 'BTC',
    color: '#FF9800',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/bitcoin/info/logo.png',
  },
  'bip122:000000000000000000651ef99cb9fcbe': {
    chainId: 'bip122:000000000000000000651ef99cb9fcbe',
    name: 'Bitcoin Cash',
    shortName: 'BCH',
    color: '#8BC34A',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/bitcoincash/info/logo.png',
  },
  'bip122:00000000001a91e3dace36e2be3bf030': {
    chainId: 'bip122:00000000001a91e3dace36e2be3bf030',
    name: 'Dogecoin',
    shortName: 'DOGE',
    color: '#FFC107',
    icon: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
  },
  'bip122:12a765e31ffd4059bada1e25190f6e98': {
    chainId: 'bip122:12a765e31ffd4059bada1e25190f6e98',
    name: 'Litecoin',
    shortName: 'LTC',
    color: '#B8B8B8',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/litecoin/info/logo.png',
  },
  'cosmos:cosmoshub-4': {
    chainId: 'cosmos:cosmoshub-4',
    name: 'Cosmos Hub',
    shortName: 'ATOM',
    color: '#303F9F',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/cosmos/info/logo.png',
  },
  'cosmos:thorchain-1': {
    chainId: 'cosmos:thorchain-1',
    name: 'THORChain',
    shortName: 'RUNE',
    color: '#33FF99',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/thorchain/info/logo.png',
  },
  'cosmos:mayachain-mainnet-v1': {
    chainId: 'cosmos:mayachain-mainnet-v1',
    name: 'MAYAChain',
    shortName: 'CACAO',
    color: '#63FDD9',
    icon: 'https://raw.githubusercontent.com/shapeshift/web/develop/src/assets/mayachain.png',
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana',
    shortName: 'SOL',
    color: '#9945FF',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/solana/info/logo.png',
  },
}

export const getChainMeta = (chainId: ChainId): ChainMeta | undefined => {
  return CHAIN_METADATA[chainId]
}

export const getChainName = (chainId: ChainId): string => {
  return CHAIN_METADATA[chainId]?.name ?? chainId
}

export const getChainIcon = (chainId: ChainId): string | undefined => {
  return CHAIN_METADATA[chainId]?.icon
}

export const getChainColor = (chainId: ChainId): string => {
  return CHAIN_METADATA[chainId]?.color ?? '#888888'
}
