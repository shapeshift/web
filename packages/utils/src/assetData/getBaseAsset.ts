import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { assertUnreachable } from '../assertUnreachable'
import {
  arbitrum,
  atom,
  avax,
  base,
  berachain,
  bitcoin,
  bitcoincash,
  bnbsmartchain,
  bobChain,
  cronos,
  dogecoin,
  ethereum,
  gnosis,
  hemi,
  hyperevm,
  ink,
  katana,
  linea,
  litecoin,
  mantle,
  mayachain,
  megaeth,
  modeChain,
  monad,
  near,
  optimism,
  plasma,
  polygon,
  scroll,
  solana,
  soneium,
  sonic,
  starknet,
  sui,
  thorchain,
  ton,
  tron,
  unichainChain,
  worldchain,
  zcash,
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
    case KnownChainIds.BaseMainnet:
      return base
    case KnownChainIds.SolanaMainnet:
      return solana
    case KnownChainIds.SuiMainnet:
      return sui
    case KnownChainIds.StarknetMainnet:
      return starknet
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
    case KnownChainIds.MayachainMainnet:
      return mayachain
    case KnownChainIds.TronMainnet:
      return tron
    case KnownChainIds.MonadMainnet:
      return monad
    case KnownChainIds.HyperEvmMainnet:
      return hyperevm
    case KnownChainIds.PlasmaMainnet:
      return plasma
    case KnownChainIds.MantleMainnet:
      return mantle
    case KnownChainIds.InkMainnet:
      return ink
    case KnownChainIds.MegaEthMainnet:
      return megaeth
    case KnownChainIds.BerachainMainnet:
      return berachain
    case KnownChainIds.CronosMainnet:
      return cronos
    case KnownChainIds.KatanaMainnet:
      return katana
    case KnownChainIds.WorldChainMainnet:
      return worldchain
    case KnownChainIds.HemiMainnet:
      return hemi
    case KnownChainIds.LineaMainnet:
      return linea
    case KnownChainIds.ScrollMainnet:
      return scroll
    case KnownChainIds.SonicMainnet:
      return sonic
    case KnownChainIds.UnichainMainnet:
      return unichainChain
    case KnownChainIds.BobMainnet:
      return bobChain
    case KnownChainIds.ModeMainnet:
      return modeChain
    case KnownChainIds.SoneiumMainnet:
      return soneium
    case KnownChainIds.NearMainnet:
      return near
    case KnownChainIds.ZcashMainnet:
      return zcash
    case KnownChainIds.TonMainnet:
      return ton
    default:
      return assertUnreachable(knownChainId)
  }
}
