import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { SigningScheme } from '@shapeshiftoss/types'

import { assertGetCowNetwork, signCowOrder } from '../../cowswap-utils'
import type {
  BuyAssetBySellIdInput,
  EvmMessageExecutionProps,
  EvmMessageToSign,
  Swapper,
  SwapperConfig,
} from '../../types'
import { filterAssetIdsBySellable } from './filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { cowService } from './utils/cowService'

export const cowSwapper: Swapper = {
  executeEvmMessage: async (
    { chainId, orderToSign }: EvmMessageToSign,
    { signMessage }: EvmMessageExecutionProps,
    config: SwapperConfig,
  ): Promise<string> => {
    // Removes the types that aren't part of GpV2Order types or structured signing will fail
    const { appDataHash, appData } = orderToSign

    if (!appDataHash) throw Error('Missing appDataHash')

    const signature = await signCowOrder(orderToSign, chainId, signMessage)

    const network = assertGetCowNetwork(chainId)

    const maybeOrdersResponse = await cowService.post<string>(
      `${config.REACT_APP_COWSWAP_BASE_URL}/${network}/api/v1/orders/`,
      {
        ...orderToSign,
        signingScheme: SigningScheme.EIP712,
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
