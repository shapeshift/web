import type { AssetId, ChainNamespace } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import Web3 from 'web3'

export const generateTrustWalletUrl = (assetId: AssetId) => {
  const { chainNamespace, chainReference, assetReference } = fromAssetId(assetId)
  // https://github.com/trustwallet/assets/tree/master/blockchains
  const chainNamespaceToTrustWallet: Record<ChainNamespace, string> = {
    bip122: 'bitcoin/info',
    cosmos: 'cosmos/info',
    eip155: 'ethereum',
  }

  const trustWalletChainName = chainNamespaceToTrustWallet[chainNamespace]
  let url = `https://rawcdn.githack.com/trustwallet/assets/master/blockchains/${trustWalletChainName}`
  if (chainReference) {
    url += `/assets/`
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm:
        // Skip checksum if we're hitting an EVM chain's native asset
        // since native assets don't have an address
        if (assetReference !== '60') {
          url += Web3.utils.toChecksumAddress(assetReference)
        }
        break
      default:
    }
  }
  return {
    info: `${url}/info.json`,
    icon: `${url}/logo.png`,
  }
}
