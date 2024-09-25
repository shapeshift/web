import type { AssetId, ChainNamespace } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { getAddress } from 'viem'

export const generateTrustWalletUrl = (assetId: AssetId) => {
  const { chainNamespace, chainReference, assetReference } = fromAssetId(assetId)
  // https://github.com/trustwallet/assets/tree/master/blockchains
  const chainNamespaceToTrustWallet: Record<ChainNamespace, string> = {
    bip122: 'bitcoin/info',
    cosmos: 'cosmos/info',
    eip155: 'ethereum',
    solana: 'solana',
  }

  const trustWalletChainName = chainNamespaceToTrustWallet[chainNamespace]
  let url = `https://rawcdn.githack.com/trustwallet/assets/master/blockchains/${trustWalletChainName}`
  if (chainReference) {
    url += `/assets/`
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm:
        url += getAddress(assetReference)
        break
      default:
    }
  }
  return {
    info: `${url}/info.json`,
    icon: `${url}/logo.png`,
  }
}
