import { AssetIcon } from '../../components/AssetIcon'
import { Plugins } from '../index'
import { BitcoinPluginHomepage } from './BitcoinPluginHomepage'

export function register(): Plugins {
  return [
    [
      'bip122:000000000019d6689c085ae165831e93',
      {
        name: 'Bitcoin',
        icon: <AssetIcon src='https://assets.coincap.io/assets/icons/btc@2x.png' />,
        routes: {
          home: <BitcoinPluginHomepage />
        }
      }
    ]
  ]
}
//   },
//   ethereum: {
//     helpers: {
//       getAccounts() -> caip10[],
//       getAssets() -> null
//     }
//     components: {
//       SingleSidedStakingRow, -> "get started" -> <EthereumSingleSidedStakingPage /> (yearn, tokemak)
//       AccountsList,
//         Account,
//       AssetRow: null
//     }
//     routes: {
//       accounts: <EthereumAccounts />
//       account: <EthereumAccount accountId={x} />
//     }
//   },
//   cosmos: {
//     components: {
//       SingleSidedStakingRow, -> "delgate" -> <CosmosSingleSidedStakingPage /> (atom validators)
//     }
//     routes: {
//       account: <CosmosAccount />
//         send,
//         receive,
//         defi,
//           staking
//     }
//   },
//   osmosis: {
//     components: {
//       AccountsList,
//       SingleSidedStakingRow, -> "delgate" -> <OsmosisSingleSidedStakingPage /> (osmo validators)
//     }
//     routes: {
//       accounts: <CosmosAccount />
//     }
//   }
// }
//
// /
//    account
//
//  */
//
//  */
//
//
//
// class EthereumAccount {
//   routes: {
//     send: <EthereumSendModal accountId={x} tokenId={x] />,
//     receive: <EthereumReceiveModal accountId={x} tokenId={x} />
//   }
// }
