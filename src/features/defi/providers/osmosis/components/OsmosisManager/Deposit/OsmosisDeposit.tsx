import { Center } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { DefiStepProps } from 'components/DeFi/components/Steps'
import { Steps } from 'components/DeFi/components/Steps'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import type { OsmosisPool } from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import {
  getPool,
  getPoolIdFromAssetReference,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import { toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserLpOpportunity,
  selectHighestBalanceAccountIdByStakingId,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { OsmosisDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

type OsmosisDepositProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const OsmosisDeposit: React.FC<OsmosisDepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const loading = useSelector(selectPortfolioLoading)

  const opportunityId: LpId | undefined = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
  )

  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )

  const OsmosisLpOpportunityFilter = useMemo(
    () => ({
      lpId: opportunityId ?? '',
      assetId,
      accountId: highestBalanceAccountId ?? '',
    }),
    [assetId, highestBalanceAccountId, opportunityId],
  )
  const opportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, OsmosisLpOpportunityFilter),
  )

  const underlyingAsset0Id = useMemo(
    () => opportunity?.underlyingAssetIds[0] ?? '',
    [opportunity?.underlyingAssetIds],
  )
  const underlyingAsset1Id = useMemo(
    () => opportunity?.underlyingAssetIds[1] ?? '',
    [opportunity?.underlyingAssetIds],
  )

  const underlyingAsset0: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, underlyingAsset0Id),
  )
  const underlyingAsset1: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, underlyingAsset1Id),
  )

  const getPoolData = useCallback(async (): Promise<OsmosisPool | undefined> => {
    if (!opportunity) return undefined
    const opportunityAssetId = opportunity.assetId
    if (!opportunityAssetId) return
    const { assetReference: poolAssetReference } = fromAssetId(opportunityAssetId)
    if (!poolAssetReference) return
    const id = getPoolIdFromAssetReference(poolAssetReference)
    if (!id) return
    return await getPool(id)
  }, [opportunity])

  useEffect(() => {
    ;(() => {
      dispatch({
        type: OsmosisDepositActionType.SET_USER_ADDRESS,
        payload: userAddress ?? '',
      })

      if (!opportunity) return
      dispatch({ type: OsmosisDepositActionType.SET_OPPORTUNITY, payload: opportunity })

      getPoolData().then(data => {
        if (!data) return
        dispatch({ type: OsmosisDepositActionType.SET_POOL_DATA, payload: data })
      })
    })()
  }, [getPoolData, opportunity, userAddress])

  const handleBack = () => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  const StepConfig: DefiStepProps | undefined = useMemo(() => {
    if (!underlyingAsset0 || !underlyingAsset1) return

    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.deposit.info.title'),
        description: translate('defi.steps.deposit.info.description', {
          asset: `${underlyingAsset0.symbol} and ${underlyingAsset1.symbol}`,
        }),
        component: ownProps => (
          <Deposit {...ownProps} accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        ),
      },
      [DefiStep.Confirm]: {
        label: translate('defi.steps.confirm.title'),
        component: ownProps => <Confirm {...ownProps} accountId={accountId} />,
      },
      [DefiStep.Status]: {
        label: translate('defi.steps.status.title'),
        component: Status,
      },
    }
  }, [underlyingAsset0, underlyingAsset1, translate, accountId, handleAccountIdChange])

  const value = useMemo(() => ({ state, dispatch }), [state])

  if (loading || !asset || !opportunity || !StepConfig) {
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
            opportunity: opportunity.opportunityName!,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
