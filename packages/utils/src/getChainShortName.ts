import { KnownChainIds } from '@shapeshiftoss/types'

import { assertUnreachable } from './assertUnreachable'

export const getChainShortName = (chainId: KnownChainIds) => {
  switch (chainId) {
    case KnownChainIds.AvalancheMainnet:
      return 'AVA'
    case KnownChainIds.OptimismMainnet:
      return 'OP'
    case KnownChainIds.EthereumMainnet:
      return 'ETH'
    case KnownChainIds.PolygonMainnet:
      return 'POLY'
    case KnownChainIds.GnosisMainnet:
      return 'GNO'
    case KnownChainIds.BnbSmartChainMainnet:
      return 'BNB'
    case KnownChainIds.ArbitrumMainnet:
      return 'ARB'
    case KnownChainIds.BaseMainnet:
      return 'BAS'
    case KnownChainIds.BitcoinMainnet:
      return 'BTC'
    case KnownChainIds.BitcoinCashMainnet:
      return 'BCH'
    case KnownChainIds.CosmosMainnet:
      return 'COSM'
    case KnownChainIds.ThorchainMainnet:
      return 'THOR'
    case KnownChainIds.MayachainMainnet:
      return 'MAYA'
    case KnownChainIds.DogecoinMainnet:
      return 'DOGE'
    case KnownChainIds.LitecoinMainnet:
      return 'LTC'
    case KnownChainIds.SolanaMainnet:
      return 'SOL'
    case KnownChainIds.TronMainnet:
      return 'TRX'
    case KnownChainIds.SuiMainnet:
      return 'SUI'
    case KnownChainIds.StarknetMainnet:
      return 'STRK'
    case KnownChainIds.MonadMainnet:
      return 'MON'
    case KnownChainIds.HyperEvmMainnet:
      return 'HYPE'
    case KnownChainIds.PlasmaMainnet:
      return 'XPL'
    case KnownChainIds.MantleMainnet:
      return 'MNT'
    case KnownChainIds.InkMainnet:
      return 'INK'
    case KnownChainIds.MegaEthMainnet:
      return 'MEGA'
    case KnownChainIds.BerachainMainnet:
      return 'BERA'
    case KnownChainIds.CronosMainnet:
      return 'CRO'
    case KnownChainIds.KatanaMainnet:
      return 'KAT'
    case KnownChainIds.PlumeMainnet:
      return 'PLUME'
    case KnownChainIds.StoryMainnet:
      return 'STORY'
    case KnownChainIds.ZkSyncEraMainnet:
      return 'ZKS'
    case KnownChainIds.BlastMainnet:
      return 'BLAST'
    case KnownChainIds.WorldChainMainnet:
      return 'WLD'
    case KnownChainIds.HemiMainnet:
      return 'HEM'
    case KnownChainIds.LineaMainnet:
      return 'LIN'
    case KnownChainIds.ScrollMainnet:
      return 'SCR'
    case KnownChainIds.SonicMainnet:
      return 'S'
    case KnownChainIds.UnichainMainnet:
      return 'UNI'
    case KnownChainIds.BobMainnet:
      return 'BOB'
    case KnownChainIds.ModeMainnet:
      return 'MODE'
    case KnownChainIds.SoneiumMainnet:
      return 'SON'
    case KnownChainIds.ZcashMainnet:
      return 'ZEC'
    case KnownChainIds.NearMainnet:
      return 'NEAR'
    case KnownChainIds.TonMainnet:
      return 'TON'
    default: {
      assertUnreachable(chainId)
    }
  }
}
