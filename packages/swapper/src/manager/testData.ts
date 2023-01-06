import { ChainAdapterManager, ethereum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { SwapperName, TradeQuote } from '../api'
import {
  CowSwapper,
  CowSwapperDeps,
  ThorchainSwapper,
  ThorchainSwapperDeps,
  ZrxSwapper,
} from '../swappers'
import { ETH, FOX, WETH } from '../swappers/utils/test-data/assets'
import { ZrxSwapperDeps } from '../swappers/zrx/types'

const zrxEthereumSwapperDeps: ZrxSwapperDeps = {
  web3: <Web3>{},
  adapter: <ethereum.ChainAdapter>{
    getChainId: () => KnownChainIds.EthereumMainnet,
  },
}

export const getZrxEthereumSwapper = () => new ZrxSwapper(zrxEthereumSwapperDeps)

const zrxAvalancheSwapperDeps: ZrxSwapperDeps = {
  web3: <Web3>{},
  adapter: <ethereum.ChainAdapter>{
    getChainId: () => KnownChainIds.AvalancheMainnet,
  },
}

export const getZrxAvalancheSwapper = () => new ZrxSwapper(zrxAvalancheSwapperDeps)

const cowSwapperDeps: CowSwapperDeps = {
  apiUrl: 'https://api.cow.fi/mainnet/api/',
  adapter: <ethereum.ChainAdapter>{
    getChainId: () => KnownChainIds.EthereumMainnet,
  },
  web3: <Web3>{},
}

export const getCowSwapper = () => new CowSwapper(cowSwapperDeps)

const thorchainSwapperDeps: ThorchainSwapperDeps = {
  midgardUrl: '',
  daemonUrl: '',
  adapterManager: <ChainAdapterManager>{},
  web3: <Web3>{},
}

export const getThorchainSwapper = () => new ThorchainSwapper(thorchainSwapperDeps)

export const tradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
  minimumCryptoHuman: '60',
  maximum: '1000000000000000000000',
  sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000000', // 1000 FOX
  allowanceContract: '0x3624525075b88B24ecc29CE226b0CEc1fFcB6976',
  buyAmountCryptoBaseUnit: '23448326921811747', // 0.023 ETH
  feeData: {
    chainSpecific: {
      estimatedGas: '100000',
      approvalFeeCryptoBaseUnit: '700000',
      gasPriceCryptoBaseUnit: '7',
    },
    buyAssetTradeFeeUsd: '7.656',
    sellAssetTradeFeeUsd: '0',
    networkFeeCryptoBaseUnit: '3246750000000000',
  },
  rate: '0.00002509060972289251',
  sources: [{ name: SwapperName.Thorchain, proportion: '1' }],
  buyAsset: ETH,
  sellAsset: FOX,
  accountNumber: 0,
}

export const goodTradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
  ...tradeQuote,
  buyAmountCryptoBaseUnit: '23000000000000000', // 0.023 ETH
  feeData: {
    chainSpecific: {
      estimatedGas: '100000',
      approvalFeeCryptoBaseUnit: '700000',
      gasPriceCryptoBaseUnit: '7',
    },
    buyAssetTradeFeeUsd: '7.656',
    sellAssetTradeFeeUsd: '0',
    networkFeeCryptoBaseUnit: '3246750000000000',
  },
  buyAsset: WETH,
}

export const badTradeQuote: TradeQuote<KnownChainIds.EthereumMainnet> = {
  ...tradeQuote,
  buyAmountCryptoBaseUnit: '21000000000000000', // 0.021 ETH
  feeData: {
    chainSpecific: {
      estimatedGas: '100000',
      approvalFeeCryptoBaseUnit: '700000',
      gasPriceCryptoBaseUnit: '7',
    },
    buyAssetTradeFeeUsd: '10.656',
    sellAssetTradeFeeUsd: '4',
    networkFeeCryptoBaseUnit: '3446750000000000',
  },
  buyAsset: WETH,
}
