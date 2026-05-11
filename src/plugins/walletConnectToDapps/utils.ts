import type { AccountId, ChainId, ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, toChainId } from '@shapeshiftoss/caip'
import type { SessionTypes } from '@walletconnect/types'
import { hexToBigInt, hexToString, isAddress, isHex, validateTypedData } from 'viem'

import { isSome } from '@/lib/utils'
import type {
  CosmosSignAminoCallRequestParams,
  CosmosSignDirectCallRequestParams,
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

/**
 * Coerces a hex- or decimal-encoded string into a base-10 number string.
 * Returns undefined for empty or invalid input.
 */
export const toNumberString = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  try {
    return (isHex(value) ? hexToBigInt(value) : BigInt(value)).toString()
  } catch {
    return undefined
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

export const getWalletAccountFromBip122Params = (
  accountIds: AccountId[],
  params: { account: string },
): AccountId => {
  const paramsAccount = params.account
  return (
    accountIds.find(accountId => paramsAccount?.includes(fromAccountId(accountId).account)) || ''
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
export const getChainIdFromDomain = (message: string): ChainId | undefined => {
  try {
    const parsed = JSON.parse(message)
    validateTypedData(parsed)

    if (!parsed?.domain?.chainId) return undefined

    return toChainId({
      chainNamespace: CHAIN_NAMESPACE.Evm,
      chainReference: String(parsed.domain.chainId) as ChainReference,
    })
  } catch {
    return undefined
  }
}
