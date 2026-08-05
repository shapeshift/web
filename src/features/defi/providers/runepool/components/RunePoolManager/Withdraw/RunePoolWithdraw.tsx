import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Confirm } from './components/Confirm'
import { Status } from './components/Status'
import { Withdraw } from './components/Withdraw'
import { RunePoolWithdrawActionType } from './WithdrawCommon'
import { WithdrawContext } from './WithdrawContext'
import { initialState, reducer } from './WithdrawReducer'

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
import { useWallet } from '@/hooks/useWallet/useWallet'
import { serializeUserStakingId, toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type WithdrawProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const RunePoolWithdraw: React.FC<WithdrawProps> = ({ accountId }) => {
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
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const opportunityDataFilter = useMemo(() => {
    const _accountId = accountId ?? highestBalanceAccountId
    if (!_accountId) return

    return {
      userStakingId: serializeUserStakingId(
        _accountId,
        toOpportunityId({
          chainId,
          assetNamespace,
          assetReference,
        }),
      ),
    }
  }, [accountId, assetNamespace, assetReference, chainId, highestBalanceAccountId])

  const opportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )

  const {
    state: { wallet },
  } = useWallet()

  // RUNE is not a UTXO asset - the account address *is* the from address
  const fromAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : undefined),
    [accountId],
  )

  useEffect(() => {
    if (state.opportunity) return
    if (!(wallet && opportunityData)) return
    dispatch({ type: RunePoolWithdrawActionType.SET_OPPORTUNITY, payload: opportunityData })
  }, [opportunityData, state.opportunity, wallet])

  const handleBack = useCallback(() => {
    navigate({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [navigate, location, query])

  const StepConfig: DefiStepProps = useMemo(() => {
    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.withdraw.info.title'),
        description: translate('defi.steps.withdraw.info.description', {
          asset: asset.symbol,
        }),
        component: ownProps => (
          <Withdraw {...ownProps} accountId={accountId} fromAddress={fromAddress} />
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
    // We only need this to update on symbol change
  }, [accountId, asset.symbol, fromAddress, translate])

  const value = useMemo(() => ({ state, dispatch }), [state])

  if (!asset || !marketData)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

  return (
    <WithdrawContext.Provider value={value}>
      <DefiModalContent>
        <DefiModalHeader
          title={translate('modals.withdraw.withdrawFrom', { opportunity: 'RUNEPool' })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </WithdrawContext.Provider>
  )
}
