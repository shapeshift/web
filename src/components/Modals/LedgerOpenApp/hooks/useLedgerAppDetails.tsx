import type { ChainId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { selectAssetById, selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

// Note these are hardcoded to the ledger app names that are currently supported by the Ledger SDK.
// The name is used by the SDK to prompt the user to open the correct app on their device. A
// mismatch will cause the this feature to break. Be careful when modifying these, as it could break
// Ledger device support.
export const getLedgerAppName = (_chainId: ChainId) => {
  const chainId = _chainId as KnownChainIds
  switch (chainId) {
    case KnownChainIds.ArbitrumMainnet:
    case KnownChainIds.AvalancheMainnet:
    case KnownChainIds.ArbitrumNovaMainnet:
    case KnownChainIds.BaseMainnet:
    case KnownChainIds.BnbSmartChainMainnet:
    case KnownChainIds.EthereumMainnet:
    case KnownChainIds.GnosisMainnet:
    case KnownChainIds.OptimismMainnet:
    case KnownChainIds.PolygonMainnet:
      return 'Ethereum'
    case KnownChainIds.BitcoinCashMainnet:
      return 'Bitcoin Cash'
    case KnownChainIds.BitcoinMainnet:
      return 'Bitcoin'
    case KnownChainIds.CosmosMainnet:
      return 'Cosmos'
    case KnownChainIds.DogecoinMainnet:
      return 'Dogecoin'
    case KnownChainIds.LitecoinMainnet:
      return 'Litecoin'
    case KnownChainIds.ThorchainMainnet:
      return 'THORChain'
    default:
      assertUnreachable(chainId)
  }

  throw Error(`Unsupported chainId: ${chainId}`)
}

export const useLedgerAppDetails = (chainId: ChainId) => {
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const appName = useMemo(() => {
    return getLedgerAppName(chainId)
  }, [chainId])
  const appAsset = useMemo(() => {
    if (evm.isEvmChainId(chainId)) return ethAsset
    return feeAsset
  }, [feeAsset, chainId, ethAsset])

  return { appName, appAsset }
}
