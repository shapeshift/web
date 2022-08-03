import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { ethAssetId } from '@shapeshiftoss/caip'
import { Overview } from 'features/defi/components/Overview/Overview'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxEthLpBalance } from 'pages/Defi/hooks/useFoxEthLpBalance'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioCryptoBalanceByAssetId,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { foxAssetId } from '../../../const'

export const FoxEthLpOverview = () => {
  const { opportunity } = useFoxEthLpBalance()

  const lpAsset = useAppSelector(state => selectAssetById(state, opportunity.assetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, lpAsset.assetId))
  // user info
  const balance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByAssetId(state, { assetId: lpAsset.assetId }),
  )

  const cryptoAmountAvailable = bnOrZero(balance).div(`1e${lpAsset.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: lpAsset.assetId, selectedLocale })

  return (
    <Overview
      asset={lpAsset}
      name='FOX-ETH LP tokens'
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssets={[
        { ...foxAsset, cryptoBalance: '0', allocationPercentage: '0.50' },
        { ...ethAsset, cryptoBalance: '0', allocationPercentage: '0.50' },
      ]}
      provider='UNI V2'
      description={{
        description: lpAsset.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: lpAsset.isTrustedDescription,
      }}
      tvl={opportunity.tvl}
      apy={opportunity.apy?.toString()}
      menu={[
        {
          label: 'common.deposit',
          icon: <ArrowUpIcon />,
          action: DefiAction.Deposit,
        },
        {
          label: 'common.withdraw',
          icon: <ArrowDownIcon />,
          action: DefiAction.Withdraw,
        },
      ]}
    />
  )
}
