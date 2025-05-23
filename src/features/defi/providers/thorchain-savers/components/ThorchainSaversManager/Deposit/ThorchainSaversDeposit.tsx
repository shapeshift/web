import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { thorchainAssetId, toAssetId, usdtAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { skipToken, useQuery } from '@tanstack/react-query'
import qs from 'qs'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { ThorchainSaversDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

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
import { isUtxoChainId } from '@/lib/utils/utxo'
import { getThorchainSaversPosition } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import type { StakingId } from '@/state/slices/opportunitiesSlice/types'
import { serializeUserStakingId, toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectIsPortfolioLoading,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ThorchainSaversDepositProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const ThorchainSaversDeposit: React.FC<ThorchainSaversDepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const {
    state: { wallet },
  } = useWallet()
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

  const isRunePool = assetId === thorchainAssetId

  // user info
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
    ;(() => {
      if (!opportunityData) return
      dispatch({ type: ThorchainSaversDepositActionType.SET_OPPORTUNITY, payload: opportunityData })
    })()
  }, [opportunityData])

  const underlyingAssetId = useMemo(
    () => opportunityData?.underlyingAssetId ?? '',
    [opportunityData?.underlyingAssetId],
  )
  const underlyingAsset: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, underlyingAssetId),
  )

  const handleBack = useCallback(() => {
    navigate({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [navigate, location, query])

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )

  const { data: fromAddress } = useQuery({
    queryKey: ['thorchainFromAddress', accountId, assetId],
    queryFn:
      accountId && wallet && accountMetadata
        ? () =>
            getThorchainFromAddress({
              accountId,
              assetId,
              getPosition: getThorchainSaversPosition,
              accountMetadata,
              wallet,
            })
        : skipToken,
  })

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
        label: translate('defi.steps.deposit.info.title'),
        description: translate('defi.steps.deposit.info.description', {
          asset: underlyingAsset?.symbol ?? '',
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
      ...(assetId === usdtAssetId
        ? {
            [DefiStep.AllowanceReset]: {
              label: translate('trade.resetAllowance'),
              component: ownProps => <Approve {...ownProps} accountId={accountId} isReset />,
              props: {},
            },
          }
        : {}),
      [DefiStep.Approve]: {
        label: translate('defi.steps.approve.title'),
        component: ownProps => <Approve {...ownProps} accountId={accountId} />,
        props: {},
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
  }, [
    translate,
    underlyingAsset?.symbol,
    chainId,
    assetId,
    accountId,
    fromAddress,
    handleAccountIdChange,
    makeHandleSweepBack,
    makeHandleSweepSeen,
  ])

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
          title={translate('modals.deposit.depositInto', {
            opportunity: isRunePool ? 'RUNEPool' : `${asset.symbol} Vault`,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
