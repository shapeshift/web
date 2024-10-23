import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { GetTradeQuoteInput, TradeQuote } from '../../../types'
import { SwapperName } from '../../../types'
import { DEFAULT_SLIPPAGE } from '../constants'
import { FOX_MAINNET, WETH } from './assets'

export const setupQuote = () => {
  const sellAsset: Asset = { ...FOX_MAINNET }
  const buyAsset: Asset = { ...WETH }
  const tradeQuote: TradeQuote = {
    id: 'foobar',
    receiveAddress: '0x1234',
    affiliateBps: '0',
    potentialAffiliateBps: '0',
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
    hasWallet: true,
    receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    affiliateBps: '0',
    potentialAffiliateBps: '0',
    supportsEIP1559: false,
    allowMultiHop: false,
    slippageTolerancePercentageDecimal: DEFAULT_SLIPPAGE,
  }
  return { quoteInput, tradeQuote, buyAsset, sellAsset }
}
