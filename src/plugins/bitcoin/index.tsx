import { Plugin } from '../index'

export function register(): Plugin {
  return [
    [
      'bip122:000000000019d6689c085ae165831e93',
      {
        widgets: {
          accounts: {
            list: () => <UTXOAccountsList translations={'bitcoin.balh'} />,
            row: (accountId: string) => <BitcoinAccountRow accountId={accountId} />
          },
          assets: {
            list: () => <BitcoinAssetsList />
          },
          singleSidedStaking: {
            row: accountId => <BitcoinSingleSidedStakingRow />
          }
        },
        routes: {
          home: <BitcoinAccountsPage />
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
