import type { GetTradeQuoteInput, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { FOX_MAINNET, WETH } from 'lib/swapper/swappers/utils/test-data/assets'

import { DEFAULT_SLIPPAGE } from '../constants'

export const setupQuote = () => {
  const sellAsset: Asset = { ...FOX_MAINNET }
  const buyAsset: Asset = { ...WETH }
  const tradeQuote: TradeQuote = {
    id: 'foobar',
    receiveAddress: '0x1234',
    affiliateBps: undefined,
    potentialAffiliateBps: undefined,
    slippageTolerancePercentageDecimal: '0',
    rate: '1',
    steps: [
      {
        estimatedExecutionTimeMs: undefined,
        allowanceContract: 'allowanceContractAddress',
        buyAmountBeforeFeesCryptoBaseUnit: '',
        buyAmountAfterFeesCryptoBaseUnit: '',
        sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
        sellAsset,
        buyAsset,
        accountNumber: 0,
        feeData: {
          networkFeeCryptoBaseUnit: '0',
          protocolFees: {},
        },
        rate: '1',
        source: SwapperName.Test,
      },
    ],
  }

  const quoteInput: GetTradeQuoteInput = {
    chainId: KnownChainIds.EthereumMainnet,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
    sellAsset,
    buyAsset,
    accountNumber: 0,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    isKeepKey: false,
    affiliateBps: '0',
    potentialAffiliateBps: '0',
    supportsEIP1559: false,
    allowMultiHop: false,
    slippageTolerancePercentageDecimal: DEFAULT_SLIPPAGE,
  }
  return { quoteInput, tradeQuote, buyAsset, sellAsset }
}
