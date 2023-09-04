import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'

type GetThorTxInfoArgs = {
  sellAsset: Asset
  xpub: string
  memo: string
}
type GetThorTxInfoReturn = Promise<{
  opReturnData: string
  vault: string
  pubkey: string
}>

export const getThorTxInfo = async ({
  sellAsset,
  xpub,
  memo,
}: GetThorTxInfoArgs): GetThorTxInfoReturn => {
  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const maybeInboundAddress = await getInboundAddressDataForChain(
    daemonUrl,
    sellAsset.assetId,
    false,
  )

  if (maybeInboundAddress.isErr()) throw maybeInboundAddress.unwrapErr()
  const inboundAddress = maybeInboundAddress.unwrap()
  const vault = inboundAddress.address

  return {
    opReturnData: memo,
    vault,
    pubkey: xpub,
  }
}
