import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'

import { ExecuteTradeInput } from '../../../api'
import { setupQuote } from '../utils/test-data/setupSwapQuote'
import { ZrxSwapperDeps } from '../ZrxSwapper'
import { zrxExecuteTrade } from './zrxExecuteTrade'

describe('ZrxExecuteTrade', () => {
  const { sellAsset, buyAsset } = setupQuote()
  const txid = '0xffaac3dd529171e8a9a2adaf36b0344877c4894720d65dfd86e4b3a56c5a857e'
  let wallet = {
    supportsOfflineSigning: jest.fn(() => true)
  } as unknown as HDWallet
  const adapterManager = {
    byChain: jest.fn(() => ({
      buildBIP44Params: jest.fn(() => ({ purpose: 44, coinType: 60, accountNumber: 0 })),
      buildSendTransaction: jest.fn(() => Promise.resolve({ txToSign: '0000000000000000' })),
      signTransaction: jest.fn(() => Promise.resolve('0000000000000000000')),
      broadcastTransaction: jest.fn(() => Promise.resolve(txid)),
      signAndBroadcastTransaction: jest.fn(() => Promise.resolve(txid))
    }))
  }
  const deps = { adapterManager } as unknown as ZrxSwapperDeps
  const execTradeInput: ExecuteTradeInput<ChainTypes.Ethereum> = {
    trade: {
      buyAsset,
      sellAsset,
      success: true,
      statusReason: '',
      sellAmount: '1',
      buyAmount: '',
      depositAddress: '0x123',
      allowanceContract: 'allowanceTargetAddress',
      receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      sellAssetAccountId: '0',
      txData: '0x123',
      rate: '1',
      feeData: {
        fee: '0',
        chainSpecific: { approvalFee: '123600000', estimatedGas: '1235', gasPrice: '1236' }
      },
      sources: []
    },
    wallet
  }

  it('throws an error if sellAsset.symbol is not provided', async () => {
    await expect(
      zrxExecuteTrade(deps, {
        ...execTradeInput,
        trade: { ...execTradeInput.trade, sellAsset: { ...sellAsset, symbol: '' } }
      })
    ).rejects.toThrow('ZrxSwapper:ZrxExecuteTrade sellAssetSymbol is required')
  })

  it('throws an error if quote.sellAssetAccountId is not provided', async () => {
    await expect(
      zrxExecuteTrade(deps, {
        ...execTradeInput,
        trade: { ...execTradeInput.trade, sellAssetAccountId: '' }
      })
    ).rejects.toThrow('ZrxSwapper:ZrxExecuteTrade sellAssetAccountId is required')
  })

  it('throws an error if quote.sellAmount is not provided', async () => {
    await expect(
      zrxExecuteTrade(deps, {
        ...execTradeInput,
        trade: { ...execTradeInput.trade, sellAmount: '' }
      })
    ).rejects.toThrow('ZrxSwapper:ZrxExecuteTrade sellAmount is required')
  })

  it('throws an error if quote.depositAddress is not provided', async () => {
    await expect(
      zrxExecuteTrade(deps, {
        ...execTradeInput,
        trade: { ...execTradeInput.trade, depositAddress: '' }
      })
    ).rejects.toThrow('ZrxSwapper:ZrxExecuteTrade depositAddress is required')
  })

  it('returns txid if offline signing is supported', async () => {
    expect(
      await zrxExecuteTrade(deps, {
        ...execTradeInput,
        trade: {
          ...execTradeInput.trade,
          depositAddress: '0x728F1973c71f7567dE2a34Fa2838D4F0FB7f9765'
        }
      })
    ).toEqual({ txid })
  })

  it('returns txid if offline signing is unsupported', async () => {
    wallet = {
      supportsOfflineSigning: jest.fn(() => false),
      supportsBroadcast: jest.fn(() => true)
    } as unknown as HDWallet

    expect(
      await zrxExecuteTrade(deps, {
        ...execTradeInput,
        trade: {
          ...execTradeInput.trade,
          depositAddress: '0x728F1973c71f7567dE2a34Fa2838D4F0FB7f9765'
        }
      })
    ).toEqual({ txid })
  })
})
