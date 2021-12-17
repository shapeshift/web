export const ACCOUNT_HISTORIC_EARNINGS = `query AccountHistoricEarnings($id: String!, $fromDate: String!, $shareToken: String!, $toDate: BigInt!) {
  account(id: $id) {
    vaultPositions(where: { shareToken: $shareToken }) {
      vault {
        vaultDayData(where: { timestamp_gte: $fromDate, timestamp_lte: $toDate }, orderBy: timestamp, orderDirection: asc, first: 1000) {
          pricePerShare
          timestamp
          tokenPriceUSDC
        }
      }
    }
  }
}
`
