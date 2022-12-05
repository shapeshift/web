import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
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
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectFirstAccountIdByChainId,
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
  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const { data: foxyBalancesData, isLoading: isFoxyBalancesLoading } = useFoxyBalances({
    accountNumber: bip44Params?.accountNumber ?? 0,
  })
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference, rewardId } = query
  const opportunity = useMemo(
    () => (foxyBalancesData?.opportunities || []).find(e => e.contractAddress === contractAddress),
    [foxyBalancesData?.opportunities, contractAddress],
  )

  const firstAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, ethChainId))

  const withdrawInfo = accountId
    ? // Look up the withdrawInfo for the current account, if we have one
      opportunity?.withdrawInfo[accountId]
    : // Else, get the withdrawInfo for the first account
      opportunity?.withdrawInfo[firstAccountId ?? '']
  const rewardBalance = bnOrZero(withdrawInfo?.amount)
  const releaseTime = withdrawInfo?.releaseTime
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
  const cryptoAmountAvailablePrecision = bnOrZero(foxyBalance).div(
    bn(10).pow(stakingAsset?.precision ?? 0),
  )
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailablePrecision).times(marketData.price)
  const claimAvailable = dayjs().isAfter(dayjs(releaseTime))
  const hasClaim = rewardBalance.gt(0)
  const claimDisabled = !claimAvailable || !hasClaim

  const selectedLocale = useAppSelector(selectSelectedLocale)
  const descriptionQuery = useGetAssetDescriptionQuery({ assetId: stakingAssetId, selectedLocale })

  const apy = opportunity?.apy
  if (isFoxyBalancesLoading || !opportunity || !withdrawInfo) {
    return (
      <DefiModalContent>
        <Center minW='350px' minH='350px'>
          <CircularProgress isIndeterminate />
        </Center>
      </DefiModalContent>
    )
  }

  if (foxyBalance.eq(0) && rewardBalance.eq(0)) {
    return (
      <FoxyEmpty
        assets={[stakingAsset, rewardAsset]}
        apy={apy ?? ''}
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
      tvl={bnOrZero(opportunity?.tvl).toFixed(2)}
      apy={opportunity.apy?.toString()}
    >
      <WithdrawCard asset={stakingAsset} {...withdrawInfo} />
    </Overview>
  )
}
