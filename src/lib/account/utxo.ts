import { toAccountId } from '@shapeshiftoss/caip'
import {
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams,
  utxoChainIds,
} from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList, supportsBTC } from '@shapeshiftoss/hdwallet-core'
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
      for (const accountType of supportedAccountTypes) {
        const { bip44Params, scriptType } = utxoAccountParams(chainId, accountType, accountNumber)
        const addressNList = bip32ToAddressNList(toRootDerivationPath(bip44Params))
        const pubkeys = await wallet.getPublicKeys([
          {
            coin: adapter.getCoinName(),
            addressNList,
            curve: 'secp256k1',
            scriptType,
          },
        ])

        // We do not want to throw for all ChainIds and script types, if one fails
        if (!pubkeys?.[0]?.xpub || typeof pubkeys?.[0]?.xpub !== 'string') continue

        const pubkey = convertXpubVersion(pubkeys[0].xpub, accountType)
        if (!pubkey) continue

        const accountId = toAccountId({ chainId, account: pubkey })
        acc[accountId] = { accountType, bip44Params }
      }
    }
    return acc
  })()
  return result
}
