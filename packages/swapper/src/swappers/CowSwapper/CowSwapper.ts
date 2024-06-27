import { type AssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { ethers } from 'ethers'
import { isHex } from 'viem'

import type {
  BuyAssetBySellIdInput,
  EvmMessageExecutionProps,
  EvmMessageToSign,
  Swapper,
} from '../../types'
import { COWSWAP_BASE_URL } from './constants'
import { filterAssetIdsBySellable } from './filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { COW_SWAP_SETTLEMENT_ADDRESS, SIGNING_SCHEME } from './utils/constants'
import { cowService } from './utils/cowService'
import { domain, getCowswapNetwork, hashOrder } from './utils/helpers/helpers'

export const cowSwapper: Swapper = {
  executeEvmMessage: async (
    { chainId, orderToSign }: EvmMessageToSign,
    { signMessage }: EvmMessageExecutionProps,
  ): Promise<string> => {
    const { chainReference } = fromChainId(chainId)
    const signingDomain = Number(chainReference)

    const { appData, appDataHash } = orderToSign
    // We need to construct orderDigest, sign it and send it to cowSwap API, in order to submit a trade
    // Some context about this : https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/4.-signing-the-order
    // For more info, check hashOrder method implementation
    const orderDigest = hashOrder(domain(signingDomain, COW_SWAP_SETTLEMENT_ADDRESS), {
      ...orderToSign,
      // The order we're signing requires the appData to be a hash, not the stringified doc
      // However, the request we're making to *send* the order to the API requires both appData and appDataHash in their original form
      // see https://github.com/cowprotocol/cowswap/blob/a11703f4e93df0247c09d96afa93e13669a3c244/apps/cowswap-frontend/src/legacy/utils/trade.ts#L236
      appData: appDataHash,
    })
    // orderDigest should be an hex string here. All we need to do is pass it to signMessage/wallet.ethSignMessage and sign it
    const messageToSign = orderDigest

    if (!isHex(messageToSign)) throw new Error('messageToSign is not an hex string')

    const signatureOrderDigest = await signMessage(messageToSign)

    // Passing the signature through split/join to normalize the `v` byte.
    // Some wallets do not pad it with `27`, which causes a signature failure
    // `splitSignature` pads it if needed, and `joinSignature` simply puts it back together
    const signature = ethers.Signature.from(ethers.Signature.from(signatureOrderDigest)).serialized

    const maybeNetwork = getCowswapNetwork(chainId)
    if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()

    const network = maybeNetwork.unwrap()

    const maybeOrdersResponse = await cowService.post<string>(
      `${COWSWAP_BASE_URL}/${network}/api/v1/orders/`,
      {
        ...orderToSign,
        signingScheme: SIGNING_SCHEME,
        signature,
        appData,
        appDataHash,
      },
    )

    if (maybeOrdersResponse.isErr()) throw maybeOrdersResponse.unwrapErr()
    const { data: orderUid } = maybeOrdersResponse.unwrap()

    return orderUid
  },

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(filterAssetIdsBySellable(assets))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterBuyAssetsBySellAssetId(input))
  },
}
