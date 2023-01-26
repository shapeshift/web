import { Stat, StatHelpText, StatLabel, StatNumber } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakedBalanceProps = {
  cryptoAmountBaseUnit: number
  assetId: AssetId
}
export const StakedBalance: React.FC<StakedBalanceProps> = ({ cryptoAmountBaseUnit, assetId }) => {
  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId))

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const amountAvailableCryptoPrecision = useMemo(
    () => bnOrZero(cryptoAmountBaseUnit).div(bn(10).pow(asset.precision)).toFixed(),
    [asset.precision, cryptoAmountBaseUnit],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(amountAvailableCryptoPrecision).times(marketData.price),
    [amountAvailableCryptoPrecision, marketData?.price],
  )

  return (
    <Stat>
      <StatLabel>Staked Amount</StatLabel>
      <StatNumber fontSize='2xl'>
        <Amount.Crypto value={amountAvailableCryptoPrecision} symbol={asset.symbol} />
      </StatNumber>
      <StatHelpText>
        <Amount.Fiat value={fiatAmountAvailable.toString()} />
      </StatHelpText>
    </Stat>
  )
}
