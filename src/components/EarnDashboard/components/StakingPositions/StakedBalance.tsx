import { Stat, StatHelpText, StatLabel, StatNumber } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakedBalanceProps = {
  cryptoBalancePrecision: number
  assetId: AssetId
}
export const StakedBalance: React.FC<StakedBalanceProps> = ({
  cryptoBalancePrecision,
  assetId,
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(cryptoBalancePrecision).times(marketData.price),
    [cryptoBalancePrecision, marketData?.price],
  )

  return (
    <Stat>
      <StatLabel>Staked Amount</StatLabel>
      <StatNumber fontSize='2xl'>
        <Amount.Crypto value={cryptoBalancePrecision.toString()} symbol={asset.symbol} />
      </StatNumber>
      <StatHelpText>
        <Amount.Fiat value={fiatAmountAvailable.toString()} />
      </StatHelpText>
    </Stat>
  )
}
