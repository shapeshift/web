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
    case KnownChainIds.ArbitrumNovaMainnet:
      return 'ARB-Nova'
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
    case KnownChainIds.ZcashMainnet:
      return 'ZEC'
    default: {
      assertUnreachable(chainId)
    }
  }
}
