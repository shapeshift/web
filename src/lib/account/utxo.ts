import { fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { utxoChainIds } from '@shapeshiftoss/chain-adapters'
import { supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { PhantomHDWallet } from '@shapeshiftoss/hdwallet-phantom'
import type { AccountMetadataById, UtxoChainId } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { store } from '@/state/store'

const getCachedOrDeriveXpub = async (
  chainId: UtxoChainId,
  accountNumber: number,
  accountType: UtxoAccountType,
  wallet: any,
  adapter: any,
): Promise<string | undefined> => {
  const state = store.getState()
  const allAccountMetadata = state.portfolio.accountMetadata.byId

  // Check cache for existing xpub to avoid re-deriving from device
  for (const [accountId, metadata] of Object.entries(allAccountMetadata)) {
    const { chainId: metadataChainId, account } = fromAccountId(accountId)
    const metadataAccountNumber = metadata.bip44Params.accountNumber

    if (
      metadataChainId === chainId &&
      metadataAccountNumber === accountNumber &&
      metadata.accountType === accountType
    ) {
      return account
    }
  }

  // Not in cache - fetch from device
  const result = await adapter.getPublicKey(wallet, accountNumber, accountType)
  return result.xpub
}

export const deriveUtxoAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args

  if (!supportsBTC(wallet)) return {}

  let acc: AccountMetadataById = {}
  for (const chainId of chainIds) {
    if (!utxoChainIds.includes(chainId as UtxoChainId))
      throw new Error(`${chainId} does not exist in ${utxoChainIds}`)
    const adapter = assertGetUtxoChainAdapter(chainId)

    let supportedAccountTypes = adapter.getSupportedAccountTypes()
    if (wallet instanceof MetaMaskMultiChainHDWallet) {
      supportedAccountTypes = [UtxoAccountType.P2pkh]
    }
    if (wallet instanceof PhantomHDWallet) {
      supportedAccountTypes = [UtxoAccountType.SegwitNative]
    }

    for (const accountType of supportedAccountTypes) {
      const pubkey = await getCachedOrDeriveXpub(
        chainId as UtxoChainId,
        accountNumber,
        accountType,
        wallet,
        adapter,
      )

      if (!pubkey) continue

      const bip44Params = adapter.getBip44Params({ accountNumber, accountType })
      const accountId = toAccountId({ chainId, account: pubkey })

      acc[accountId] = { accountType, bip44Params }
    }
  }

  return acc
}
