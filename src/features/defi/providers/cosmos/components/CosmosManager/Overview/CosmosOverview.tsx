import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useEffect, useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { WithdrawCard } from './WithdrawCard'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { DefiModalContent } from '@/features/defi/components/DefiModal/DefiModalContent'
import { Overview } from '@/features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { useGetAssetDescriptionQuery } from '@/state/slices/assetsSlice/assetsSlice'
import {
  getDefaultValidatorAddressFromChainId,
  makeTotalCosmosSdkBondingsCryptoBaseUnit,
} from '@/state/slices/opportunitiesSlice/resolvers/cosmosSdk/utils'
import { DefiProvider, DefiType } from '@/state/slices/opportunitiesSlice/types'
import {
  makeDefiProviderDisplayName,
  makeOpportunityIcons,
  serializeUserStakingId,
  toValidatorId,
} from '@/state/slices/opportunitiesSlice/utils'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectAssets,
  selectHasClaimByUserStakingId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectStakingOpportunityByFilter,
  selectUserStakingOpportunityByUserStakingId,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type CosmosOverviewProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const CosmosOverview: React.FC<CosmosOverviewProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const translate = useTranslate()
  const { query, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const {
    accountId: routeAccountId,
    assetNamespace,
    chainId,
    contractAddress: validatorAddress,
    assetReference,
  } = query
  const stakingAssetId = toAssetId({ chainId, assetNamespace, assetReference })
  const validatorId = toValidatorId({ chainId, account: validatorAddress })

  const highestBalanceAccountIdFilter = useMemo(() => ({ stakingId: validatorId }), [validatorId])
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const maybeAccountId = useMemo(
    () => accountId ?? routeAccountId ?? highestBalanceAccountId,
    [accountId, highestBalanceAccountId, routeAccountId],
  )

  useEffect(() => {
    if (!maybeAccountId) return
    handleAccountIdChange(maybeAccountId)
  }, [handleAccountIdChange, maybeAccountId])

  const opportunityDataFilter = useMemo(() => {
    if (!accountId) return {}
    const userStakingId = serializeUserStakingId(accountId, validatorId)
    return { userStakingId }
  }, [accountId, validatorId])

  const opportunityData = useAppSelector(state =>
    selectUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )
  const assets = useAppSelector(selectAssets)

  const filteredOpportunitiesMetadataFilter = useMemo(() => {
    return {
      defiProvider: DefiProvider.CosmosSdk,
      defiType: DefiType.Staking,
      assetId: stakingAssetId,
      validatorId: toValidatorId({
        chainId,
        account: getDefaultValidatorAddressFromChainId(chainId),
      }),
    }
  }, [chainId, stakingAssetId])

  const defaultOpportunityMetadata = useAppSelector(state =>
    selectStakingOpportunityByFilter(state, filteredOpportunitiesMetadataFilter),
  )

  const hasClaim = useAppSelector(state =>
    selectHasClaimByUserStakingId(state, opportunityDataFilter),
  )

  const loaded = useMemo(
    () => Boolean(opportunityData || defaultOpportunityMetadata),
    [defaultOpportunityMetadata, opportunityData],
  )

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  if (!stakingAsset) throw new Error(`Asset not found for AssetId ${stakingAssetId}`)

  const userStakingOpportunity = useAppSelector(state =>
    selectUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const totalBondings = useMemo(
    () =>
      userStakingOpportunity
        ? makeTotalCosmosSdkBondingsCryptoBaseUnit(userStakingOpportunity)
        : bn(0),
    [userStakingOpportunity],
  )

  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetId),
  )
  const cryptoAmountAvailable = totalBondings.div(bn(10).pow(stakingAsset.precision))
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(bnOrZero(marketData?.price))

  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: stakingAssetId, selectedLocale })

  const navigate = useNavigate()

  const handleStakeClick = useCallback(
    () =>
      navigate({
        pathname: location.pathname,
        search: qs.stringify({
          ...query,
          modal: DefiAction.Deposit,
        }),
      }),
    [navigate, location.pathname, query],
  )

  const underlyingAssetsCryptoPrecision = useMemo(
    () => [
      {
        ...stakingAsset,
        cryptoBalancePrecision: cryptoAmountAvailable.toFixed(stakingAsset.precision),
        allocationPercentage: '1',
      },
    ],
    [stakingAsset, cryptoAmountAvailable],
  )

  const claimDisabled = !hasClaim

  const overviewMenu = useMemo(
    () => [
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
    ],
    [claimDisabled, translate],
  )

  const overviewDescription = useMemo(
    () => ({
      description: stakingAsset.description,
      isLoaded: !descriptionQuery.isLoading,
      isTrustedDescription: stakingAsset.isTrustedDescription,
    }),
    [descriptionQuery.isLoading, stakingAsset.description, stakingAsset.isTrustedDescription],
  )

  if (!loaded) {
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )
  }

  if (!opportunityData) return null

  return (
    <Overview
      accountId={accountId}
      onAccountIdChange={handleAccountIdChange}
      positionAddress={accountId ? fromAccountId(accountId).account : undefined}
      asset={stakingAsset}
      name={opportunityData.name}
      icons={makeOpportunityIcons({ assets, opportunity: opportunityData })}
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssetsCryptoPrecision={underlyingAssetsCryptoPrecision}
      provider={makeDefiProviderDisplayName({
        provider: opportunityData.provider,
        assetName: stakingAsset.name,
      })}
      menu={overviewMenu}
      description={overviewDescription}
      tvl={bnOrZero(opportunityData?.tvl).toFixed(2)}
      apy={bnOrZero(opportunityData?.apy).toString()}
    >
      <WithdrawCard accountId={accountId} asset={stakingAsset} />
    </Overview>
  )
}
