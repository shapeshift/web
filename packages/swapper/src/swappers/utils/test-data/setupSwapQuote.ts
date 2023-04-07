import { Asset } from '@shapeshiftoss/asset-service'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'

import { BuildTradeInput, GetTradeQuoteInput, TradeQuote } from '../../../api'
import { FOX, WETH } from './assets'

export const setupQuote = () => {
  const sellAsset: Asset = { ...FOX }
  const buyAsset: Asset = { ...WETH }
  const tradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
    buyAmountCryptoBaseUnit: '',
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    sellAsset,
    buyAsset,
    allowanceContract: 'allowanceContractAddress',
    accountNumber: 0,
    minimumCryptoHuman: '0',
    maximum: '999999999999',
    feeData: {
      chainSpecific: {},
      sellAssetTradeFeeUsd: '0',
      networkFeeCryptoBaseUnit: '0',
      buyAssetTradeFeeUsd: '0',
    },
    rate: '1',
    sources: [],
  }

  const quoteInput: GetTradeQuoteInput = {
    chainId: KnownChainIds.EthereumMainnet,
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    sellAsset,
    buyAsset,
    accountNumber: 0,
    sendMax: false,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  }
  return { quoteInput, tradeQuote, buyAsset, sellAsset }
}

export const setupBuildTrade = () => {
  const sellAsset: Asset = { ...FOX }
  const buyAsset: Asset = { ...WETH }
  const buildTradeInput: BuildTradeInput = {
    chainId: KnownChainIds.EthereumMainnet,
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    buyAsset,
    sendMax: false,
    accountNumber: 0,
    sellAsset,
    wallet: <HDWallet>{},
    receiveAddress: '',
  }
  return { buildTradeInput, buyAsset, sellAsset }
}
