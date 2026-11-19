import type { AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { isToken } from '@shapeshiftoss/utils'

type ResolveQrAssetIdArgs = {
  qrAssetId: AssetId
  selectedAssetId: AssetId | undefined
  hasAmount: boolean
  isPaymentUri: boolean
}

// EVM and Solana QRs without a token resolve to the native asset, though the sender may mean a token on that chain
export const resolveQrAssetId = ({
  qrAssetId,
  selectedAssetId,
  hasAmount,
  isPaymentUri,
}: ResolveQrAssetIdArgs): { assetId: AssetId; isAmbiguous: boolean } => {
  const { chainId, chainNamespace } = fromAssetId(qrAssetId)
  const supportsErc681 =
    chainNamespace === CHAIN_NAMESPACE.Evm || chainNamespace === CHAIN_NAMESPACE.Solana

  if (!supportsErc681 || isToken(qrAssetId) || hasAmount) {
    return { assetId: qrAssetId, isAmbiguous: false }
  }

  if (selectedAssetId) {
    const selected = fromAssetId(selectedAssetId)
    const isSameChain = isPaymentUri
      ? selected.chainId === chainId
      : selected.chainNamespace === chainNamespace
    if (isSameChain) return { assetId: selectedAssetId, isAmbiguous: false }
  }

  return { assetId: qrAssetId, isAmbiguous: true }
}
