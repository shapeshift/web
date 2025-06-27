import { SigningScheme } from '@shapeshiftoss/types'

import { assertGetCowNetwork, signCowOrder } from '../../cowswap-utils'
import type { Swapper } from '../../types'
import { cowService } from './utils/cowService'

export const cowSwapper: Swapper = {
  executeEvmMessage: async ({ chainId, orderToSign }, { signMessage }, config) => {
    // Removes the types that aren't part of GpV2Order types or structured signing will fail
    const { appDataHash, appData } = orderToSign

    if (!appDataHash) throw Error('Missing appDataHash')

    const signature = await signCowOrder(orderToSign, chainId, signMessage)

    const network = assertGetCowNetwork(chainId)

    const maybeOrdersResponse = await cowService.post<string>(
      `${config.VITE_COWSWAP_BASE_URL}/${network}/api/v1/orders/`,
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
}
