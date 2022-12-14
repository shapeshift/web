import type { AssetId } from '@shapeshiftoss/caip'
import { Amount } from 'components/Amount/Amount'
type AssetBalanceProps = {
  assetId: AssetId
  symbol: string
  cryptoBalanceBaseUnit: string
  fiatBalance: string
  isFiat?: boolean
  label: string
}
export const Balance: React.FC<AssetBalanceProps> = ({
  assetId,
  symbol,
  cryptoBalanceBaseUnit,
  fiatBalance,
  label,
  isFiat,
}) => {
  return isFiat ? (
    <Amount.Fiat
      flex={1}
      lineHeight={1}
      color='gray.500'
      fontSize='sm'
      fontWeight='medium'
      prefix={label}
      value={fiatBalance}
    />
  ) : (
    <Amount.FromBaseUnit
      assetId={assetId}
      lineHeight={1}
      color='gray.500'
      fontWeight='medium'
      fontSize='sm'
      flex={1}
      symbol={symbol}
      prefix={label}
      value={cryptoBalanceBaseUnit}
    />
  )
}
