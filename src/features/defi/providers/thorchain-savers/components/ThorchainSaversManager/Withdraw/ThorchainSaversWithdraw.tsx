import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { thorchainAssetId, toAssetId } from '@shapeshiftoss/caip'
import { isUtxoChainId } from '@shapeshiftoss/utils'
import { skipToken, useQuery } from '@tanstack/react-query'
import qs from 'qs'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Confirm } from './components/Confirm'
import { Status } from './components/Status'
import { Withdraw } from './components/Withdraw'
import { ThorchainSaversWithdrawActionType } from './WithdrawCommon'
import { WithdrawContext } from './WithdrawContext'
import { initialState, reducer } from './WithdrawReducer'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import type { DefiStepProps, StepComponentProps } from '@/components/DeFi/components/Steps'
import { Steps } from '@/components/DeFi/components/Steps'
import { Sweep } from '@/components/Sweep'
import { DefiModalContent } from '@/features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from '@/features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getThorchainFromAddress } from '@/lib/utils/thorchain'
import { getThorchainSaversPosition } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type WithdrawProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const ThorchainSaversWithdraw: React.FC<WithdrawProps> = ({ accountId }) => {
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

  const isRunePool = assetId === thorchainAssetId

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

  // user info
  const {
    state: { wallet },
  } = useWallet()

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )

  const { data: fromAddress } = useQuery({
    queryKey: ['thorchainFromAddress', accountId, assetId, opportunityId],
    queryFn:
      accountId && wallet && accountMetadata
        ? () =>
            getThorchainFromAddress({
              accountId,
              assetId,
              opportunityId,
              getPosition: getThorchainSaversPosition,
              accountMetadata,
              wallet,
            })
        : skipToken,
  })

  useEffect(() => {
    if (state.opportunity) return
    if (!(wallet && opportunityData)) return
    dispatch({ type: ThorchainSaversWithdrawActionType.SET_OPPORTUNITY, payload: opportunityData })
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

  const makeHandleSweepBack = useCallback(
    (onNext: StepComponentProps['onNext']) => () => onNext(DefiStep.Info),
    [],
  )
  const makeHandleSweepSeen = useCallback(
    (onNext: StepComponentProps['onNext']) => () => onNext(DefiStep.Confirm),
    [],
  )

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
      ...(isUtxoChainId(chainId)
        ? {
            [DefiStep.Sweep]: {
              label: translate('modals.send.consolidate.consolidateFunds'),
              component: ({ onNext }) => (
                <Sweep
                  accountId={accountId}
                  fromAddress={fromAddress ?? null}
                  assetId={assetId}
                  onBack={makeHandleSweepBack(onNext)}
                  onSweepSeen={makeHandleSweepSeen(onNext)}
                />
              ),
            },
          }
        : {}),
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
  }, [
    accountId,
    asset.symbol,
    assetId,
    chainId,
    fromAddress,
    makeHandleSweepBack,
    makeHandleSweepSeen,
    translate,
  ])

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
          title={translate('modals.withdraw.withdrawFrom', {
            opportunity: isRunePool ? 'RUNEPool' : `${asset.symbol} Vault`,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </WithdrawContext.Provider>
  )
}
