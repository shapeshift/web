import { Amount } from 'components/Amount/Amount'
type AssetBalanceProps = {
  symbol: string
  value: string
  label: string
}
export const Balance: React.FC<AssetBalanceProps> = ({ symbol, value, label }) => {
  return (
    <Amount.Crypto
      lineHeight={1}
      color='gray.500'
      fontSize='sm'
      symbol={symbol}
      prefix={label}
      value={value}
    />
  )
}
