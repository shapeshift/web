import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { RunePoolDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import type { DefiStepProps } from '@/components/DeFi/components/Steps'
import { Steps } from '@/components/DeFi/components/Steps'
import { DefiModalContent } from '@/features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from '@/features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import type { StakingId } from '@/state/slices/opportunitiesSlice/types'
import { serializeUserStakingId, toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectIsPortfolioLoading,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type RunePoolDepositProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const RunePoolDeposit: React.FC<RunePoolDepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const { query, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const navigate = useNavigate()

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const loading = useSelector(selectIsPortfolioLoading)

  const opportunityId: StakingId | undefined = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestStakingBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        accountId ?? highestStakingBalanceAccountId ?? '',
        opportunityId ?? '',
      ),
    }),
    [accountId, highestStakingBalanceAccountId, opportunityId],
  )
  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  useEffect(() => {
    if (!opportunityData) return
    dispatch({ type: RunePoolDepositActionType.SET_OPPORTUNITY, payload: opportunityData })
  }, [opportunityData])

  const handleBack = useCallback(() => {
    navigate({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [navigate, location, query])

  // RUNE is not a UTXO asset - the account address *is* the from address
  const fromAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : undefined),
    [accountId],
  )

  const StepConfig: DefiStepProps = useMemo(() => {
    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.deposit.info.title'),
        description: translate('defi.steps.deposit.info.description', {
          asset: asset?.symbol ?? '',
        }),
        component: ownProps => (
          <Deposit
            {...ownProps}
            accountId={accountId}
            fromAddress={fromAddress}
            onAccountIdChange={handleAccountIdChange}
          />
        ),
      },
      [DefiStep.Confirm]: {
        label: translate('defi.steps.confirm.title'),
        component: ownProps => <Confirm {...ownProps} accountId={accountId} />,
      },
      [DefiStep.Status]: {
        label: translate('defi.steps.status.title'),
        component: ownProps => <Status {...ownProps} accountId={accountId} />,
      },
    }
  }, [translate, asset?.symbol, accountId, fromAddress, handleAccountIdChange])

  const value = useMemo(() => ({ state, dispatch }), [state])

  if (loading || !asset || !marketData?.price) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <DepositContext.Provider value={value}>
      <DefiModalContent>
        <DefiModalHeader
          title={translate('modals.deposit.depositInto', { opportunity: 'RUNEPool' })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
