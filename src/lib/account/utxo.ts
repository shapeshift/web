import { fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { utxoChainIds } from '@shapeshiftoss/chain-adapters'
import { supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import { PhantomHDWallet } from '@shapeshiftoss/hdwallet-phantom'
import type { AccountMetadataById, UtxoChainId } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/selectors'
import { store } from '@/state/store'

export const deriveUtxoAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args
  const result = await (async () => {
    if (!supportsBTC(wallet)) return {}
    let acc: AccountMetadataById = {}
    for (const chainId of chainIds) {
      if (!utxoChainIds.includes(chainId as UtxoChainId))
        throw new Error(`${chainId} does not exist in ${utxoChainIds}`)
      const adapter = assertGetUtxoChainAdapter(chainId)

      let supportedAccountTypes = adapter.getSupportedAccountTypes()
      if (wallet instanceof MetaMaskMultiChainHDWallet) {
        // MetaMask snaps adapter only supports legacy for BTC and LTC
        supportedAccountTypes = [UtxoAccountType.P2pkh]
      }
      if (wallet instanceof PhantomHDWallet) {
        // Phantom supposedly supports more script types, but only supports Segwit Native (bech32 addresses) for now
        supportedAccountTypes = [UtxoAccountType.SegwitNative]
      }
      for (const accountType of supportedAccountTypes) {
        const pubkey = await (async () => {
          // Check if account already exists in store
          const state = store.getState()
          const accountIdsByNumberAndChain = selectAccountIdsByAccountNumberAndChainId(state)
          const existingAccountIds = accountIdsByNumberAndChain[accountNumber]?.[chainId] ?? []

          // Look for existing account with matching accountType
          for (const accountId of existingAccountIds) {
            const metadata = state.portfolio.accountMetadata.byId[accountId]
            if (metadata?.accountType === accountType) {
              // Found it - extract xpub from accountId (format: "chainId:xpub")
              return fromAccountId(accountId).account
            }
          }

          // Not in store - fetch from device
          const result = await adapter.getPublicKey(wallet, accountNumber, accountType)
          return result.xpub
        })()

        if (!pubkey) continue

        const bip44Params = adapter.getBip44Params({ accountNumber, accountType })
        const accountId = toAccountId({ chainId, account: pubkey })

        acc[accountId] = { accountType, bip44Params }
      }
    }
    return acc
  })()
  return result
}
