import type { AccountId, ChainId, ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, toAccountId, toChainId } from '@shapeshiftoss/caip'
import type { SessionTypes } from '@walletconnect/types'
import { hexToBigInt, hexToString, isAddress, isHex, validateTypedData } from 'viem'

import { isSome } from '@/lib/utils'
import type { WalletConnectState } from '@/plugins/walletConnectToDapps/types'

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

export const getSignParamsMessage = (params: [string, string], toUtf8: boolean, method: string) => {
  const message = params[method === 'personal_sign' ? 0 : 1]
  return toUtf8 ? maybeConvertHexEncodedMessageToUtf8(message) : message
}

const toSupportedAccountId = (accountId: string): AccountId | undefined => {
  try {
    const { chainNamespace, chainReference, account } = fromAccountId(accountId as AccountId)
    return toAccountId({ chainNamespace, chainReference, account })
  } catch {
    return undefined
  }
}

export const extractConnectedAccounts = (
  session: Pick<SessionTypes.Struct, 'namespaces'>,
): AccountId[] => {
  const namespaces: SessionTypes.Namespaces = session.namespaces ?? {}
  return Object.values(namespaces)
    .flatMap(namespace => namespace.accounts ?? [])
    .map(toSupportedAccountId)
    .filter(isSome)
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

export const getRequestSigner = (method: string, params: unknown): string | undefined => {
  if (method === 'personal_sign')
    return Array.isArray(params) && params.length === 2 && typeof params[1] === 'string'
      ? params[1]
      : undefined
  if (
    ['eth_sign', 'eth_signTypedData', 'eth_signTypedData_v3', 'eth_signTypedData_v4'].includes(
      method,
    )
  )
    return Array.isArray(params) && params.length === 2 && typeof params[0] === 'string'
      ? params[0]
      : undefined
  if (['eth_sendTransaction', 'eth_signTransaction'].includes(method))
    return Array.isArray(params) && params.length === 1 && typeof params[0]?.from === 'string'
      ? params[0].from
      : undefined
  if (!params || typeof params !== 'object') return undefined
  if (['cosmos_signAmino', 'cosmos_signDirect'].includes(method))
    return 'signerAddress' in params && typeof params.signerAddress === 'string'
      ? params.signerAddress
      : undefined
  if (['signMessage', 'sendTransfer', 'signPsbt'].includes(method))
    return 'account' in params && typeof params.account === 'string' ? params.account : undefined
  return undefined
}

export const getRequestAccount = (
  accountIds: AccountId[],
  method: string,
  params: unknown,
  chainId: ChainId,
): AccountId | undefined => {
  const signer = getRequestSigner(method, params)
  if (!signer) return undefined
  const isEvm = chainId.startsWith('eip155:')
  if (isEvm && !isAddress(signer, { strict: false })) return undefined
  const matches = Array.from(new Set(accountIds)).filter(accountId => {
    const { chainId: accountChain, account } = fromAccountId(accountId)
    return (
      accountChain === chainId &&
      (isEvm ? account.toLowerCase() === signer.toLowerCase() : account === signer)
    )
  })
  return matches.length === 1 ? matches[0] : undefined
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
