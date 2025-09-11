import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type {
  EvmChainAdapter,
  FeeDataEstimate,
  FeeDataKey,
  GetFeeDataInput,
} from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import type { SessionTypes } from '@walletconnect/types'
import type { Hex } from 'viem'
import { hexToString, isAddress, isHex, toHex } from 'viem'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { isSome } from '@/lib/utils'
import type {
  ConfirmData,
  CosmosSignAminoCallRequestParams,
  CosmosSignDirectCallRequestParams,
  CustomTransactionData,
  EthSignParams,
  TransactionParams,
  WalletConnectState,
} from '@/plugins/walletConnectToDapps/types'

/**
 * Converts hex to utf8 string if it is valid bytes
 */
export const maybeConvertHexEncodedMessageToUtf8 = (value: string) => {
  try {
    return isHex(value) ? hexToString(value) : value
  } catch (e) {
    // use raw hex string if unable to convert to utf8 (ex. keccak256)
    return value
  }
}

export const convertNumberToHex = (value: number | string): Hex =>
  typeof value === 'number' ? toHex(value) : toHex(parseInt(value))

export const convertHexToNumber = (value: string): number => parseInt(value, 16)

export const getFeesForTx = async (
  tx: TransactionParams,
  evmChainAdapter: EvmChainAdapter,
  wcAccountId: AccountId,
) => {
  const getFeeDataInput: GetFeeDataInput<EvmChainId> = {
    to: tx.to,
    value: bnOrZero(tx.value).toFixed(0),
    chainSpecific: {
      from: fromAccountId(wcAccountId).account,
      data: tx.data,
    },
  }
  return await evmChainAdapter.getFeeData(getFeeDataInput)
}

export const getGasData = (
  customTransactionData: ConfirmData | CustomTransactionData,
  fees: FeeDataEstimate<EvmChainId>,
) => {
  const { speed } = customTransactionData

  return {
    gasPrice: convertNumberToHex(fees[speed as FeeDataKey].chainSpecific.gasPrice),
  }
}

/**
 * Gets message from various signing request methods by filtering out
 * a value that is not an address (thus is a message).
 * If it is a hex string, it gets converted to utf8 string
 */
export const getSignParamsMessage = (params: [string, string], toUtf8: boolean) => {
  const message = params.filter(p => !isAddress(p))[0]
  return toUtf8 ? maybeConvertHexEncodedMessageToUtf8(message) : message
}

export const extractConnectedAccounts = (session: SessionTypes.Struct): AccountId[] => {
  const namespaces = session?.namespaces ?? []
  const requiredNamespacesValues = Object.values(namespaces)
  return requiredNamespacesValues.map(v => v.accounts).flat()
}

export const extractAllConnectedAccounts = (
  sessionsByTopic: WalletConnectState['sessionsByTopic'],
): AccountId[] => {
  return Array.from(
    new Set(
      Object.values(sessionsByTopic)
        .map(session => {
          if (!session) return undefined
          return extractConnectedAccounts(session)
        })
        .flat()
        .filter(isSome),
    ),
  )
}

// Get our account from params by checking if the params string contains an account from our wallet
export const getWalletAccountFromEthParams = (
  accountIds: AccountId[],
  params: EthSignParams | TransactionParams[],
  chainId: ChainId,
): AccountId => {
  const paramsString = params ? JSON.stringify(params).toLowerCase() : undefined

  const matchingAccounts = accountIds.filter(
    accountId => paramsString?.includes(fromAccountId(accountId).account.toLowerCase()),
  )

  const accountForChain = matchingAccounts.find(
    accountId => fromAccountId(accountId).chainId === chainId,
  )

  return accountForChain ?? ''
}

export const getWalletAccountFromCosmosParams = (
  accountIds: AccountId[],
  params: CosmosSignDirectCallRequestParams | CosmosSignAminoCallRequestParams,
): AccountId => {
  const paramsString = params ? params.signerAddress : undefined
  return (
    accountIds.find(
      accountId => paramsString?.includes(fromAccountId(accountId).account.toLowerCase()),
    ) || ''
  )
}

/**
 * Get our address from params checking if params string contains one
 * of our wallet addresses
 */
export const getWalletAddressFromEthSignParams = (
  accountIds: AccountId[],
  params: EthSignParams,
): string => {
  const addresses = accountIds.map(accountId => fromAccountId(accountId).account)
  const paramsString = params ? JSON.stringify(params).toLowerCase() : undefined
  return addresses.find(address => paramsString?.includes(address.toLowerCase())) || ''
}
