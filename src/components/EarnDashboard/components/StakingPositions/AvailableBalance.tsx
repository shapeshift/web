import { Stat, StatHelpText, StatLabel, StatNumber } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { selectPortfolioCryptoBalanceByFilter } from 'state/slices/common-selectors'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AvailableBalanceProps = {
  assetId: AssetId
}

export const AvailableBalance: React.FC<AvailableBalanceProps> = ({ assetId }) => {
  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const balanceFilter = useMemo(() => ({ assetId }), [assetId])
  // user info
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, balanceFilter),
  )
  const cryptoAmountAvailable = useMemo(
    () => bnOrZero(balance).div(`1e${asset.precision}`),
    [balance, asset?.precision],
  )
  const fiatAmountAvailable = useMemo(
    () => bnOrZero(cryptoAmountAvailable).times(marketData.price),
    [cryptoAmountAvailable, marketData?.price],
  )
  return (
    <Stat>
      <StatLabel>Available Balance</StatLabel>
      <StatNumber fontSize='2xl'>
        <Amount.Crypto value={cryptoAmountAvailable.toString()} symbol={asset.symbol} />
      </StatNumber>
      <StatHelpText>
        <Amount.Fiat value={fiatAmountAvailable.toString()} />
      </StatHelpText>
    </Stat>
  )
}
