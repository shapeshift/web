import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

type AccountRowData = {
  name: string
  icon: string
  fiatAmount: string
  cryptoAmount: string
  assetId: AccountSpecifier
  allocation: number
  price: string
  priceChange: number
}

export const AccountTable = () => {
  return <></>
}
