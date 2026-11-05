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
})
