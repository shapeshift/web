import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'

import { ChainIdToSafeBaseUrl } from './constants'
import type {
  FetchSafeTransactionArgs,
  SafeMultisigTransactionSuccess,
  SafeTransactionError,
  SafeTxInfo,
} from './types'

export const fetchSafeTransactionInfo = async ({
  chainId,
  safeTxHash,
}: FetchSafeTransactionArgs): Promise<SafeTxInfo> => {
  if (!isEvmChainId(chainId)) return { transaction: null, isSafeTxHash: false }

  const baseUrl = ChainIdToSafeBaseUrl[chainId]
  if (!baseUrl) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  try {
    const response = await axios.get<SafeMultisigTransactionSuccess | SafeTransactionError>(
      `${baseUrl}/api/v1/multisig-transactions/${safeTxHash}/`,
    )

    if ('detail' in response.data) {
      return { transaction: null, isSafeTxHash: false }
    }

    return { transaction: response.data, isSafeTxHash: true }
  } catch (error) {
    // If the request fails, it's likely not a Safe transaction hash
    return { transaction: null, isSafeTxHash: false }
  }
}

export * from './types'
