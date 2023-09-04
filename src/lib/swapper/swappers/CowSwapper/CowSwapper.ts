import { type AssetId, fromChainId } from '@shapeshiftoss/caip'
import { getConfig } from 'config'
import { ethers } from 'ethers'
import type { Asset } from 'lib/asset-service'
import type {
  BuyAssetBySellIdInput,
  CowTradeExecutionProps,
  CowTransactionRequest,
  Swapper,
} from 'lib/swapper/types'

import { filterAssetIdsBySellable } from './filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { COW_SWAP_SETTLEMENT_ADDRESS, SIGNING_SCHEME } from './utils/constants'
import { cowService } from './utils/cowService'
import { domain, getCowswapNetwork, hashOrder } from './utils/helpers/helpers'

export const cowSwapper: Swapper = {
  executeTradeCow: async (
    { chainId, orderToSign }: CowTransactionRequest,
    { signMessage }: CowTradeExecutionProps,
  ): Promise<string> => {
    const { chainReference } = fromChainId(chainId)
    const signingDomain = Number(chainReference)

    // We need to construct orderDigest, sign it and send it to cowSwap API, in order to submit a trade
    // Some context about this : https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/4.-signing-the-order
    // For more info, check hashOrder method implementation
    const orderDigest = hashOrder(domain(signingDomain, COW_SWAP_SETTLEMENT_ADDRESS), orderToSign)
    const messageToSign = ethers.utils.arrayify(orderDigest)
    const signatureOrderDigest = await signMessage(messageToSign)

    // Passing the signature through split/join to normalize the `v` byte.
    // Some wallets do not pad it with `27`, which causes a signature failure
    // `splitSignature` pads it if needed, and `joinSignature` simply puts it back together
    const signature = ethers.utils.joinSignature(ethers.utils.splitSignature(signatureOrderDigest))

    const maybeNetwork = getCowswapNetwork(chainId)
    if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()

    const network = maybeNetwork.unwrap()
    const baseUrl = getConfig().REACT_APP_COWSWAP_BASE_URL

    const maybeOrdersResponse = await cowService.post<string>(
      `${baseUrl}/${network}/api/v1/orders/`,
      {
        ...orderToSign,
        signingScheme: SIGNING_SCHEME,
        signature,
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
