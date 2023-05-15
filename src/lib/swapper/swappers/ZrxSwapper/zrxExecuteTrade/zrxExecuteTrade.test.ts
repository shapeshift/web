import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'

import { gasFeeData } from '../../utils/test-data/setupDeps'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import type { ZrxExecuteTradeInput, ZrxSwapperDeps, ZrxTrade } from '../types'
import { zrxExecuteTrade } from './zrxExecuteTrade'

describe('ZrxExecuteTrade', () => {
  const { sellAsset, buyAsset } = setupQuote()
  const txid = '0xffaac3dd529171e8a9a2adaf36b0344877c4894720d65dfd86e4b3a56c5a857e'
  let wallet = {
    _supportsETH: true,
    supportsOfflineSigning: jest.fn(() => true),
    ethSupportsEIP1559: jest.fn(() => false),
  } as unknown as HDWallet

  const adapter = {
    buildCustomTx: jest.fn(() => Promise.resolve({ txToSign: '0000000000000000' })),
    signTransaction: jest.fn(() => Promise.resolve('0000000000000000000')),
    broadcastTransaction: jest.fn(() => Promise.resolve(txid)),
    signAndBroadcastTransaction: jest.fn(() => Promise.resolve(txid)),
    getGasFeeData: jest.fn(() => Promise.resolve(gasFeeData)),
  } as unknown as ChainAdapter<'eip155:1'>

  const deps = { adapter } as unknown as ZrxSwapperDeps

  const trade: ZrxTrade<KnownChainIds.EthereumMainnet> = {
    buyAsset,
    sellAsset,
    sellAmountBeforeFeesCryptoBaseUnit: '1',
    buyAmountBeforeFeesCryptoBaseUnit: '',
    depositAddress: '0x123',
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    accountNumber: 0,
    txData: '0x123',
    rate: '1',
    feeData: {
      chainSpecific: {},
      buyAssetTradeFeeUsd: '0',
      sellAssetTradeFeeUsd: '0',
      networkFeeCryptoBaseUnit: '0',
    },
    sources: [],
  }

  const execTradeInput: ZrxExecuteTradeInput<KnownChainIds.EthereumMainnet> = {
    trade,
    wallet,
  }

  it('returns txid if offline signing is supported', async () => {
    const maybeTradeResult = await zrxExecuteTrade<KnownChainIds.EthereumMainnet>(deps, {
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

    const maybeTradeResult = await zrxExecuteTrade<KnownChainIds.EthereumMainnet>(deps, {
      ...execTradeInput,
    })
    expect(maybeTradeResult.isErr()).toBe(false)
    const tradeResult = maybeTradeResult.unwrap()

    expect(tradeResult).toEqual({ tradeId: txid })
  })
})
