import { toAccountId } from '@shapeshiftoss/caip'
import { utxoAccountParams, utxoChainIds } from '@shapeshiftoss/chain-adapters'
import { supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { PhantomHDWallet } from '@shapeshiftoss/hdwallet-phantom'
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import type { AccountMetadataById, UtxoChainId } from '@shapeshiftoss/types'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'

import type { DeriveAccountIdsAndMetadata } from './account'

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
      if (wallet instanceof MetaMaskShapeShiftMultiChainHDWallet) {
        // MetaMask snaps adapter only supports legacy for BTC and LTC
        supportedAccountTypes = [UtxoAccountType.P2pkh]
      }
      if (wallet instanceof PhantomHDWallet) {
        // Phantom supposedly supports more script types, but only supports Segwit Native (bech32 addresses) for now
        supportedAccountTypes = [UtxoAccountType.SegwitNative]
      }
      for (const accountType of supportedAccountTypes) {
        const { xpub: pubkey } = await adapter.getPublicKey(wallet, accountNumber, accountType)

        if (!pubkey) continue

        const { bip44Params } = utxoAccountParams(chainId, accountType, accountNumber)
        const accountId = toAccountId({ chainId, account: pubkey })

        acc[accountId] = { accountType, bip44Params }
      }
    }
    return acc
  })()
  return result
}
