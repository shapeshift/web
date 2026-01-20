import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import type { TestAsset } from './testData'
import {
  ALL_ASSETS,
  AXLUSDC_ARBITRUM,
  AXLUSDC_OPTIMISM,
  AXLUSDT_ARBITRUM,
  AXLUSDT_OPTIMISM,
  BRIDGED_USDT_OPTIMISM,
  BTC_MAINNET,
  ETH_MAINNET,
  LBTC_BASE_PRIMARY,
  LBTC_ETH,
  USDC_ETH_PRIMARY,
  USDE_ETH_PRIMARY,
  USDT_ETH_PRIMARY,
  VBUSDC_KATANA,
} from './testData'
import { searchAssets } from './utils'

const assets: Asset[] = [
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/slip44:60',
    symbol: 'ETH',
    name: 'Ethereum',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/32e51d582a890b3dd3135fe3ee7c20c2fd699a6d/blockchains/ethereum/info/logo.png',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    symbol: 'BTC',
    name: 'Bitcoin',
    precision: 8,
    color: '#FFFFFF',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/bitcoin/info/logo.png',
    explorer: 'https://live.blockcypher.com',
    explorerTxLink: 'https://live.blockcypher.com/btc/tx/',
    explorerAddressLink: 'https://live.blockcypher.com/btc/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x79be75ffc64dd58e66787e4eae470c8a1fd08ba4',
    name: 'Aave AMM DAI',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/17197/thumb/aAMMDAI_2x.png?1626940032',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    symbol: 'AAMMDAI',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    name: 'Dai',
    precision: 18,
    color: '#FFFFFF',
    icon: 'https://assets.coingecko.com/coins/images/9956/thumb/dai-multi-collateral-mcd.png?1574218774',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    symbol: 'DAI',
    relatedAssetKey: null,
  },
]

// USD-like stablecoins, for name/symbol testing purposes
const usdAssets: Asset[] = [
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    name: 'USD Coin',
    precision: 6,
    color: '#2775CA',
    icon: '',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    name: 'Tether',
    precision: 6,
    color: '#26A17B',
    icon: '',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000001',
    symbol: 'USDS',
    name: 'USDS Stablecoin',
    precision: 6,
    color: '#FFFFFF',
    icon: '',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000002',
    symbol: 'axlUSDC',
    name: 'Axelar Wrapped USDC',
    precision: 6,
    color: '#FFFFFF',
    icon: '',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
  {
    chainId: 'eip155:1',
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000003',
    symbol: 'yvUSDC',
    name: 'Yearn USDC yVault Pool',
    precision: 6,
    color: '#FFFFFF',
    icon: '',
    explorer: 'https://etherscan.io',
    explorerTxLink: 'https://etherscan.io/tx/',
    explorerAddressLink: 'https://etherscan.io/address/',
    relatedAssetKey: null,
  },
]

describe('searchAssets', () => {
  it('returns based on symbol', () => {
    const returnedAssets = searchAssets('btc', assets)
    expect(returnedAssets[0].symbol).toBe('BTC')
  })

  it('returns based on displayName', () => {
    const returnedAssets = searchAssets('Bitcoin', assets)
    expect(returnedAssets[0].name).toBe('Bitcoin')
  })

  it('returns based on assetId', () => {
    const returnedAssets = searchAssets(
      fromAssetId(assets[2]?.assetId).assetReference ?? '',
      assets,
    )
    expect(returnedAssets[0].symbol).toBe('AAMMDAI')
  })

  it('returns closest match instead of the first one in the array', () => {
    const returnedAssets = searchAssets('DAI', assets)
    expect(returnedAssets[0].symbol).toBe('DAI')
  })

  it('returns empty array for empty assets', () => {
    const returnedAssets = searchAssets('btc', [])
    expect(returnedAssets).toEqual([])
  })

  it('returns all assets when search term is empty', () => {
    const returnedAssets = searchAssets('', assets)
    expect(returnedAssets).toEqual(assets)
  })

  describe('symbol match priority', () => {
    it('prioritizes exact symbol match over prefix match', () => {
      const returnedAssets = searchAssets('usdc', usdAssets)
      expect(returnedAssets[0].symbol).toBe('USDC')
    })

    it('prioritizes symbol prefix match over name/symbol-contains match', () => {
      const returnedAssets = searchAssets('usd', usdAssets)
      expect(returnedAssets.map(a => a.symbol)).toEqual([
        'USDC',
        'USDT',
        'USDS',
        'axlUSDC',
        'yvUSDC',
      ])
    })

    it('matches by name when symbol does not match', () => {
      const returnedAssets = searchAssets('tether', usdAssets)
      expect(returnedAssets[0].symbol).toBe('USDT')
    })

    it('prioritizes exact symbol over symbol-contains', () => {
      const returnedAssets = searchAssets('axlusdc', usdAssets)
      expect(returnedAssets[0].symbol).toBe('axlUSDC')
    })

    it('matches symbol containing search term', () => {
      const returnedAssets = searchAssets('vault', usdAssets)
      expect(returnedAssets[0].symbol).toBe('yvUSDC')
    })
  })

  describe('address search', () => {
    it('matches by contract address', () => {
      const returnedAssets = searchAssets('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', usdAssets)
      expect(returnedAssets.length).toBe(1)
      expect(returnedAssets[0].symbol).toBe('USDC')
    })
  })

  describe('preserves original order within score tiers', () => {
    it('maintains market cap order for assets with same score', () => {
      const orderedAssets: Asset[] = [
        { ...usdAssets[0], symbol: 'USD1', name: 'USD One' },
        { ...usdAssets[1], symbol: 'USD2', name: 'USD Two' },
        { ...usdAssets[2], symbol: 'USD3', name: 'USD Three' },
      ]
      const returnedAssets = searchAssets('usd', orderedAssets)
      expect(returnedAssets.map(a => a.symbol)).toEqual(['USD1', 'USD2', 'USD3'])
    })
  })

  describe('name search', () => {
    const nameSearchAssets: Asset[] = [
      {
        ...usdAssets[0],
        assetId: BTC_MAINNET.assetId,
        chainId: BTC_MAINNET.chainId,
        symbol: BTC_MAINNET.symbol,
        name: BTC_MAINNET.name,
      },
      {
        ...usdAssets[0],
        assetId: ETH_MAINNET.assetId,
        chainId: ETH_MAINNET.chainId,
        symbol: ETH_MAINNET.symbol,
        name: ETH_MAINNET.name,
      },
      {
        ...usdAssets[0],
        assetId: LBTC_BASE_PRIMARY.assetId,
        chainId: LBTC_BASE_PRIMARY.chainId,
        symbol: LBTC_BASE_PRIMARY.symbol,
        name: LBTC_BASE_PRIMARY.name,
      },
      {
        ...usdAssets[0],
        assetId: LBTC_ETH.assetId,
        chainId: LBTC_ETH.chainId,
        symbol: LBTC_ETH.symbol,
        name: LBTC_ETH.name,
      },
      {
        ...usdAssets[0],
        assetId: AXLUSDC_OPTIMISM.assetId,
        chainId: AXLUSDC_OPTIMISM.chainId,
        symbol: AXLUSDC_OPTIMISM.symbol,
        name: AXLUSDC_OPTIMISM.name,
      },
      {
        ...usdAssets[0],
        assetId: AXLUSDC_ARBITRUM.assetId,
        chainId: AXLUSDC_ARBITRUM.chainId,
        symbol: AXLUSDC_ARBITRUM.symbol,
        name: AXLUSDC_ARBITRUM.name,
      },
      {
        ...usdAssets[0],
        assetId: AXLUSDT_OPTIMISM.assetId,
        chainId: AXLUSDT_OPTIMISM.chainId,
        symbol: AXLUSDT_OPTIMISM.symbol,
        name: AXLUSDT_OPTIMISM.name,
      },
      {
        ...usdAssets[0],
        assetId: AXLUSDT_ARBITRUM.assetId,
        chainId: AXLUSDT_ARBITRUM.chainId,
        symbol: AXLUSDT_ARBITRUM.symbol,
        name: AXLUSDT_ARBITRUM.name,
      },
      {
        ...usdAssets[0],
        assetId: VBUSDC_KATANA.assetId,
        chainId: VBUSDC_KATANA.chainId,
        symbol: VBUSDC_KATANA.symbol,
        name: VBUSDC_KATANA.name,
      },
      {
        ...usdAssets[0],
        assetId: BRIDGED_USDT_OPTIMISM.assetId,
        chainId: BRIDGED_USDT_OPTIMISM.chainId,
        symbol: BRIDGED_USDT_OPTIMISM.symbol,
        name: BRIDGED_USDT_OPTIMISM.name,
      },
      {
        ...usdAssets[0],
        assetId: USDC_ETH_PRIMARY.assetId,
        chainId: USDC_ETH_PRIMARY.chainId,
        symbol: USDC_ETH_PRIMARY.symbol,
        name: USDC_ETH_PRIMARY.name,
      },
      {
        ...usdAssets[0],
        assetId: USDT_ETH_PRIMARY.assetId,
        chainId: USDT_ETH_PRIMARY.chainId,
        symbol: USDT_ETH_PRIMARY.symbol,
        name: USDT_ETH_PRIMARY.name,
      },
    ]

    it('matches exact name "Bitcoin"', () => {
      const results = searchAssets('Bitcoin', nameSearchAssets)
      expect(results[0].name).toBe('Bitcoin')
    })

    it('matches exact name "Ethereum"', () => {
      const results = searchAssets('Ethereum', nameSearchAssets)
      expect(results[0].name).toBe('Ethereum')
    })

    it('matches exact name "Lombard Staked BTC"', () => {
      const results = searchAssets('Lombard Staked BTC', nameSearchAssets)
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.name === 'Lombard Staked BTC')).toBe(true)
    })

    it('matches name prefix "Axelar"', () => {
      const results = searchAssets('Axelar', nameSearchAssets)
      expect(results.length).toBe(4)
      expect(results.every(r => r.name.startsWith('Axelar'))).toBe(true)
    })

    it('matches name prefix "Axelar Bridged"', () => {
      const results = searchAssets('Axelar Bridged', nameSearchAssets)
      expect(results.length).toBe(4)
      expect(results.every(r => r.name.startsWith('Axelar Bridged'))).toBe(true)
    })

    it('matches name prefix "Lombard"', () => {
      const results = searchAssets('Lombard', nameSearchAssets)
      expect(results.length).toBe(2)
      expect(results.every(r => r.name.startsWith('Lombard'))).toBe(true)
    })

    it('matches name prefix "VaultBridge"', () => {
      const results = searchAssets('VaultBridge', nameSearchAssets)
      expect(results.length).toBe(1)
      expect(results[0].name).toBe('VaultBridge Bridged USDC (Katana)')
    })

    it('matches name substring "Bridged USDC"', () => {
      const results = searchAssets('Bridged USDC', nameSearchAssets)
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.name.toLowerCase().includes('bridged usdc'))).toBe(true)
    })

    it('matches name substring "Bridged USDT"', () => {
      const results = searchAssets('Bridged USDT', nameSearchAssets)
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.name.toLowerCase().includes('bridged usdt'))).toBe(true)
    })

    it('matches name substring "Bridged" (finds all bridged assets)', () => {
      const results = searchAssets('Bridged', nameSearchAssets)
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.name.toLowerCase().includes('bridged'))).toBe(true)
    })

    it('matches name substring "Staked"', () => {
      const results = searchAssets('Staked', nameSearchAssets)
      expect(results.length).toBe(2)
      expect(results.every(r => r.name.includes('Staked'))).toBe(true)
    })

    it('prioritizes symbol match over name match', () => {
      const results = searchAssets('btc', nameSearchAssets)
      expect(results[0].symbol).toBe('BTC')
    })

    it('is case insensitive for name search', () => {
      const results = searchAssets('bitcoin', nameSearchAssets)
      expect(results[0].name).toBe('Bitcoin')
    })

    it('is case insensitive for substring search', () => {
      const results = searchAssets('axelar bridged', nameSearchAssets)
      expect(results.length).toBe(4)
    })
  })

  describe('primary asset name prioritization', () => {
    const spamAndRealAssets: Asset[] = [
      // Spam token with symbol "BITCOIN"
      {
        ...usdAssets[0],
        assetId: 'eip155:1/erc20:0xspambitcoin1' as `${string}:${string}/${string}:${string}`,
        chainId: 'eip155:1',
        symbol: 'BITCOIN',
        name: 'HarryPotterObamaSonic10Inu',
        isPrimary: false,
      },
      // Another spam token with symbol "BITCOIN"
      {
        ...usdAssets[0],
        assetId: 'eip155:1/erc20:0xspambitcoin2' as `${string}:${string}/${string}:${string}`,
        chainId: 'eip155:1',
        symbol: 'BITCOIN',
        name: "DON'T SELL YOUR BITCOIN",
        isPrimary: false,
      },
      // Real Bitcoin (primary asset)
      {
        ...usdAssets[0],
        assetId: BTC_MAINNET.assetId,
        chainId: BTC_MAINNET.chainId,
        symbol: BTC_MAINNET.symbol,
        name: BTC_MAINNET.name,
        isPrimary: true,
      },
      // Spam token with symbol "ETHEREUM"
      {
        ...usdAssets[0],
        assetId: 'eip155:1/erc20:0xspamethereum' as `${string}:${string}/${string}:${string}`,
        chainId: 'eip155:1',
        symbol: 'ETHEREUM',
        name: 'HarryPotterTrumpHomerSimpson777Inu',
        isPrimary: false,
      },
      // Real Ethereum (primary asset)
      {
        ...usdAssets[0],
        assetId: ETH_MAINNET.assetId,
        chainId: ETH_MAINNET.chainId,
        symbol: ETH_MAINNET.symbol,
        name: ETH_MAINNET.name,
        isPrimary: true,
      },
    ]

    it('prioritizes primary Bitcoin over spam tokens with symbol "BITCOIN" when searching "bitcoin"', () => {
      const results = searchAssets('bitcoin', spamAndRealAssets)
      expect(results[0].symbol).toBe('BTC')
      expect(results[0].name).toBe('Bitcoin')
      expect(results[0].isPrimary).toBe(true)
    })

    it('prioritizes primary Ethereum over spam tokens with symbol "ETHEREUM" when searching "ethereum"', () => {
      const results = searchAssets('ethereum', spamAndRealAssets)
      expect(results[0].symbol).toBe('ETH')
      expect(results[0].name).toBe('Ethereum')
      expect(results[0].isPrimary).toBe(true)
    })

    it('still returns spam tokens with exact symbol match, but after primary asset', () => {
      const results = searchAssets('bitcoin', spamAndRealAssets)
      // Real Bitcoin should be first
      expect(results[0].symbol).toBe('BTC')
      // Spam tokens should still be in results (they match by symbol)
      const spamTokens = results.filter(r => r.symbol === 'BITCOIN')
      expect(spamTokens.length).toBe(2)
    })

    it('symbol search still works normally for primary assets', () => {
      const results = searchAssets('btc', spamAndRealAssets)
      expect(results[0].symbol).toBe('BTC')
    })

    it('symbol search still works normally for non-primary assets', () => {
      const results = searchAssets('ethereum', spamAndRealAssets)
      // Real Ethereum first (primary name exact match)
      expect(results[0].symbol).toBe('ETH')
      // Spam tokens with symbol "ETHEREUM" also in results
      const ethereumSymbolTokens = results.filter(r => r.symbol === 'ETHEREUM')
      expect(ethereumSymbolTokens.length).toBe(1)
    })

    it('is case insensitive for primary name match', () => {
      const results = searchAssets('BITCOIN', spamAndRealAssets)
      expect(results[0].symbol).toBe('BTC')
      expect(results[0].isPrimary).toBe(true)
    })

    it('prioritizes primary asset name PREFIX over non-primary name CONTAINS', () => {
      // "Axelar Bridged USDC" is a primary asset starting with "Axelar"
      // "Uniswap V3 Axelar..." contains "Axelar" but doesn't start with it
      const axelarAssets: Asset[] = [
        // Uniswap LP token (non-primary, name contains "Axelar")
        {
          ...usdAssets[0],
          assetId: 'eip155:1/erc20:0xlptoken1' as `${string}:${string}/${string}:${string}`,
          chainId: 'eip155:1',
          symbol: 'AXELAR WRAPPED LAVA/WETH',
          name: 'Uniswap V3 Axelar Wrapped LAVA/WETH 0.05% Pool',
          isPrimary: false,
        },
        // Another Uniswap LP token
        {
          ...usdAssets[0],
          assetId: 'eip155:1/erc20:0xlptoken2' as `${string}:${string}/${string}:${string}`,
          chainId: 'eip155:1',
          symbol: 'AXELAR/USD COIN',
          name: 'Uniswap V3 Axelar/USD Coin 0.3% Pool',
          isPrimary: false,
        },
        // Real Axelar (primary)
        {
          ...usdAssets[0],
          assetId: 'eip155:1/erc20:0xaxelar' as `${string}:${string}/${string}:${string}`,
          chainId: 'eip155:1',
          symbol: 'AXL',
          name: 'Axelar',
          isPrimary: true,
        },
        // Axelar Bridged USDC (primary, name starts with "Axelar")
        {
          ...usdAssets[0],
          assetId: AXLUSDC_OPTIMISM.assetId,
          chainId: AXLUSDC_OPTIMISM.chainId,
          symbol: AXLUSDC_OPTIMISM.symbol,
          name: AXLUSDC_OPTIMISM.name,
          isPrimary: true, // Make it primary for this test
        },
      ]

      const results = searchAssets('axelar', axelarAssets)

      // Primary assets with name match should come first
      // "Axelar" (exact name match) should be first
      expect(results[0].symbol).toBe('AXL')
      expect(results[0].isPrimary).toBe(true)

      // "Axelar Bridged USDC" (name prefix match, primary) should come second
      expect(results[1].symbol).toBe('AXLUSDC')
      expect(results[1].isPrimary).toBe(true)

      // Uniswap LP tokens (name contains) should come last
      expect(results[2].name).toContain('Uniswap')
      expect(results[3].name).toContain('Uniswap')
    })

    it('prefers assets with relatedAssetKey over orphans within same score tier', () => {
      const mixedAssets: Asset[] = [
        // Orphan LP token (no relatedAssetKey, name contains "pool")
        {
          ...usdAssets[0],
          assetId: 'eip155:1/erc20:0xlptoken1' as `${string}:${string}/${string}:${string}`,
          symbol: 'FAKE1',
          name: 'Uniswap USDC Pool Token',
          relatedAssetKey: null,
        },
        // Another orphan LP token
        {
          ...usdAssets[0],
          assetId: 'eip155:1/erc20:0xlptoken2' as `${string}:${string}/${string}:${string}`,
          symbol: 'FAKE2',
          name: 'Curve USDC Pool Token',
          relatedAssetKey: null,
        },
        // Asset with relatedAssetKey (part of a family), name also contains "pool"
        {
          ...usdAssets[0],
          assetId: 'eip155:1/erc20:0xreal' as `${string}:${string}/${string}:${string}`,
          symbol: 'REAL',
          name: 'Real Staking Pool Token',
          relatedAssetKey:
            'eip155:1/erc20:0xreal-family' as `${string}:${string}/${string}:${string}`,
          isPrimary: false,
        },
      ]

      const results = searchAssets('pool', mixedAssets)

      // All match by NAME_CONTAINS (50), but REAL has relatedAssetKey
      // so it should come before the orphan tokens
      expect(results[0].symbol).toBe('REAL')
      expect(results[0].relatedAssetKey).not.toBeNull()
      // Orphans come after, in original order
      expect(results[1].symbol).toBe('FAKE1')
      expect(results[1].relatedAssetKey).toBeNull()
      expect(results[2].symbol).toBe('FAKE2')
      expect(results[2].relatedAssetKey).toBeNull()
    })
  })

  describe('real-world scenarios with ALL_ASSETS', () => {
    const toAsset = (testAsset: TestAsset): Asset =>
      ({
        ...testAsset,
        precision: 18,
        color: '#FFFFFF',
        icon: '',
        explorer: '',
        explorerTxLink: '',
        explorerAddressLink: '',
      }) as Asset

    const realWorldAssets = ALL_ASSETS.map(toAsset)

    describe('stablecoin search', () => {
      it('"usd" search returns USDC and USDT first (primary assets with symbol prefix)', () => {
        const results = searchAssets('usd', realWorldAssets)
        const topSymbols = results.slice(0, 5).map(a => a.symbol)
        expect(topSymbols).toContain('USDC')
        expect(topSymbols).toContain('USDT')
        expect(topSymbols).toContain('USDE')
      })

      it('"usdt" search returns primary USDT first', () => {
        const results = searchAssets('usdt', realWorldAssets)
        expect(results[0].symbol).toBe('USDT')
        expect(results[0].isPrimary).toBe(true)
      })

      it('"usdc" search returns primary USDC first', () => {
        const results = searchAssets('usdc', realWorldAssets)
        expect(results[0].symbol).toBe('USDC')
        expect(results[0].isPrimary).toBe(true)
      })

      it('"usdc.e" search returns USDC.E variant', () => {
        const results = searchAssets('usdc.e', realWorldAssets)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].symbol).toBe('USDC.E')
      })

      it('"tether" search returns USDT (name match)', () => {
        const results = searchAssets('tether', realWorldAssets)
        expect(results[0].symbol).toBe('USDT')
        expect(results[0].name).toBe('Tether')
      })
    })

    describe('bitcoin family search', () => {
      it('"bitcoin" search returns real BTC first, before spam tokens with BITCOIN symbol', () => {
        const results = searchAssets('bitcoin', realWorldAssets)
        expect(results[0].symbol).toBe('BTC')
        expect(results[0].name).toBe('Bitcoin')
        expect(results[0].isPrimary).toBe(true)
      })

      it('"btc" search returns real BTC first, even with spam tokens having BTC symbol', () => {
        const results = searchAssets('btc', realWorldAssets)
        expect(results[0].symbol).toBe('BTC')
        expect(results[0].isPrimary).toBe(true)
        // Bitcoin Cash and WBTC should also appear (name contains "BTC")
        const symbols = results.slice(0, 5).map(a => a.symbol)
        expect(symbols).toContain('LBTC')
        expect(symbols).toContain('WBTC')
      })

      it('"bitcoin cash" search returns BCH', () => {
        const results = searchAssets('bitcoin cash', realWorldAssets)
        expect(results[0].symbol).toBe('BCH')
        expect(results[0].name).toBe('Bitcoin Cash')
      })

      it('"bch" search returns Bitcoin Cash', () => {
        const results = searchAssets('bch', realWorldAssets)
        expect(results[0].symbol).toBe('BCH')
      })

      it('"wbtc" search returns Wrapped Bitcoin', () => {
        const results = searchAssets('wbtc', realWorldAssets)
        expect(results[0].symbol).toBe('WBTC')
        expect(results[0].isPrimary).toBe(true)
      })

      it('"wrapped bitcoin" search returns WBTC', () => {
        const results = searchAssets('wrapped bitcoin', realWorldAssets)
        expect(results[0].symbol).toBe('WBTC')
      })

      it('"lbtc" search returns Lombard Staked BTC', () => {
        const results = searchAssets('lbtc', realWorldAssets)
        expect(results[0].symbol).toBe('LBTC')
      })

      it('"lombard" search returns LBTC (name prefix match)', () => {
        const results = searchAssets('lombard', realWorldAssets)
        expect(results.every(r => r.symbol === 'LBTC')).toBe(true)
      })
    })

    describe('ethereum search', () => {
      it('"ethereum" search returns real ETH first, before spam tokens', () => {
        const results = searchAssets('ethereum', realWorldAssets)
        expect(results[0].symbol).toBe('ETH')
        expect(results[0].name).toBe('Ethereum')
        expect(results[0].isPrimary).toBe(true)
      })

      it('"eth" search returns real Ethereum first', () => {
        const results = searchAssets('eth', realWorldAssets)
        expect(results[0].symbol).toBe('ETH')
        expect(results[0].isPrimary).toBe(true)
      })
    })

    describe('bridged asset search', () => {
      it('"axelar" search returns Axelar bridged assets', () => {
        const results = searchAssets('axelar', realWorldAssets)
        expect(results.length).toBeGreaterThan(0)
        expect(results.every(r => r.name.toLowerCase().includes('axelar'))).toBe(true)
      })

      it('"axlusdc" search returns Axelar Bridged USDC', () => {
        const results = searchAssets('axlusdc', realWorldAssets)
        expect(results.length).toBeGreaterThan(0)
        expect(results.every(r => r.symbol === 'AXLUSDC')).toBe(true)
      })

      it('"vbusdc" search returns VaultBridge Bridged USDC', () => {
        const results = searchAssets('vbusdc', realWorldAssets)
        expect(results[0].symbol).toBe('VBUSDC')
      })

      it('"vaultbridge" search returns VaultBridge assets (name prefix)', () => {
        const results = searchAssets('vaultbridge', realWorldAssets)
        expect(results[0].name).toContain('VaultBridge')
      })

      it('"bridged" search returns all bridged assets', () => {
        const results = searchAssets('bridged', realWorldAssets)
        expect(results.length).toBeGreaterThan(0)
        expect(results.every(r => r.name.toLowerCase().includes('bridged'))).toBe(true)
      })
    })

    describe('spam token filtering', () => {
      it('spam tokens with long symbol "BITCOIN" rank below real Bitcoin', () => {
        const results = searchAssets('bitcoin', realWorldAssets)
        const btcIndex = results.findIndex(r => r.symbol === 'BTC')
        const spamIndex = results.findIndex(r => r.symbol === 'BITCOIN')
        expect(btcIndex).toBeLessThan(spamIndex)
      })

      it('spam tokens with long symbol "ETHEREUM" rank below real Ethereum', () => {
        const results = searchAssets('ethereum', realWorldAssets)
        const ethIndex = results.findIndex(r => r.symbol === 'ETH')
        const spamIndex = results.findIndex(r => r.symbol === 'ETHEREUM')
        expect(ethIndex).toBeLessThan(spamIndex)
      })

      it('non-primary spam token with BTC symbol ranks below primary BTC (market cap filter)', () => {
        const results = searchAssets('btc', realWorldAssets)
        expect(results[0].symbol).toBe('BTC')
        expect(results[0].isPrimary).toBe(true)
      })
    })

    describe('market cap ordering preservation', () => {
      it('preserves original order for assets with same score (market cap proxy)', () => {
        const orderedAssets = [
          toAsset({ ...USDC_ETH_PRIMARY }),
          toAsset({ ...USDT_ETH_PRIMARY }),
          toAsset({ ...USDE_ETH_PRIMARY }),
        ]
        const results = searchAssets('usd', orderedAssets)
        expect(results.map(a => a.symbol)).toEqual(['USDC', 'USDT', 'USDE'])
      })
    })
  })
})
