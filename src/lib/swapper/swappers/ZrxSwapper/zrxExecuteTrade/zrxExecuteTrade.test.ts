import type { ethereum } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'

import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import type { ZrxExecuteTradeInput, ZrxTrade } from '../types'
import { zrxExecuteTrade } from './zrxExecuteTrade'

const txid = '0xffaac3dd529171e8a9a2adaf36b0344877c4894720d65dfd86e4b3a56c5a857e'
const receiveAddress = '0xc770eefad204b5180df6a14ee197d99d808ee52d'

jest.mock('context/PluginProvider/chainAdapterSingleton', () => {
  const { KnownChainIds } = require('@shapeshiftoss/types')
  const { feeData } = require('../../utils/test-data/setupDeps')
  return {
    getChainAdapterManager: jest.fn(
      () =>
        new Map([
          [
            KnownChainIds.EthereumMainnet,
            {
              buildCustomTx: () => Promise.resolve({ txToSign: '0000000000000000' }),
              signTransaction: () => Promise.resolve('0000000000000000000'),
              broadcastTransaction: () => Promise.resolve(txid),
              signAndBroadcastTransaction: () => Promise.resolve(txid),
              getFeeData: () => Promise.resolve(feeData),
              getAddress: () => Promise.resolve(receiveAddress),
              getChainId: () => KnownChainIds.EthereumMainnet,
            } as unknown as ethereum.ChainAdapter,
          ],
        ]),
    ),
  }
})

describe('ZrxExecuteTrade', () => {
  const { sellAsset, buyAsset } = setupQuote()
  let wallet = {
    _supportsETH: true,
    supportsOfflineSigning: jest.fn(() => true),
    ethSupportsEIP1559: jest.fn(() => false),
  } as unknown as HDWallet

  const trade: ZrxTrade = {
    buyAsset,
    sellAsset,
    sellAmountBeforeFeesCryptoBaseUnit: '1',
    buyAmountBeforeFeesCryptoBaseUnit: '',
    depositAddress: '0x123',
    receiveAddress,
    accountNumber: 0,
    txData: '0x123',
    rate: '1',
    feeData: {
      protocolFees: {},
      networkFeeCryptoBaseUnit: '0',
    },
    sources: [],
  }

  const execTradeInput: ZrxExecuteTradeInput = {
    trade,
    wallet,
  }

  it('returns txid if offline signing is supported', async () => {
    const maybeTradeResult = await zrxExecuteTrade({
      ...execTradeInput,
    })
    expect(maybeTradeResult.isErr()).toBe(false)

    expect(maybeTradeResult.unwrap()).toEqual({ tradeId: txid })
  })

  it('returns txid if offline signing is unsupported', async () => {
    wallet = {
      supportsOfflineSigning: jest.fn(() => false),
      supportsBroadcast: jest.fn(() => true),
    } as unknown as HDWallet

    const maybeTradeResult = await zrxExecuteTrade({
      ...execTradeInput,
    })
    expect(maybeTradeResult.isErr()).toBe(false)
    const tradeResult = maybeTradeResult.unwrap()

    expect(tradeResult).toEqual({ tradeId: txid })
  })
})
