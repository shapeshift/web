import type { ChainId, ChainNamespace, ChainReference } from '../chainId/chainId'
import { fromChainId, toChainId } from '../chainId/chainId'
import { CHAIN_NAMESPACE } from '../constants'
import { assertIsChainId, assertIsChainNamespace, assertIsChainReference } from '../typeGuards'
import type { Nominal } from '../utils'

export type AccountId = Nominal<string, 'AccountId'>

type ToAccountIdWithChainId = {
  chainId: ChainId
  account: string
  chainNamespace?: never
  chainReference?: never
}

type ToAccountIdWithChainIdParts = {
  chainId?: never
  account: string
  chainNamespace: ChainNamespace
  chainReference: ChainReference
}

type ToAccountIdArgs = ToAccountIdWithChainId | ToAccountIdWithChainIdParts

type ToAccountId = (args: ToAccountIdArgs) => AccountId

export const toAccountId: ToAccountId = ({
  chainId: maybeChainId,
  chainNamespace: maybeChainNamespace,
  chainReference: maybeChainReference,
  account,
}) => {
  if (!account) throw new Error(`toAccountId: account is required`)

  const chainId =
    maybeChainId ??
    toChainId({ chainNamespace: maybeChainNamespace, chainReference: maybeChainReference })
  assertIsChainId(chainId)
  const { chainNamespace } = fromChainId(chainId)

  // we lowercase eth accounts as per the draft spec
  // it's not explicit, but cHecKsUM can be recovered from lowercase eth accounts
  // we don't lowercase bitcoin addresses as they'll fail checksum
  const outputAccount = chainNamespace === CHAIN_NAMESPACE.Evm ? account.toLowerCase() : account

  return `${chainId}:${outputAccount}`
}

type FromAccountIdReturn = {
  chainId: ChainId
  account: string
  chainNamespace: ChainNamespace
  chainReference: ChainReference
}

type FromAccountId = (accountId: AccountId) => FromAccountIdReturn

export const fromAccountId: FromAccountId = accountId => {
  const parts = accountId.split(':')

  if (parts.length !== 3) {
    throw new Error(`fromAccountId: invalid AccountId ${accountId}`)
  }

  const chainNamespace = parts[0]
  const chainReference = parts[1]
  const chainId = parts.slice(0, 2).join(':')
  assertIsChainNamespace(chainNamespace)
  assertIsChainReference(chainReference)
  assertIsChainId(chainId)

  const account = parts[2]
  if (!account) {
    throw new Error(`fromAccountId: account required`)
  }

  // we lowercase eth accounts as per the draft spec
  // it's not explicit, but cHecKsUM can be recovered from lowercase eth accounts
  // we don't lowercase bitcoin addresses as they'll fail checksum
  const outputAccount = chainNamespace === CHAIN_NAMESPACE.Evm ? account.toLowerCase() : account

  return { chainId, account: outputAccount, chainNamespace, chainReference }
}

export const toCAIP10 = toAccountId
export const fromCAIP10 = fromAccountId
