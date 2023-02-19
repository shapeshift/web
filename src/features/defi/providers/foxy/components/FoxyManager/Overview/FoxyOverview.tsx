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
import { useEffect, useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  makeDefiProviderDisplayName,
  serializeUserStakingId,
  supportsUndelegations,
} from 'state/slices/opportunitiesSlice/utils'
import {
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
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

  const translate = useTranslate()

  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const maybeAccountId = accountId ?? highestBalanceAccountId ?? defaultAccountId
  useEffect(() => {
    if (!maybeAccountId) return
    handleAccountIdChange(maybeAccountId)
  }, [handleAccountIdChange, maybeAccountId])

  const opportunityDataFilter = useMemo(() => {
    return {
      userStakingId: serializeUserStakingId(
        accountId ?? highestBalanceAccountId ?? '',
        assetId as StakingId,
      ),
    }
  }, [accountId, assetId, highestBalanceAccountId])

  const foxyEarnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )

  const hasClaim = useAppSelector(state =>
    opportunityDataFilter ? selectHasClaimByUserStakingId(state, opportunityDataFilter) : undefined,
  )

  const undelegation = useMemo(
    () =>
      foxyEarnOpportunityData && supportsUndelegations(foxyEarnOpportunityData)
        ? foxyEarnOpportunityData.undelegations[0]
        : undefined,
    [foxyEarnOpportunityData],
  )

  const marketData = useAppSelector(state => selectMarketDataById(state, stakingAssetId))
  const cryptoAmountAvailablePrecision = bnOrZero(
    foxyEarnOpportunityData?.stakedAmountCryptoBaseUnit,
  ).div(bn(10).pow(stakingAsset?.precision ?? 0))
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailablePrecision).times(marketData.price)
  const claimAvailable = Boolean(
    undelegation && dayjs().isAfter(dayjs(undelegation.completionTime).unix()),
  )
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
      provider={makeDefiProviderDisplayName({
        provider: foxyEarnOpportunityData.provider,
        assetName: stakingAsset.name,
      })}
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
      <WithdrawCard asset={stakingAsset} undelegation={undelegation} />
    </Overview>
  )
}
