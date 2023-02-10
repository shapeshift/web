import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import qs from 'qs'
import { useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHasClaimByUserStakingId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxyEmpty } from './FoxyEmpty'
import { WithdrawCard } from './WithdrawCard'

type FoxyOverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const FoxyOverview: React.FC<FoxyOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference } = query
  const { stakingAsset, underlyingAsset: rewardAsset, stakingAssetId } = useFoxyQuery()
  // The highest level AssetId/OpportunityId, in this case of the single FOXy contract
  const assetId = toAssetId({
    chainId,
    assetNamespace: ASSET_NAMESPACE.erc20,
    assetReference,
  })

  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: assetId as StakingId }),
    [assetId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )

  // const accountFilter = useMemo(
  // () => ({ accountId: accountId ?? highestBalanceAccountId ?? '' }),
  // [accountId, highestBalanceAccountId],
  // )
  // TODO: We should still select by accountId
  // const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  // const { data: foxyBalancesData, isLoading: isFoxyBalancesLoading } = useFoxyBalances({
  // accountNumber: bip44Params?.accountNumber ?? 0,
  // })
  const translate = useTranslate()

  // const opportunity = useMemo(
  // () => (foxyBalancesData?.opportunities || []).find(e => e.contractAssetId === assetId),
  // [foxyBalancesData?.opportunities, assetId],
  // )

  const opportunityDataFilter = useMemo(() => {
    return {
      userStakingId: serializeUserStakingId(
        accountId ?? highestBalanceAccountId ?? '',
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference,
        }),
      ),
    }
  }, [accountId, assetReference, chainId, highestBalanceAccountId])

  const foxyEarnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )

  const hasActiveStaking = bnOrZero(foxyEarnOpportunityData?.stakedAmountCryptoBaseUnit).gt(0)
  const hasClaim = useAppSelector(state =>
    opportunityDataFilter ? selectHasClaimByUserStakingId(state, opportunityDataFilter) : undefined,
  )

  const withdrawInfo = {}
  // TODO: Make me programmatic by AccountId
  // const withdrawInfo = accountId
  // ? // Look up the withdrawInfo for the current account, if we have one
  // opportunity?.withdrawInfo[accountId]
  // : // Else, get the withdrawInfo for the highest balance account
  // opportunity?.withdrawInfo[highestBalanceAccountId ?? '']
  // const rewardBalance = bnOrZero(withdrawInfo?.amount)
  // const releaseTime = withdrawInfo?.releaseTime
  // const foxyBalance = bnOrZero(opportunity?.balance)

  const marketData = useAppSelector(state => selectMarketDataById(state, stakingAssetId))
  const cryptoAmountAvailablePrecision = bnOrZero(
    foxyEarnOpportunityData?.stakedAmountCryptoBaseUnit,
  ).div(bn(10).pow(stakingAsset?.precision ?? 0))
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailablePrecision).times(marketData.price)
  const claimAvailable = dayjs().isAfter(dayjs('0')) // TODO
  const claimDisabled = !claimAvailable || !hasClaim

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: stakingAssetId, selectedLocale })

  if (!foxyEarnOpportunityData) {
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )
  }

  if (bnOrZero(foxyEarnOpportunityData?.stakedAmountCryptoBaseUnit).eq(0) && !hasClaim) {
    return (
      <FoxyEmpty
        assets={[stakingAsset, rewardAsset]}
        apy={foxyEarnOpportunityData?.apy ?? ''}
        onClick={() =>
          history.push({
            pathname: location.pathname,
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
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      asset={rewardAsset}
      name='FOX Yieldy'
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssetsCryptoPrecision={[
        {
          ...stakingAsset,
          cryptoBalancePrecision: cryptoAmountAvailablePrecision.toFixed(4),
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
          isDisabled: claimDisabled,
          toolTip: translate('defi.modals.overview.noWithdrawals'),
        },
      ]}
      description={{
        description: stakingAsset.description,
        isLoaded: !descriptionQuery.isLoading,
        isTrustedDescription: stakingAsset.isTrustedDescription,
      }}
      tvl={bnOrZero(foxyEarnOpportunityData?.tvl).toFixed(2)}
      apy={foxyEarnOpportunityData?.apy?.toString()}
    >
      {Object.keys(withdrawInfo).length && <WithdrawCard asset={stakingAsset} {...withdrawInfo} />}
    </Overview>
  )
}
