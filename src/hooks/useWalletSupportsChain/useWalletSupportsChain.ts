import { caip2 } from '@shapeshiftoss/caip'
import { HDWallet, supportsBTC, supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

type UseWalletSupportsChainArgs = { asset: Asset; wallet: HDWallet | null }
type UseWalletSupportsChain = (args: UseWalletSupportsChainArgs) => boolean

// this whole thing should belong in chain adapters/future wallet SDK
// it should also just accept a caip19 and a wallet
export const useWalletSupportsChain: UseWalletSupportsChain = ({ asset, wallet }) => {
  if (!wallet) return false
  const ethCAIP2 = caip2.toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
  const btcCAIP2 = caip2.toCAIP2({ chain: ChainTypes.Bitcoin, network: NetworkTypes.MAINNET })
  const assetCAIP2 = caip2.toCAIP2({ chain: asset.chain, network: asset.network })
  switch (assetCAIP2) {
    case ethCAIP2: {
      return supportsETH(wallet)
    }
    case btcCAIP2: {
      return supportsBTC(wallet)
    }
    default: {
      console.error(`useWalletSupportsChain: unknown caip2 ${assetCAIP2}`)
      return false
    }
  }
}
