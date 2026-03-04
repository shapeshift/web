export const TEST_AFFILIATE_ADDRESS = '0x0000000000000000000000000000000000000001'

export const ASSET_IDS = {
  // EVM Native Assets
  ETH: 'eip155:1/slip44:60',
  ARB_ETH: 'eip155:42161/slip44:60',
  BASE_ETH: 'eip155:8453/slip44:60',

  // EVM ERC20 Tokens
  USDC_ETH: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  USDC_ARB: 'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  FOX_ETH: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',

  // UTXO
  BTC: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  DOGE: 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3',

  // Cosmos
  ATOM: 'cosmos:cosmoshub-4/slip44:118',
  RUNE: 'cosmos:thorchain-1/slip44:931',
} as const

export type TestPair = {
  name: string
  sellAssetId: string
  buyAssetId: string
  sellAmountCryptoBaseUnit: string
  expectedSwappers: string[]
}

export const TEST_PAIRS: Record<string, TestPair[]> = {
  evmSameChain: [
    {
      name: 'ETH to USDC (Ethereum)',
      sellAssetId: ASSET_IDS.ETH,
      buyAssetId: ASSET_IDS.USDC_ETH,
      sellAmountCryptoBaseUnit: '100000000000000000', // 0.1 ETH
      expectedSwappers: ['0x', 'CoW Swap', 'Portals', 'Bebop', 'ButterSwap'],
    },
  ],
  crossChain: [
    {
      name: 'ETH to BTC (THORChain/Chainflip)',
      sellAssetId: ASSET_IDS.ETH,
      buyAssetId: ASSET_IDS.BTC,
      sellAmountCryptoBaseUnit: '100000000000000000', // 0.1 ETH
      expectedSwappers: ['THORChain', 'Chainflip', 'Relay'],
    },
  ],
}

export const CRITICAL_SWAPPERS = ['THORChain', '0x']
export const NON_CRITICAL_SWAPPERS = [
  'CoW Swap',
  'Portals',
  'Bebop',
  'ButterSwap',
  'Jupiter',
  'Chainflip',
  'MAYAChain',
  'Relay',
]
