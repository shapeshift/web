import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import type { Asset } from 'lib/asset-service'
import type { BuildTradeInput, GetTradeQuoteInput, TradeQuote } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { FOX_MAINNET, WETH } from 'lib/swapper/swappers/utils/test-data/assets'

export const setupQuote = () => {
  const sellAsset: Asset = { ...FOX_MAINNET }
  const buyAsset: Asset = { ...WETH }
  const tradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
    minimumCryptoHuman: '0',
    steps: [
      {
        allowanceContract: 'allowanceContractAddress',
        buyAmountBeforeFeesCryptoBaseUnit: '',
        sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
        sellAsset,
        buyAsset,
        accountNumber: 0,
        feeData: {
          networkFeeCryptoBaseUnit: '0',
          protocolFees: {},
        },
        rate: '1',
        sources: [],
      },
    ],
  }

  const quoteInput: GetTradeQuoteInput = {
    chainId: KnownChainIds.EthereumMainnet,
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    sellAsset,
    buyAsset,
    accountNumber: 0,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    affiliateBps: '0',
    supportsEIP1559: false,
    allowMultiHop: false,
  }
  return { quoteInput, tradeQuote, buyAsset, sellAsset }
}

export const setupBuildTrade = () => {
  const sellAsset: Asset = { ...FOX_MAINNET }
  const buyAsset: Asset = { ...WETH }
  const buildTradeInput: BuildTradeInput = {
    wallet: {} as HDWallet,
    chainId: KnownChainIds.EthereumMainnet,
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    buyAsset,
    accountNumber: 0,
    sellAsset,
    receiveAddress: '',
    affiliateBps: '0',
    supportsEIP1559: false,
    slippage: getDefaultSlippagePercentageForSwapper(SwapperName.Test),
    allowMultiHop: false,
  }
  return { buildTradeInput, buyAsset, sellAsset }
}
