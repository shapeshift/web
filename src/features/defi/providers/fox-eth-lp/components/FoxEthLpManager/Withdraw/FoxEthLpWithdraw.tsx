import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { DefiStepProps } from 'components/DeFi/components/Steps'
import { Steps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { foxEthLpAssetId, LP_EARN_OPPORTUNITIES } from 'state/slices/opportunitiesSlice/constants'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectAssets,
  selectLpOpportunitiesById,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByAssetId,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import { foxEthLpOpportunityName } from '../../../constants'
import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Status } from './components/Status'
import { Withdraw } from './components/Withdraw'
import { FoxEthLpWithdrawActionType } from './WithdrawCommon'
import { WithdrawContext } from './WithdrawContext'
import { initialState, reducer } from './WithdrawReducer'

type FoxEthLpWithdrawProps = {
  accountId: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const FoxEthLpWithdraw: React.FC<FoxEthLpWithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const assets = useAppSelector(selectAssets)
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress: vaultAddress, assetReference } = query

  const assetNamespace = 'erc20'
  // Asset info
  const underlyingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: vaultAddress,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, underlyingAssetId))

  const lpOpportunitiesById = useAppSelector(selectLpOpportunitiesById)
  const opportunityData = useMemo(
    () => lpOpportunitiesById[foxEthLpAssetId as LpId],
    [lpOpportunitiesById],
  )
  const baseEarnOpportunity = LP_EARN_OPPORTUNITIES[opportunityData?.assetId]

  const aggregatedLpAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: foxEthLpAssetId }),
  )

  const [underlyingEthAmount, underlyingFoxAmount] = useMemo(
    () =>
      opportunityData?.underlyingAssetIds.map((assetId, i) =>
        bnOrZero(aggregatedLpAssetBalance)
          .times(
            fromBaseUnit(
              opportunityData?.underlyingAssetRatios[i] ?? '0',
              assets[assetId].precision,
            ),
          )
          .toFixed(6)
          .toString(),
      ) ?? ['0', '0'],
    [
      aggregatedLpAssetBalance,
      assets,
      opportunityData?.underlyingAssetIds,
      opportunityData?.underlyingAssetRatios,
    ],
  )

  // TODO: toEarnOpportunity util something something
  const foxEthLpOpportunity = useMemo(
    () => ({
      ...baseEarnOpportunity,
      // TODO; All of these should be derived in one place, this is wrong, just an intermediary step to make tsc happy
      chainId: fromAssetId(foxEthLpAssetId).chainId,
      underlyingFoxAmount,
      underlyingEthAmount,
      cryptoAmount: aggregatedLpAssetBalance,
      // TODO: this all goes away anyway
      fiatAmount: '42',
    }),
    [aggregatedLpAssetBalance, baseEarnOpportunity, underlyingEthAmount, underlyingFoxAmount],
  )

  // user info
  const { state: walletState } = useWallet()
  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    if (!walletState || !opportunityData) return
    dispatch({ type: FoxEthLpWithdrawActionType.SET_OPPORTUNITY, payload: foxEthLpOpportunity })
  }, [foxEthLpOpportunity, opportunityData, walletState])

  const handleBack = () => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  const StepConfig: DefiStepProps = useMemo(() => {
    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.withdraw.info.title'),
        description: translate('defi.steps.withdraw.info.description', {
          asset: underlyingAsset.symbol,
        }),
        component: ownProps => (
          <Withdraw {...ownProps} accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        ),
      },
      [DefiStep.Approve]: {
        label: translate('defi.steps.approve.title'),
        component: Approve,
      },
      [DefiStep.Confirm]: {
        label: translate('defi.steps.confirm.title'),
        component: ownProps => <Confirm {...ownProps} accountId={accountId} />,
      },
      [DefiStep.Status]: {
        label: 'Status',
        component: ownProps => <Status {...ownProps} accountId={accountId} />,
      },
    }
  }, [accountId, handleAccountIdChange, translate, underlyingAsset.symbol])

  if (loading || !asset || !marketData)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

  return (
    <WithdrawContext.Provider value={{ state, dispatch }}>
      <DefiModalContent>
        <DefiModalHeader
          title={translate('modals.withdraw.withdrawFrom', {
            opportunity: foxEthLpOpportunityName,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </WithdrawContext.Provider>
  )
}
