import type { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import type Web3 from 'web3'
import { CowSwapper } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import type { ThorchainSwapperDeps } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { ThorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { ETH, FOX_MAINNET, WETH } from 'lib/swapper/swappers/utils/test-data/assets'
import { ZrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

import type { TradeQuote } from '../api'
import { SwapperName } from '../api'

export const getZrxSwapper = () => new ZrxSwapper()

export const getCowSwapper = () =>
  new CowSwapper([KnownChainIds.GnosisMainnet, KnownChainIds.EthereumMainnet])

const thorchainSwapperDeps: ThorchainSwapperDeps = {
  midgardUrl: '',
  daemonUrl: '',
  adapterManager: {} as ChainAdapterManager,
  web3: {} as Web3,
}

export const getThorchainSwapper = () => new ThorchainSwapper(thorchainSwapperDeps)

export const tradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
  minimumCryptoHuman: '60',
  maximumCryptoHuman: '1000000000000000000000',
  sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000000', // 1000 FOX
  allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
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
}

export const bestTradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
  ...tradeQuote,
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
}

export const suboptimalTradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
  ...tradeQuote,
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
}
