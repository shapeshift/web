import { CHAIN_REFERENCE, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsCosmos, supportsThorchain } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskShapeShiftMultiChainHDWallet } from '@shapeshiftoss/hdwallet-shapeshift-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { canAddMetaMaskAccount } from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'

import type { DeriveAccountIdsAndMetadata } from './account'

export const deriveCosmosSdkAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet, isSnapInstalled } = args
  const result = await (async () => {
    let acc: AccountMetadataById = {}
    for (const chainId of chainIds) {
      const { chainReference } = fromChainId(chainId)
      const adapter = assertGetCosmosSdkChainAdapter(chainId)
      if (chainReference === CHAIN_REFERENCE.CosmosHubMainnet) {
        if (!supportsCosmos(wallet)) continue
      }
      if (chainReference === CHAIN_REFERENCE.ThorchainMainnet) {
        if (!supportsThorchain(wallet)) continue
      }
      if (
        wallet instanceof MetaMaskShapeShiftMultiChainHDWallet &&
        !canAddMetaMaskAccount({ accountNumber, chainId, wallet, isSnapInstalled })
      ) {
        continue
      }

      const bip44Params = adapter.getBIP44Params({ accountNumber })
      const pubkey = await adapter.getAddress({
        accountNumber,
        wallet,
        // This method should really only ever do on-device derivation, and, in the case of Ledger, be called at accounts management time
        // so we don't want nor need to spew Ledger open app check intervals
        checkLedgerAppOpenIfLedgerConnected: () => Promise.resolve(),
      })
      if (!pubkey) continue
      const accountId = toAccountId({ chainId, account: pubkey })
      acc[accountId] = { bip44Params }
    }
    return acc
  })()
  return result
}
