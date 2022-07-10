import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import dayjs from 'dayjs'
import { Overview } from 'features/defi/components/Overview/Overview'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { FaGift } from 'react-icons/fa'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyEmpty } from './FoxyEmpty'
import { WithdrawCard } from './WithdrawCard'

export const FoxyOverview = () => {
  const { opportunities, loading } = useFoxyBalances()
  const { query, history } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference, rewardId } = query
  const opportunity = opportunities.find(e => e.contractAddress === contractAddress)
  const rewardBalance = bnOrZero(opportunity?.withdrawInfo.amount)
  const foxyBalance = bnOrZero(opportunity?.balance)
  const assetNamespace = 'erc20'
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const rewardAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: rewardId,
  })
  const rewardAsset = useAppSelector(state => selectAssetById(state, rewardAssetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, stakingAssetId))
  const cryptoAmountAvailable = bnOrZero(foxyBalance).div(`1e${stakingAsset.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)
  const claimAvailable = dayjs().isAfter(dayjs(opportunity?.withdrawInfo.releaseTime))

  const descriptionQuery = useGetAssetDescriptionQuery(stakingAssetId)

  const apy = opportunity?.apy
  if (loading || !opportunity) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress isIndeterminate />
      </Center>
    )
  }

  if (foxyBalance.eq(0) && rewardBalance.eq(0)) {
    return (
      <FoxyEmpty
        assets={[stakingAsset, rewardAsset]}
        apy={apy ?? ''}
        onClick={() =>
          history.push({
            pathname: `/defi/earn`,
            search: qs.stringify({
              ...query,
              modal: DefiAction.Deposit,
            }),
          })
        }
      />
    )
  }

  return (
    <Overview
      asset={rewardAsset}
      name='FOX Yieldy'
      balance={fiatAmountAvailable.toFixed(2)}
      underlyingAssets={[
        {
          ...stakingAsset,
          balance: cryptoAmountAvailable.toPrecision(),
          allocationPercentage: '1',
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
          isDisabled: !claimAvailable,
        },
      ]}
      description={{
        description: stakingAsset.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: stakingAsset.isTrustedDescription,
      }}
      tvl={opportunity.tvl?.toFixed(2)}
      apy={opportunity.apy?.toString()}
    >
      <WithdrawCard asset={stakingAsset} {...opportunity.withdrawInfo} />
    </Overview>
  )
}
