import { payments } from '@shapeshiftoss/bitcoinjs-lib'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { btcChainId, CHAIN_NAMESPACE, fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ProposalTypes, SessionTypes } from '@walletconnect/types'
import * as bip32 from 'bip32'
import { uniq } from 'lodash'

import {
  BIP122SigningMethod,
  CosmosSigningMethod,
  EIP155_SigningMethod,
} from '@/plugins/walletConnectToDapps/types'

const DEFAULT_EIP155_METHODS = Object.values(EIP155_SigningMethod).filter(
  method => method !== EIP155_SigningMethod.GET_CAPABILITIES,
)

const DEFAULT_BIP122_METHODS = Object.values(BIP122SigningMethod)
const DEFAULT_BIP122_EVENTS: string[] = []

const DEFAULT_COSMOS_METHODS = Object.values(CosmosSigningMethod)
const DEFAULT_COSMOS_EVENTS: string[] = []

const isBip122ChainId = (chainId: string): boolean => chainId === btcChainId

const isCosmosSdkChainId = (chainId: string): boolean =>
  chainId.startsWith(`${CHAIN_NAMESPACE.CosmosSdk}:`)

export const isWcSupportedChainId = (chainId: string): boolean =>
  isEvmChainId(chainId) || isBip122ChainId(chainId) || isCosmosSdkChainId(chainId)

const ZPUB_NETWORK = {
  bip32: { public: 0x04b24746, private: 0x04b2430c },
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
}

const YPUB_NETWORK = {
  bip32: { public: 0x049d7cb2, private: 0x049d7878 },
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
}

const XPUB_NETWORK = {
  bip32: { public: 0x0488b21e, private: 0x0488ade4 },
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
}

export const isExtPubKey = (account: string): boolean =>
  ['xpub', 'ypub', 'zpub', 'tpub', 'upub', 'vpub', 'Ypub', 'Zpub', 'dgub', 'Mtub', 'Ltub'].some(
    prefix => account.startsWith(prefix),
  )

export const deriveAddressFromExtPubKey = (extPubKey: string): string => {
  const isNativeSegwit =
    extPubKey.startsWith('zpub') || extPubKey.startsWith('vpub') || extPubKey.startsWith('Zpub')
  const isNestedSegwit = extPubKey.startsWith('ypub') || extPubKey.startsWith('Ypub')

  const network = (() => {
    if (isNativeSegwit) return ZPUB_NETWORK
    if (isNestedSegwit) return YPUB_NETWORK
    return XPUB_NETWORK
  })()

  const node = bip32.fromBase58(extPubKey, network)
  const child = node.derive(0).derive(0)

  if (isNativeSegwit) {
    const { address } = payments.p2wpkh({ pubkey: child.publicKey, network })
    if (!address) throw new Error('Failed to derive P2WPKH address')
    return address
  }

  if (isNestedSegwit) {
    const { address } = payments.p2sh({
      redeem: payments.p2wpkh({ pubkey: child.publicKey, network }),
      network,
    })
    if (!address) throw new Error('Failed to derive P2SH-P2WPKH address')
    return address
  }

  const { address } = payments.p2pkh({ pubkey: child.publicKey, network })
  if (!address) throw new Error('Failed to derive P2PKH address')
  return address
}

const utxoAccountIdToWcAccount = (accountId: AccountId): string => {
  const { chainId, account } = fromAccountId(accountId)
  if (chainId !== btcChainId || !isExtPubKey(account)) return accountId
  const address = deriveAddressFromExtPubKey(account)
  return toAccountId({ chainId, account: address })
}

const getDefaultMethods = (key: string): string[] => {
  switch (key) {
    case CHAIN_NAMESPACE.Evm:
      return DEFAULT_EIP155_METHODS
    case CHAIN_NAMESPACE.Utxo:
      return DEFAULT_BIP122_METHODS
    case CHAIN_NAMESPACE.CosmosSdk:
      return DEFAULT_COSMOS_METHODS
    default:
      return []
  }
}

export const createApprovalNamespaces = (
  requiredNamespaces: ProposalTypes.RequiredNamespaces,
  optionalNamespaces: ProposalTypes.OptionalNamespaces,
  selectedAccountIds: AccountId[],
  selectedChainIds: ChainId[],
): SessionTypes.Namespaces => {
  const approvedNamespaces: SessionTypes.Namespaces = {}

  const createNamespaceEntry = (
    key: string,
    proposalNamespace: ProposalTypes.RequiredNamespace,
    accounts: string[],
  ) => {
    const defaultMethods = getDefaultMethods(key)
    const methods = defaultMethods.length > 0 ? defaultMethods : proposalNamespace.methods

    return {
      accounts,
      methods,
      events: proposalNamespace.events,
    }
  }

  Object.entries(requiredNamespaces).forEach(([key, proposalNamespace]) => {
    const selectedAccountsForKey = selectedAccountIds
      .filter(accountId => {
        const { chainNamespace } = fromAccountId(accountId)
        return chainNamespace === key
      })
      .map(accountId =>
        key === CHAIN_NAMESPACE.Utxo ? utxoAccountIdToWcAccount(accountId) : accountId,
      )

    if (selectedAccountsForKey.length > 0) {
      approvedNamespaces[key] = createNamespaceEntry(key, proposalNamespace, selectedAccountsForKey)
    }
  })

  const requiredChainIds = Object.values(requiredNamespaces).flatMap(
    namespace => namespace.chains ?? [],
  )

  const additionalEvmChainIds = selectedChainIds.filter(
    chainId => isEvmChainId(chainId) && !requiredChainIds.includes(chainId),
  )

  if (additionalEvmChainIds.length > 0) {
    const eip155AccountIds = selectedAccountIds.filter(
      accountId =>
        fromAccountId(accountId).chainNamespace === CHAIN_NAMESPACE.Evm &&
        additionalEvmChainIds.includes(fromAccountId(accountId).chainId),
    )

    if (eip155AccountIds.length > 0) {
      const existing = approvedNamespaces.eip155
      approvedNamespaces.eip155 = {
        ...(existing ?? {}),
        accounts: uniq([...(existing?.accounts ?? []), ...eip155AccountIds]),
        methods: uniq([
          ...(existing?.methods ?? DEFAULT_EIP155_METHODS),
          ...(optionalNamespaces?.eip155?.methods && optionalNamespaces.eip155.methods.length > 0
            ? optionalNamespaces.eip155.methods
            : DEFAULT_EIP155_METHODS),
        ]),
        events: uniq([...(existing?.events ?? []), ...(optionalNamespaces?.eip155?.events ?? [])]),
      }
    }
  }

  const additionalBip122ChainIds = selectedChainIds.filter(
    chainId => isBip122ChainId(chainId) && !requiredChainIds.includes(chainId),
  )

  if (additionalBip122ChainIds.length > 0) {
    const bip122AccountIds = selectedAccountIds
      .filter(
        accountId =>
          fromAccountId(accountId).chainNamespace === CHAIN_NAMESPACE.Utxo &&
          additionalBip122ChainIds.includes(fromAccountId(accountId).chainId),
      )
      .map(utxoAccountIdToWcAccount)

    if (bip122AccountIds.length > 0) {
      const existing = approvedNamespaces.bip122
      approvedNamespaces.bip122 = {
        ...(existing ?? {}),
        accounts: uniq([...(existing?.accounts ?? []), ...bip122AccountIds]),
        methods: uniq([
          ...(existing?.methods ?? DEFAULT_BIP122_METHODS),
          ...(optionalNamespaces?.bip122?.methods && optionalNamespaces.bip122.methods.length > 0
            ? optionalNamespaces.bip122.methods
            : DEFAULT_BIP122_METHODS),
        ]),
        events: uniq([
          ...(existing?.events ?? DEFAULT_BIP122_EVENTS),
          ...(optionalNamespaces?.bip122?.events ?? []),
        ]),
      }
    }
  }

  const cosmosNamespaceKey = CHAIN_NAMESPACE.CosmosSdk
  const additionalCosmosChainIds = selectedChainIds.filter(
    chainId => isCosmosSdkChainId(chainId) && !requiredChainIds.includes(chainId),
  )

  if (additionalCosmosChainIds.length > 0) {
    const cosmosAccountIds = selectedAccountIds.filter(
      accountId =>
        fromAccountId(accountId).chainNamespace === cosmosNamespaceKey &&
        additionalCosmosChainIds.includes(fromAccountId(accountId).chainId),
    )

    if (cosmosAccountIds.length > 0) {
      const existing = approvedNamespaces[cosmosNamespaceKey]
      approvedNamespaces[cosmosNamespaceKey] = {
        ...(existing ?? {}),
        accounts: uniq([...(existing?.accounts ?? []), ...cosmosAccountIds]),
        methods: uniq([
          ...(existing?.methods ?? DEFAULT_COSMOS_METHODS),
          ...(optionalNamespaces?.[cosmosNamespaceKey]?.methods &&
          optionalNamespaces[cosmosNamespaceKey].methods.length > 0
            ? optionalNamespaces[cosmosNamespaceKey].methods
            : DEFAULT_COSMOS_METHODS),
        ]),
        events: uniq([
          ...(existing?.events ?? DEFAULT_COSMOS_EVENTS),
          ...(optionalNamespaces?.[cosmosNamespaceKey]?.events ?? DEFAULT_COSMOS_EVENTS),
        ]),
      }
    }
  }

  return approvedNamespaces
}
