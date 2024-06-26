import type { AssetId } from '@shapeshiftoss/caip'
import { Amount as AmountComponent } from 'components/Amount/Amount'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AmountArgs = {
  value: string
} & (
  | {
      assetId: AssetId
      precision?: never
      symbol?: never
    }
  | {
      assetId?: never
      precision: number
      symbol: string
    }
)

export const Amount = ({ value, symbol, precision, assetId }: AmountArgs) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  return (
    <AmountComponent.Crypto
      lineHeight={1}
      value={fromBaseUnit(value ?? '0', asset?.precision ?? precision ?? 0)}
      symbol={asset?.symbol ?? symbol ?? ''}
      maximumFractionDigits={6}
    />
  )
}
