import { fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'

import { ChainIdToSafeBaseUrl } from './constants'
import type {
  FetchSafeTransactionArgs,
  SafeMultisigTransactionSuccess,
  SafeTransactionError,
  SafeTxInfo,
} from './types'

const nilSafeTransctionInfo: SafeTxInfo = {
  transaction: null,
  isSafeTxHash: false,
  isQueuedSafeTx: false,
  isExecutedSafeTx: false,
}

export const fetchSafeTransactionInfo = async ({
  safeTxHash,
  accountId,
  fetchIsSmartContractAddressQuery,
}: FetchSafeTransactionArgs): Promise<SafeTxInfo> => {
  const chainId = accountId ? fromAccountId(accountId).chainId : ''
  if (!accountId || !chainId || !isEvmChainId(chainId)) return nilSafeTransctionInfo

  const isSmartContractAddress = await fetchIsSmartContractAddressQuery(
    fromAccountId(accountId).account,
    chainId,
  )

  if (!isSmartContractAddress) {
    // Assume any smart contract address is a SAFE, and by extension, any non-smart contract address is not
    // This is super naive, but this is exactly the same way SAFE does it
    // https://github.com/safe-global/safe-core-sdk/blob/ea0d5018a93f294dfd891e6c8963edcb96431876/packages/protocol-kit/src/Safe.ts#L303
    return nilSafeTransctionInfo
  }

  const baseUrl = ChainIdToSafeBaseUrl[chainId]
  if (!baseUrl) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  try {
    const response = await axios.get<SafeMultisigTransactionSuccess | SafeTransactionError>(
      `${baseUrl}/api/v1/multisig-transactions/${safeTxHash}/`,
    )

    if ('detail' in response.data) {
      return nilSafeTransctionInfo
    }

    const isQueuedSafeTx = Boolean(
      !response.data?.transactionHash &&
        response.data?.confirmations &&
        response.data.confirmations.length <= response.data.confirmationsRequired,
    )
    const isExecutedSafeTx = Boolean(response.data?.transactionHash)
    return {
      transaction: response.data,
      isSafeTxHash: true,
      isQueuedSafeTx,
      isExecutedSafeTx,
    }
  } catch (error) {
    // If the request fails, it's likely not a Safe transaction hash
    return nilSafeTransctionInfo
  }
}

export * from './types'
