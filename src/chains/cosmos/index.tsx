export default function register() {
  return {
    [caip2]: {
      functions: {
        getAccounts() => {[caip10]: string}
      },
      components: {
        accounts: {
          list: () => <CosmosAccountsList translations={'bitcoin.balh'} />,
          row: (accountId: string) => <EthereumAccountRow accountId={accountId} />
        },
        assets: {
          list: () => <CosmosAssetsList />,
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
