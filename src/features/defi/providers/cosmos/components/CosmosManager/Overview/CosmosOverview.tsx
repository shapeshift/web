import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { toAssetId } from '@keepkey/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { Overview } from 'features/defi/components/Overview/Overview'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectAssetById,
  selectFirstAccountIdByChainId,
  selectMarketDataById,
  selectSelectedLocale,
  selectTotalBondingsBalanceByAssetId,
  selectValidatorByAddress,
} from 'state/slices/selectors'
import { getDefaultValidatorAddressFromAssetId } from 'state/slices/validatorDataSlice/utils'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { CosmosEmpty } from './CosmosEmpty'
import { WithdrawCard } from './WithdrawCard'

type CosmosOverviewProps = {
  accountId: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const CosmosOverview: React.FC<CosmosOverviewProps> = ({
  accountId: defaultAccountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { defaultAccountId: queryAccountId, chainId, contractAddress, assetReference } = query

  const accountId = useMemo(
    () => defaultAccountId ?? queryAccountId,
    [defaultAccountId, queryAccountId],
  )

  const assetNamespace = 'slip44'
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const opportunities = useCosmosSdkStakingBalances({
    accountId,
    assetId: stakingAssetId,
  })

  const opportunity = useMemo(
    () =>
      opportunities?.cosmosSdkStakingOpportunities?.find(
        opportunity => opportunity.address === contractAddress,
      ),
    [opportunities, contractAddress],
  )

  const loaded = useMemo(() => opportunity?.isLoaded, [opportunity?.isLoaded])

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  // TODO: Remove - currently, we need this to fire the first onChange() in `<AccountDropdown />`
  const firstAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId),
  )

  const filter = useMemo(
    () => ({
      accountId: accountId ?? firstAccountId,
      validatorAddress: contractAddress,
      assetId: stakingAsset.assetId,
    }),
    [accountId, contractAddress, firstAccountId, stakingAsset.assetId],
  )
  const totalBondings = useAppSelector(s => selectTotalBondingsBalanceByAssetId(s, filter))

  const marketData = useAppSelector(state => selectMarketDataById(state, stakingAssetId))
  const cryptoAmountAvailable = bnOrZero(totalBondings).div(`1e${stakingAsset.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: stakingAssetId, selectedLocale })

  const defaultValidatorAddress = useMemo(
    () => getDefaultValidatorAddressFromAssetId(stakingAssetId),
    [stakingAssetId],
  )
  const validatorData = useAppSelector(state =>
    selectValidatorByAddress(state, defaultValidatorAddress),
  )

  const apr = useMemo(() => bnOrZero(validatorData?.apr).toString(), [validatorData])

  if (!opportunity) return null

  const hasClaim = bnOrZero(opportunity?.rewards).gt(0)
  const claimDisabled = !hasClaim

  if (!loaded || !opportunity) {
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )
  }

  if (bnOrZero(totalBondings).eq(0)) {
    return (
      <CosmosEmpty
        assets={[stakingAsset]}
        apy={apr ?? ''}
        onStakeClick={() =>
          history.push({
            pathname: location.pathname,
            search: qs.stringify({
              ...query,
              modal: DefiAction.Deposit,
            }),
          })
        }
        onLearnMoreClick={() =>
          history.push({
            pathname: location.pathname,
            search: qs.stringify({
              ...query,
              modal: DefiAction.GetStarted,
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
      asset={stakingAsset}
      name={opportunity.moniker}
      opportunityFiatBalance={fiatAmountAvailable.toFixed(2)}
      underlyingAssets={[
        {
          ...stakingAsset,
          cryptoBalance: cryptoAmountAvailable.toFixed(stakingAsset.precision),
          allocationPercentage: '1',
        },
      ]}
      provider={`${stakingAsset.name} Staking`}
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
      tvl={bnOrZero(opportunity.tvl).toFixed(2)}
      apy={apr?.toString()}
    >
      <WithdrawCard accountId={accountId} asset={stakingAsset} />
    </Overview>
  )
}
