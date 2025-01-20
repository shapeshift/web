import type { AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, solanaChainId } from '@shapeshiftoss/caip'
import { PublicKey } from '@solana/web3.js'

export const isValidSolanaAddress = (contractAddress: string) => {
  try {
    const publicKey = new PublicKey(contractAddress)
    return publicKey !== null
  } catch (error) {
    // If instantiation fails, it's not a valid Solana address
    return false
  }
}

export const getAssetNamespaceFromChainId = (chainId: ChainId): AssetNamespace => {
  switch (chainId) {
    case bscChainId:
      return ASSET_NAMESPACE.bep20
    case solanaChainId:
      return ASSET_NAMESPACE.splToken
    default:
      return ASSET_NAMESPACE.erc20
  }
}
