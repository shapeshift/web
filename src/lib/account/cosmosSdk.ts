import { CHAIN_REFERENCE, fromAccountId, fromChainId, toAccountId } from '@shapeshiftoss/caip'
import { supportsCosmos, supportsMayachain, supportsThorchain } from '@shapeshiftoss/hdwallet-core'
import { MetaMaskMultiChainHDWallet } from '@shapeshiftoss/hdwallet-metamask-multichain'
import type { AccountMetadataById } from '@shapeshiftoss/types'

import type { DeriveAccountIdsAndMetadata } from './account'

import { canAddMetaMaskAccount } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { store } from '@/state/store'

const getCachedOrDeriveAddress = async (
  chainId: string,
  accountNumber: number,
  wallet: any,
  adapter: any,
): Promise<string | undefined> => {
  const state = store.getState()
  const allAccountMetadata = state.portfolio.accountMetadata.byId

  // Check cache for existing address to avoid re-deriving from device
  for (const [accountId, metadata] of Object.entries(allAccountMetadata)) {
    const { chainId: metadataChainId, account } = fromAccountId(accountId)
    const metadataAccountNumber = metadata.bip44Params.accountNumber

    if (metadataChainId === chainId && metadataAccountNumber === accountNumber) {
      return account
    }
  }

  // Not in cache - fetch from device
  return await adapter.getAddress({ accountNumber, wallet })
}

export const deriveCosmosSdkAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet, isSnapInstalled } = args

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
    if (chainReference === CHAIN_REFERENCE.MayachainMainnet) {
      if (!supportsMayachain(wallet)) continue
    }
    if (
      wallet instanceof MetaMaskMultiChainHDWallet &&
      !canAddMetaMaskAccount({ accountNumber, chainId, wallet, isSnapInstalled })
    ) {
      continue
    }

    const bip44Params = adapter.getBip44Params({ accountNumber })
    const pubkey = await getCachedOrDeriveAddress(chainId, accountNumber, wallet, adapter)

    if (!pubkey) continue
    const accountId = toAccountId({ chainId, account: pubkey })
    acc[accountId] = { bip44Params }
  }

  return acc
}
