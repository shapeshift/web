import { Amount as AmountComponent } from 'components/Amount/Amount'
import { fromBaseUnit } from 'lib/math'

export const Amount = ({
  value,
  symbol,
  precision,
}: {
  value: string
  symbol: string
  precision: number
}) => (
  <AmountComponent.Crypto
    lineHeight={1}
    value={fromBaseUnit(value ?? '0', precision)}
    symbol={symbol ?? ''}
    maximumFractionDigits={6}
  />
)
