import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'

export type SafeTxInfo = {
  transaction: SafeTransactionSuccess | null
  isSafeTxHash: boolean
}

export const ChainIdToSafeBaseUrl: Partial<Record<ChainId, string>> = {
  [ethChainId]: 'https://safe-transaction-mainnet.safe.global',
  [avalancheChainId]: 'https://safe-transaction-avalanche.safe.global',
  [optimismChainId]: 'https://safe-transaction-optimism.safe.global',
  [bscChainId]: 'https://safe-transaction-bsc.safe.global',
  [polygonChainId]: 'https://safe-transaction-polygon.safe.global',
  [gnosisChainId]: 'https://safe-transaction-gnosis-chain.safe.global',
  [arbitrumChainId]: 'https://safe-transaction-arbitrum.safe.global',
  [baseChainId]: 'https://safe-transaction-base.safe.global',
}

export type SafeTransactionSuccess = {
  safe: string
  to: string
  value: string
  data: string
  operation: number
  gasToken: string
  safeTxGas: number
  baseGas: number
  gasPrice: string
  refundReceiver: string
  nonce: number
  executionDate: string | null
  submissionDate: string
  modified: string
  blockNumber: number | null
  transactionHash: string | null
  safeTxHash: string
  proposer: string
  executor: string | null
  isExecuted: boolean
  isSuccessful: boolean | null
  ethGasPrice: string | null
  maxFeePerGas: string | null
  maxPriorityFeePerGas: string | null
  gasUsed: number | null
  fee: string | null
  origin: string
  dataDecoded: any
  confirmationsRequired: number
  confirmations: {
    owner: string
    submissionDate: string
    transactionHash: string | null
    signature: string
    signatureType: string
  }[]
  trusted: boolean
  signatures: string | null
}

type SafeTransactionError = {
  detail: string
}

type FetchSafeTransactionArgs = {
  chainId: ChainId
  maybeSafeTxHash: string
}

export const fetchSafeTransactionInfo = async ({
  chainId,
  maybeSafeTxHash,
}: FetchSafeTransactionArgs): Promise<SafeTxInfo> => {
  if (!isEvmChainId(chainId)) return { transaction: null, isSafeTxHash: false }

  const baseUrl = ChainIdToSafeBaseUrl[chainId]
  if (!baseUrl) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  try {
    const response = await axios.get<SafeTransactionSuccess | SafeTransactionError>(
      `${baseUrl}/api/v1/multisig-transactions/${maybeSafeTxHash}/`,
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
