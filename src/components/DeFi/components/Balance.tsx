import type { TextProps } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
type AssetBalanceProps = {
  symbol: string
  cryptoBalance: string
  fiatBalance: string
  isFiat?: boolean
  label: string
  textAlign?: TextProps['textAlign']
}
export const Balance: React.FC<AssetBalanceProps> = ({
  symbol,
  cryptoBalance,
  fiatBalance,
  label,
  isFiat,
  textAlign = 'left',
}) => {
  return isFiat ? (
    <Amount.Fiat
      flex={1}
      color='gray.500'
      fontSize='sm'
      fontWeight='medium'
      prefix={label}
      value={fiatBalance}
      textAlign={textAlign}
    />
  ) : (
    <Amount.Crypto
      color='gray.500'
      fontWeight='medium'
      fontSize='sm'
      flex={1}
      symbol={symbol}
      prefix={label}
      value={cryptoBalance}
      textAlign={textAlign}
    />
  )
}
