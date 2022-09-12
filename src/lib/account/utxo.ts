import { toAccountId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import {
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams,
  utxoChainIds,
} from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList, supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { AccountMetadataById } from 'state/slices/portfolioSlice/portfolioSliceCommon'

import type { DeriveAccountIdsAndMetadata } from './account'

export const deriveUtxoAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args
  const result = await (async () => {
    if (!supportsBTC(wallet)) return {}
    let acc: AccountMetadataById = {}
    for (const chainId of chainIds) {
      if (!utxoChainIds.includes(chainId as UtxoChainId))
        throw new Error(`${chainId} does not exist in ${utxoChainIds}`)
      const adapter = getChainAdapterManager().get(
        chainId,
      ) as unknown as UtxoBaseAdapter<UtxoChainId>

      for (const accountType of adapter.getSupportedAccountTypes()) {
        const { bip44Params, scriptType } = utxoAccountParams(chainId, accountType, accountNumber)
        const pubkeys = await wallet.getPublicKeys([
          {
            coin: adapter.getCoinName(),
            addressNList: bip32ToAddressNList(toRootDerivationPath(bip44Params)),
            curve: 'secp256k1',
            scriptType,
          },
        ])

        if (!pubkeys?.[0]?.xpub) throw new Error('failed to get public key')

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
