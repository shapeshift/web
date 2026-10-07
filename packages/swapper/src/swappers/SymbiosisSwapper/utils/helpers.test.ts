import { usdtOnTronAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { describe, expect, it } from 'vitest'

import {
  buildSymbiosisTronCallData,
  getSymbiosisFeeAssetId,
  getSymbiosisPartnerAddress,
  getSymbiosisProtocolFees,
  getSymbiosisSlippageBps,
  getSymbiosisTradeStatus,
  isTronSourceTxFailed,
} from './helpers'
import type { SymbiosisFee, SymbiosisTxResponse } from './types'
import { SymbiosisStatusCode } from './types'

const BSC_USDC_ADDRESS = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
const BSC_USDC_ASSET_ID = 'eip155:56/erc20:0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'

// The fees array of a live Arbitrum USDC -> BSC quote: one host chain sToken entry, one destination entry
const liveFees: SymbiosisFee[] = [
  {
    provider: 'symbiosis',
    description: 'Cross-chain fee',
    value: {
      symbol: 'sUSDC',
      address: '0xc317169a336b484f65B0AB4A794bBe66a7491E83',
      amount: '250000',
      chainId: 13863860,
      decimals: 6,
    },
  },
  {
    provider: 'symbiosis',
    description: 'Cross-chain fee',
    value: {
      symbol: 'USDC',
      address: BSC_USDC_ADDRESS,
      amount: '250000000000000000',
      chainId: 56,
      decimals: 18,
    },
  },
]

describe('getSymbiosisSlippageBps', () => {
  it('raises slippage below the Symbiosis minimum to 20 bps', () => {
    expect(getSymbiosisSlippageBps('0.001')).toBe(20)
    expect(getSymbiosisSlippageBps('0')).toBe(20)
  })

  it('lowers slippage above the Symbiosis maximum to 1000 bps', () => {
    expect(getSymbiosisSlippageBps('0.25')).toBe(1000)
  })
})

describe('getSymbiosisPartnerAddress', () => {
  const partnerAddress = '0x1111111111111111111111111111111111111111'

  it('returns the address when the requested bps equals the registered rate', () => {
    expect(
      getSymbiosisPartnerAddress({ partnerAddress, partnerFeeBps: '60', affiliateBps: '60' }),
    ).toBe(partnerAddress)
  })

  it('returns undefined when the requested bps differs from the registered rate', () => {
    expect(
      getSymbiosisPartnerAddress({ partnerAddress, partnerFeeBps: '60', affiliateBps: '30' }),
    ).toBeUndefined()
    expect(
      getSymbiosisPartnerAddress({ partnerAddress, partnerFeeBps: '60', affiliateBps: '0' }),
    ).toBeUndefined()
  })
})

describe('buildSymbiosisTronCallData', () => {
  const functionSelector =
    'metaRoute((bytes,bytes,address[],address,address,uint256,bool,address,bytes))'

  it('prefixes the parameters with the 4-byte selector of the signature', () => {
    const data = `0x${'00'.repeat(31)}20`

    expect(buildSymbiosisTronCallData({ functionSelector, data })).toBe(
      `0xa11b1198${'00'.repeat(31)}20`,
    )
  })
})

describe('getSymbiosisFeeAssetId', () => {
  it('maps a Tron hex address to its base58 trc20 asset id', () => {
    expect(
      getSymbiosisFeeAssetId({
        chainId: 728126428,
        address: '0xa614f803b6fd780986a42c78ec9c7f77e6ded13c',
      }),
    ).toBe(usdtOnTronAssetId)
  })
})

describe('getSymbiosisProtocolFees', () => {
  it('keeps resolvable fees and skips host chain sToken fees', () => {
    expect(getSymbiosisProtocolFees(liveFees)).toEqual({
      [BSC_USDC_ASSET_ID]: {
        amountCryptoBaseUnit: '250000000000000000',
        asset: { symbol: 'USDC', chainId: 'eip155:56', precision: 18 },
        requiresBalance: false,
      },
    })
  })

  it('sums fees charged in the same asset', () => {
    const fees = getSymbiosisProtocolFees([liveFees[1], liveFees[1]])

    expect(fees[BSC_USDC_ASSET_ID]?.amountCryptoBaseUnit).toBe('500000000000000000')
  })
})

describe('getSymbiosisTradeStatus', () => {
  const buySymbiosisChainId = 56

  const makeResponse = (overrides: Partial<SymbiosisTxResponse>): SymbiosisTxResponse => ({
    status: { code: SymbiosisStatusCode.Success, text: 'Success' },
    txIn: { hash: '0xsell', chainId: 42161 },
    tx: { hash: '0xbuy', chainId: 56 },
    ...overrides,
  })

  it('confirms with the destination hash once the destination tx is on the buy chain', () => {
    expect(getSymbiosisTradeStatus({ response: makeResponse({}), buySymbiosisChainId })).toEqual({
      status: TxStatus.Confirmed,
      buyTxHash: '0xbuy',
      message: undefined,
    })
  })

  it('stays pending when Success describes the source transaction itself', () => {
    const response = makeResponse({ tx: { hash: '0xsell', chainId: 42161 } })

    expect(getSymbiosisTradeStatus({ response, buySymbiosisChainId })).toEqual({
      status: TxStatus.Pending,
      buyTxHash: undefined,
      message: undefined,
    })
  })

  it('names the transit token when the destination swap did not complete', () => {
    const response = makeResponse({
      transitTokenSent: {
        chainId: 56,
        address: BSC_USDC_ADDRESS,
        decimals: 18,
        symbol: 'USDC',
        amount: '250000000000000000',
      },
    })

    expect(getSymbiosisTradeStatus({ response, buySymbiosisChainId })).toEqual({
      status: TxStatus.Confirmed,
      buyTxHash: '0xbuy',
      message: 'Received 0.25 USDC instead of the buy asset',
    })
  })

  it('maps pending, stuck, reverted and not found', () => {
    const pending = makeResponse({ status: { code: SymbiosisStatusCode.Pending, text: '' } })
    const stuck = makeResponse({ status: { code: SymbiosisStatusCode.Stuck, text: '' } })
    const reverted = makeResponse({ status: { code: SymbiosisStatusCode.Reverted, text: '' } })
    const notFound = makeResponse({ status: { code: SymbiosisStatusCode.NotFound, text: '' } })

    expect(getSymbiosisTradeStatus({ response: pending, buySymbiosisChainId }).status).toBe(
      TxStatus.Pending,
    )
    expect(getSymbiosisTradeStatus({ response: stuck, buySymbiosisChainId })).toEqual({
      status: TxStatus.Pending,
      buyTxHash: undefined,
      message: 'Swap is stuck and is being reverted by Symbiosis',
    })
    expect(getSymbiosisTradeStatus({ response: reverted, buySymbiosisChainId })).toEqual({
      status: TxStatus.Failed,
      buyTxHash: undefined,
      message: 'Swap was reverted by Symbiosis',
    })
    expect(getSymbiosisTradeStatus({ response: notFound, buySymbiosisChainId }).status).toBe(
      TxStatus.Unknown,
    )
  })
})

describe('isTronSourceTxFailed', () => {
  it('is true for a mined transaction whose contract call did not succeed', () => {
    expect(isTronSourceTxFailed({ ret: [{ contractRet: 'REVERT' }], confirmations: 3 })).toBe(true)
    expect(
      isTronSourceTxFailed({ ret: [{ contractRet: 'OUT_OF_ENERGY' }], confirmations: 1 }),
    ).toBe(true)
  })

  it('is false until the transaction is mined', () => {
    expect(isTronSourceTxFailed({ ret: [{ contractRet: 'REVERT' }], confirmations: 0 })).toBe(false)
    expect(isTronSourceTxFailed({ confirmations: 0 })).toBe(false)
  })
})
