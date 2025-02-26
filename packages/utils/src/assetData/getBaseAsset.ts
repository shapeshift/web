import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { assertUnreachable } from '../assertUnreachable'
import {
  arbitrum,
  arbitrumNova,
  atom,
  avax,
  base,
  bitcoin,
  bitcoincash,
  bnbsmartchain,
  dogecoin,
  ethereum,
  gnosis,
  litecoin,
  optimism,
  polygon,
  solana,
  thorchain,
} from './baseAssets'

export const getBaseAsset = (chainId: ChainId): Readonly<Asset> => {
  const knownChainId = chainId as KnownChainIds
  switch (knownChainId) {
    case KnownChainIds.EthereumMainnet:
      return ethereum
    case KnownChainIds.AvalancheMainnet:
      return avax
    case KnownChainIds.OptimismMainnet:
      return optimism
    case KnownChainIds.BnbSmartChainMainnet:
      return bnbsmartchain
    case KnownChainIds.PolygonMainnet:
      return polygon
    case KnownChainIds.GnosisMainnet:
      return gnosis
    case KnownChainIds.ArbitrumMainnet:
      return arbitrum
    case KnownChainIds.ArbitrumNovaMainnet:
      return arbitrumNova
    case KnownChainIds.BaseMainnet:
      return base
    case KnownChainIds.SolanaMainnet:
      return solana
    case KnownChainIds.BitcoinMainnet:
      return bitcoin
    case KnownChainIds.BitcoinCashMainnet:
      return bitcoincash
    case KnownChainIds.DogecoinMainnet:
      return dogecoin
    case KnownChainIds.LitecoinMainnet:
      return litecoin
    case KnownChainIds.CosmosMainnet:
      return atom
    case KnownChainIds.ThorchainMainnet:
      return thorchain
    default:
      return assertUnreachable(knownChainId)
  }
}
