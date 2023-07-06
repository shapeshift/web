import type { KnownChainIds } from '@shapeshiftoss/types'
import { CowSwapper } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { ThorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { ETH, FOX_MAINNET, WETH } from 'lib/swapper/swappers/utils/test-data/assets'
import { ZrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

import type { TradeQuote } from '../api'
import { SwapperName } from '../api'

export const getZrxSwapper = () => new ZrxSwapper()

export const getCowSwapper = () => new CowSwapper()

export const getThorchainSwapper = () => new ThorchainSwapper()

export const tradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
  minimumCryptoHuman: '60',
  steps: [
    {
      allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
      sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000000', // 1000 FOX
      buyAmountBeforeFeesCryptoBaseUnit: '23448326921811747', // 0.023 ETH
      feeData: {
        protocolFees: {
          [FOX_MAINNET.assetId]: {
            amountCryptoBaseUnit: '191400000000000000000',
            requiresBalance: false,
            asset: FOX_MAINNET,
          },
        },
        networkFeeCryptoBaseUnit: '3246750000000000',
      },
      rate: '0.00002509060972289251',
      sources: [{ name: SwapperName.Thorchain, proportion: '1' }],
      buyAsset: ETH,
      sellAsset: FOX_MAINNET,
      accountNumber: 0,
    },
  ],
}

export const bestTradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
  ...tradeQuote,
  steps: [
    {
      ...tradeQuote.steps[0],
      buyAmountBeforeFeesCryptoBaseUnit: '23000000000000000', // 0.023 ETH
      feeData: {
        protocolFees: {
          [FOX_MAINNET.assetId]: {
            amountCryptoBaseUnit: '191400000000000000000',
            requiresBalance: false,
            asset: FOX_MAINNET,
          },
        },
        networkFeeCryptoBaseUnit: '3246750000000000',
      },
      buyAsset: WETH,
    },
  ],
}

export const suboptimalTradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
  ...tradeQuote,
  steps: [
    {
      ...tradeQuote.steps[0],
      buyAmountBeforeFeesCryptoBaseUnit: '21000000000000000', // 0.021 ETH
      feeData: {
        protocolFees: {
          [FOX_MAINNET.assetId]: {
            amountCryptoBaseUnit: '266400000000000000000',
            requiresBalance: false,
            asset: FOX_MAINNET,
          },
        },
        networkFeeCryptoBaseUnit: '3446750000000000',
      },
      buyAsset: WETH,
    },
  ],
}
