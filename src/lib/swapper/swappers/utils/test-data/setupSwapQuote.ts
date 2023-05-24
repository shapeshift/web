import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Asset } from 'lib/asset-service'
import type { BuildTradeInput, GetTradeQuoteInput, TradeQuote } from 'lib/swapper/api'
import { FOX, WETH } from 'lib/swapper/swappers/utils/test-data/assets'

export const setupQuote = () => {
  const sellAsset: Asset = { ...FOX }
  const buyAsset: Asset = { ...WETH }
  const tradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
    buyAmountBeforeFeesCryptoBaseUnit: '',
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    sellAsset,
    buyAsset,
    allowanceContract: 'allowanceContractAddress',
    accountNumber: 0,
    minimumCryptoHuman: '0',
    maximumCryptoHuman: '999999999999',
    feeData: {
      networkFeeCryptoBaseUnit: '0',
      protocolFees: {},
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
    affiliateBps: '0',
    eip1559Support: false,
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
    wallet: {} as HDWallet,
    receiveAddress: '',
    affiliateBps: '0',
    eip1559Support: false,
    slippage: '50',
  }
  return { buildTradeInput, buyAsset, sellAsset }
}
