import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
// import dayjs from 'dayjs'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
// import qs from 'qs'
import { useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxFarmingBalances } from 'pages/Defi/hooks/useFoxFarmingBalances'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById, selectMarketDataById, selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

// import { FoxFarmingEmpty } from './FoxFarmingEmpty'
// import { WithdrawCard } from './WithdrawCard'

export const FoxFarmingOverview = () => {
  const { opportunities, loading } = useFoxFarmingBalances()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const opportunity = useMemo(
    () => opportunities.find(e => e.contractAddress === contractAddress),
    [opportunities, contractAddress],
  )
  const assetNamespace = 'erc20'
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const rewardAsset = useAppSelector(state => selectAssetById(state, opportunity?.rewardAddress!))
  const marketData = useAppSelector(state => selectMarketDataById(state, stakingAssetId))
  const cryptoAmountAvailable = bnOrZero(opportunity?.cryptoAmount).div(
    `1e${stakingAsset.precision}`,
  )
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)
  // const hasClaim = bnOrZero(opportunity?.withdrawInfo.amount).gt(0)
  // const claimDisabled = !claimAvailable || !hasClaim

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: stakingAssetId, selectedLocale })

  if (loading || !opportunity || !opportunity.apy) {
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )
  }

  // if (FoxFarmingBalance.eq(0) && rewardBalance.eq(0)) {
  //   return (
  //     <FoxFarmingEmpty
  //       assets={[stakingAsset, rewardAsset]}
  //       apy={apy ?? ''}
  //       onClick={() =>
  //         history.push({
  //           pathname: location.pathname,
  //           search: qs.stringify({
  //             ...query,
  //             modal: DefiAction.Deposit,
  //           }),
  //         })
  //       }
  //     />
  //   )
  // }

  return (
    <Overview
      asset={rewardAsset}
      name={opportunity.opportunityName ?? ''}
      icons={opportunity.icons}
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssets={[
        {
          ...stakingAsset,
          cryptoBalance: cryptoAmountAvailable.toFixed(4),
          allocationPercentage: '1',
          icons: opportunity.icons,
        },
      ]}
      provider='ShapeShift'
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
        {
          label: 'common.claim',
          icon: <FaGift />,
          action: DefiAction.Claim,
          variant: 'ghost-filled',
          colorScheme: 'green',
          // isDisabled: claimDisabled,
          toolTip: translate('defi.modals.overview.noWithdrawals'),
        },
      ]}
      description={{
        description: stakingAsset.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: stakingAsset.isTrustedDescription,
      }}
      tvl={opportunity.tvl}
      apy={opportunity.apy?.toString()}
    >
      {/* <WithdrawCard asset={stakingAsset} {...opportunity.withdrawInfo} /> */}
    </Overview>
  )
}
