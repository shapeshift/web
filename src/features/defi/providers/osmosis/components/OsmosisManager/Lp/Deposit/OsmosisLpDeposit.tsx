import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
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
import type { Asset } from 'lib/asset-service'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import { toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectEarnUserLpOpportunity,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { OsmosisDepositActionType } from './LpDepositCommon'
import { DepositContext } from './LpDepositContext'
import { initialState, reducer } from './LpDepositReducer'

type OsmosisDepositProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const OsmosisLpDeposit: React.FC<OsmosisDepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

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

  const osmosisLpOpportunityFilter = useMemo(
    () => ({
      lpId: opportunityId,
      assetId,
      accountId,
    }),
    [accountId, assetId, opportunityId],
  )

  const osmosisOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, osmosisLpOpportunityFilter),
  )

  const underlyingAsset0: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[0] ?? ''),
  )
  const underlyingAsset1: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[1] ?? ''),
  )

  useEffect(() => {
    ;(() => {
      dispatch({
        type: OsmosisDepositActionType.SET_ACCOUNT_ID,
        payload: accountId ?? '',
      })

      if (!osmosisOpportunity) return
      dispatch({ type: OsmosisDepositActionType.SET_OPPORTUNITY, payload: osmosisOpportunity })
    })()
  }, [accountId, osmosisOpportunity])

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
        component: ownProps => <Status {...ownProps} accountId={accountId} />,
      },
    }
  }, [underlyingAsset0, underlyingAsset1, translate, accountId, handleAccountIdChange])

  const value = useMemo(() => ({ state, dispatch }), [state])

  if (
    loading ||
    !asset ||
    !underlyingAsset0 ||
    !underlyingAsset1 ||
    !osmosisOpportunity ||
    !StepConfig
  ) {
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
            opportunity: `${underlyingAsset0.symbol}/${underlyingAsset1.symbol} Pool`,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
