import { describe, expect, it } from 'vitest'

import type { ReconcileRelatedAssetGroupsArgs } from './reconcileRelatedAssetGroups'
import { reconcileRelatedAssetGroups } from './reconcileRelatedAssetGroups'

const POL_NATIVE = 'eip155:137/slip44:966'
const POL_ETH = 'eip155:1/erc20:0xpol'
const WPOL = 'eip155:137/erc20:0xwpol'
const ELON_ETH = 'eip155:1/erc20:0xelon'
const ELON_BSC = 'eip155:56/erc20:0xelon'
const ELON_BASE = 'eip155:8453/erc20:0xelon'
const WBTC_ETH = 'eip155:1/erc20:0xwbtc'
const WBTC_ARB = 'eip155:42161/erc20:0xwbtc'
const FIABTC_ETH = 'eip155:1/erc20:0xfiabtc'
const FIABTC_BASE = 'eip155:8453/erc20:0xfiabtc'
const SOL_NATIVE = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501'
const SOL_BSC = 'eip155:56/erc20:0xsol'
const WSOL = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:wsol'
const WETH_ETH = 'eip155:1/erc20:0xweth'
const WEETH_KATANA = 'eip155:747474/erc20:0xweeth'
const WEETH_ETH = 'eip155:1/erc20:0xweeth'
const WEETH_ARB = 'eip155:42161/erc20:0xweeth'

const baseArgs: ReconcileRelatedAssetGroupsArgs = {
  relatedAssetKeyByAssetId: {
    [POL_NATIVE]: null,
    [POL_ETH]: null,
    [WPOL]: null,
    [ELON_ETH]: ELON_ETH,
    [ELON_BASE]: ELON_ETH,
    [ELON_BSC]: ELON_BSC,
    [WBTC_ETH]: WBTC_ETH,
    [WBTC_ARB]: WBTC_ETH,
    [FIABTC_ETH]: WBTC_ETH,
    [FIABTC_BASE]: WBTC_ETH,
    [SOL_NATIVE]: null,
    [SOL_BSC]: SOL_BSC,
    [WSOL]: SOL_BSC,
    [WETH_ETH]: WETH_ETH,
    [WEETH_KATANA]: WETH_ETH,
    [WEETH_ARB]: WEETH_ARB,
    [WEETH_ETH]: WEETH_ARB,
  },
  relatedAssetIndex: {
    [ELON_ETH]: [ELON_ETH, ELON_BASE],
    [ELON_BSC]: [ELON_BSC],
    [WBTC_ETH]: [WBTC_ETH, WBTC_ARB, FIABTC_ETH, FIABTC_BASE],
    [SOL_BSC]: [SOL_BSC, WSOL],
    [WETH_ETH]: [WETH_ETH, WEETH_KATANA],
    [WEETH_ARB]: [WEETH_ARB, WEETH_ETH],
  },
  rankedAssetIds: [
    SOL_NATIVE,
    WBTC_ETH,
    WETH_ETH,
    WEETH_ETH,
    POL_ETH,
    POL_NATIVE,
    ELON_BSC,
    ELON_ETH,
    ELON_BASE,
    WBTC_ARB,
    WEETH_ARB,
    WEETH_KATANA,
    SOL_BSC,
    WSOL,
    FIABTC_ETH,
    FIABTC_BASE,
  ],
  coinIdByAssetId: {
    [POL_NATIVE]: 'polygon-ecosystem-token',
    [POL_ETH]: 'polygon-ecosystem-token',
    [WPOL]: 'polygon-ecosystem-token',
    [ELON_ETH]: 'dogelon-mars',
    [ELON_BSC]: 'dogelon-mars',
    [ELON_BASE]: 'dogelon-mars',
    [WBTC_ETH]: 'wrapped-bitcoin',
    [WBTC_ARB]: 'arbitrum-bridged-wbtc',
    [FIABTC_ETH]: 'fiamma-btc',
    [FIABTC_BASE]: 'fiamma-btc',
    [SOL_NATIVE]: 'solana',
    [SOL_BSC]: 'binance-peg-sol',
    [WSOL]: 'wrapped-solana',
    [WETH_ETH]: 'weth',
    [WEETH_KATANA]: 'polygon-bridged-weeth-katana',
    [WEETH_ETH]: 'wrapped-eeth',
    [WEETH_ARB]: 'arbitrum-bridged-wrapped-eeth',
  },
  manualRelatedAssetIndex: {
    [SOL_NATIVE]: [SOL_BSC, WSOL],
    [WEETH_ETH]: [WEETH_ARB, WEETH_KATANA],
  },
  excludedAssetIds: [FIABTC_ETH, FIABTC_BASE],
  nativeAssetIds: [POL_NATIVE, SOL_NATIVE],
  canonicalAssetIds: [WBTC_ETH, WETH_ETH],
}

describe('reconcileRelatedAssetGroups', () => {
  const { relatedAssetKeyByAssetId: keys, relatedAssetIndex: index } =
    reconcileRelatedAssetGroups(baseArgs)

  it('links a native asset to the tokens CoinGecko lists as the same coin, keyed by the native', () => {
    expect(index[POL_NATIVE]).toEqual([POL_ETH, POL_NATIVE])
    expect(keys[POL_ETH]).toBe(POL_NATIVE)
  })

  it("keeps a token on the native coin's own chain out of the native's group, like WETH from ETH", () => {
    expect(keys[WPOL]).toBeNull()
  })

  it('merges groups of the same coin under the highest market cap key', () => {
    expect(index[ELON_BSC]).toEqual([ELON_BSC, ELON_ETH, ELON_BASE])
    expect(index[ELON_ETH]).toBeUndefined()
    for (const assetId of [ELON_BSC, ELON_ETH, ELON_BASE]) expect(keys[assetId]).toBe(ELON_BSC)
  })

  it('moves excluded tokens out of the wrong group and regroups them with their own coin', () => {
    expect(index[WBTC_ETH]).toEqual([WBTC_ETH, WBTC_ARB])
    expect(index[FIABTC_ETH]).toEqual([FIABTC_ETH, FIABTC_BASE])
  })

  it('keys a manual group by its manual key and brings along the group a listed key leads', () => {
    expect(index[SOL_NATIVE]).toEqual([SOL_NATIVE, SOL_BSC, WSOL])
    expect(index[SOL_BSC]).toBeUndefined()
  })

  it('moves a listed manual asset that only belongs to another group, leaving that group intact', () => {
    expect(index[WEETH_ETH]).toEqual([WEETH_ETH, WEETH_ARB, WEETH_KATANA])
    expect(keys[WEETH_KATANA]).toBe(WEETH_ETH)
    expect(keys[WETH_ETH]).toBeNull()
  })

  it('clears the key of an asset left without a group', () => {
    expect(index[WETH_ETH]).toBeUndefined()
  })

  it('leaves a correct group untouched, member order included', () => {
    const correct = { ...baseArgs, manualRelatedAssetIndex: {}, excludedAssetIds: [] }
    const result = reconcileRelatedAssetGroups(correct)
    expect(result.relatedAssetIndex[WBTC_ETH]).toEqual(baseArgs.relatedAssetIndex[WBTC_ETH])
  })

  it('prefers a canonical key over a higher market cap version of the same coin', () => {
    const result = reconcileRelatedAssetGroups({
      ...baseArgs,
      relatedAssetKeyByAssetId: { ...baseArgs.relatedAssetKeyByAssetId, [WBTC_ARB]: null },
      relatedAssetIndex: {},
      rankedAssetIds: [WBTC_ARB, WBTC_ETH],
      coinIdByAssetId: { [WBTC_ETH]: 'wrapped-bitcoin', [WBTC_ARB]: 'wrapped-bitcoin' },
      manualRelatedAssetIndex: {},
      excludedAssetIds: [],
    })
    expect(result.relatedAssetKeyByAssetId[WBTC_ARB]).toBe(WBTC_ETH)
  })

  it('rekeys an existing token-led family to its native and drops the wrapped native from it', () => {
    const result = reconcileRelatedAssetGroups({
      ...baseArgs,
      relatedAssetKeyByAssetId: {
        ...baseArgs.relatedAssetKeyByAssetId,
        [POL_ETH]: POL_ETH,
        [POL_NATIVE]: POL_ETH,
        [WPOL]: POL_ETH,
      },
      relatedAssetIndex: { [POL_ETH]: [POL_ETH, POL_NATIVE, WPOL] },
    })
    expect(result.relatedAssetIndex[POL_NATIVE]).toEqual([POL_ETH, POL_NATIVE])
    expect(result.relatedAssetIndex[POL_ETH]).toBeUndefined()
    expect(result.relatedAssetKeyByAssetId[WPOL]).toBeNull()
  })

  it('treats a token as the wrapped native on every chain where its coin is native', () => {
    const ETH_MAINNET = 'eip155:1/slip44:60'
    const ETH_ARB = 'eip155:42161/slip44:60'
    const ETH_TOKEN_ARB = 'eip155:42161/erc20:0xeth'
    const ETH_TOKEN_BSC = 'eip155:56/erc20:0xeth'
    const result = reconcileRelatedAssetGroups({
      ...baseArgs,
      relatedAssetKeyByAssetId: {
        [ETH_MAINNET]: null,
        [ETH_ARB]: null,
        [ETH_TOKEN_ARB]: null,
        [ETH_TOKEN_BSC]: null,
      },
      relatedAssetIndex: {},
      rankedAssetIds: [ETH_MAINNET, ETH_ARB, ETH_TOKEN_ARB, ETH_TOKEN_BSC],
      coinIdByAssetId: {
        [ETH_MAINNET]: 'ethereum',
        [ETH_ARB]: 'ethereum',
        [ETH_TOKEN_ARB]: 'ethereum',
        [ETH_TOKEN_BSC]: 'ethereum',
      },
      manualRelatedAssetIndex: {},
      excludedAssetIds: [],
      nativeAssetIds: [ETH_MAINNET, ETH_ARB],
    })
    expect(result.relatedAssetKeyByAssetId[ETH_TOKEN_ARB]).toBeNull()
    expect(result.relatedAssetKeyByAssetId[ETH_TOKEN_BSC]).toBe(ETH_MAINNET)
  })

  it('hands the group of an excluded key to its best remaining member', () => {
    const result = reconcileRelatedAssetGroups({
      ...baseArgs,
      excludedAssetIds: [WBTC_ETH],
    })
    expect(result.relatedAssetKeyByAssetId[WBTC_ETH]).toBeNull()
    expect(result.relatedAssetKeyByAssetId[WBTC_ARB]).toBe(WBTC_ARB)
    expect(result.relatedAssetIndex[WBTC_ETH]).toBeUndefined()
  })

  it('skips a manual group whose key is not in the asset data', () => {
    const result = reconcileRelatedAssetGroups({
      ...baseArgs,
      manualRelatedAssetIndex: { 'eip155:1/erc20:0xmissing': [WEETH_ARB, WEETH_ETH] },
    })
    expect(result.relatedAssetIndex['eip155:1/erc20:0xmissing']).toBeUndefined()
    expect(result.relatedAssetKeyByAssetId[WEETH_ETH]).toBe(WEETH_ARB)
  })
})
