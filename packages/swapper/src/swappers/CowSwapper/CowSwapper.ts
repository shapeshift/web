import type { ChainId } from '@shapeshiftoss/caip'
import { type AssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { type OrderCreation, SigningScheme } from '@shapeshiftoss/types/dist/cowSwap'
import type { TypedData } from 'eip-712'
import { ethers } from 'ethers'

import type {
  BuyAssetBySellIdInput,
  EvmMessageExecutionProps,
  EvmMessageToSign,
  Swapper,
  SwapperConfig,
} from '../../types'
import { filterAssetIdsBySellable } from './filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { COW_SWAP_SETTLEMENT_ADDRESS } from './utils/constants'
import { cowService } from './utils/cowService'
import { domain, getCowswapNetwork, getSignTypeDataPayload } from './utils/helpers/helpers'

export const executeCowEvmMessage = async (
  chainId: ChainId,
  orderToSign: Omit<OrderCreation, 'signature'>,
  signMessage: (messageToSign: TypedData) => Promise<string>,
  config: Pick<SwapperConfig, 'REACT_APP_COWSWAP_BASE_URL'>,
): Promise<string> => {
  const { chainReference } = fromChainId(chainId)
  const signingDomain = Number(chainReference)

  // Removes the types that aren't part of GpV2Order types or structured signing will fail
  const { signingScheme, quoteId, appDataHash, appData, ...message } = orderToSign

  if (!appDataHash) throw Error('Missing appDataHash')

  const signTypedData = getSignTypeDataPayload(domain(signingDomain, COW_SWAP_SETTLEMENT_ADDRESS), {
    ...message,
    // The order we're signing requires the appData to be a hash, not the stringified doc
    // However, the request we're making to *send* the order to the API requires both appData and appDataHash in their original form
    // see https://github.com/cowprotocol/cowswap/blob/a11703f4e93df0247c09d96afa93e13669a3c244/apps/cowswap-frontend/src/legacy/utils/trade.ts#L236
    appData: appDataHash,
  })

  const signedTypeData = await signMessage(signTypedData)

  // Passing the signature through split/join to normalize the `v` byte.
  // Some wallets do not pad it with `27`, which causes a signature failure
  // `splitSignature` pads it if needed, and `joinSignature` simply puts it back together
  const signature = ethers.Signature.from(ethers.Signature.from(signedTypeData)).serialized

  const maybeNetwork = getCowswapNetwork(chainId)
  if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()

  const network = maybeNetwork.unwrap()

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
}

export const cowSwapper: Swapper = {
  executeEvmMessage: async (
    { chainId, orderToSign }: EvmMessageToSign,
    { signMessage }: EvmMessageExecutionProps,
    config: Pick<SwapperConfig, 'REACT_APP_COWSWAP_BASE_URL'>,
  ): Promise<string> => {
    return await executeCowEvmMessage(chainId, orderToSign, signMessage, config)
  },

  filterAssetIdsBySellable: (assets: Asset[]): Promise<AssetId[]> => {
    return Promise.resolve(filterAssetIdsBySellable(assets))
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): Promise<AssetId[]> => {
    return Promise.resolve(filterBuyAssetsBySellAssetId(input))
  },
}
