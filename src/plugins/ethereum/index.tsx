export default function register() {
  return {
    [caip2]: {
      functions: {

      },
      components: {
        accounts: {
          list: () => <EVMAccountsList translations={'bitcoin.balh'}/>,
          row: (accountId: string) => <EthereumAccountRow accountId={accountId} />
        },
        assets: {
          list: () => <EVMAssetsList />,
        },
        singleSidedStaking: {
          row: (accountId) => <BitcoinSingleSidedStakingRow />
        }
      },
      routes: {
        accounts: <BitcoinAccountsPage />,
        account: (accountId: string) => <BitcoinAccountPage accountId={accountId} />,
      }
    }
  }
}
