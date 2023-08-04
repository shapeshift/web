import { KnownChainIds } from '@shapeshiftoss/types'
import type { Asset } from 'lib/asset-service'
import type { GetTradeQuoteInput, TradeQuote } from 'lib/swapper/api'
import { FOX_MAINNET, WETH } from 'lib/swapper/swappers/utils/test-data/assets'

import { DEFAULT_SLIPPAGE } from '../constants'

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
    slippageTolerancePercentage: DEFAULT_SLIPPAGE,
  }
  return { quoteInput, tradeQuote, buyAsset, sellAsset }
}
