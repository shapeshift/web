import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip/dist/accountId/accountId'
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
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  selectAssetById,
  selectEarnUserLpOpportunity,
  selectMarketDataById,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { FoxEthLpDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

type FoxEthLpDepositProps = {
  onAccountIdChange: AccountDropdownProps['onChange']
  accountId: AccountId | undefined
}

export const FoxEthLpDeposit: React.FC<FoxEthLpDepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const foxEthLpOpportunityFilter = useMemo(
    () => ({
      lpId: foxEthLpAssetId,
      assetId: foxEthLpAssetId,
      accountId,
    }),
    [accountId],
  )
  const foxEthLpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, foxEthLpOpportunityFilter),
  )

  const underlyingAsset = useAppSelector(
    state =>
      foxEthLpOpportunity?.underlyingAssetId &&
      selectAssetById(state, foxEthLpOpportunity?.underlyingAssetId),
  )
  const marketData = useAppSelector(
    state =>
      foxEthLpOpportunity?.underlyingAssetId &&
      selectMarketDataById(state, foxEthLpOpportunity?.underlyingAssetId),
  )

  const loading = useSelector(selectPortfolioLoading)

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
    if (!underlyingAsset) return

    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.deposit.info.title'),
        description: translate('defi.steps.deposit.info.description', {
          asset: underlyingAsset.symbol,
        }),
        component: ownProps => (
          <Deposit {...ownProps} accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        ),
      },
      [DefiStep.Approve]: {
        label: translate('defi.steps.approve.title'),
        component: ownProps => <Approve {...ownProps} accountId={accountId} />,
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
  }, [accountId, underlyingAsset, handleAccountIdChange, translate])

  useEffect(() => {
    if (!foxEthLpOpportunity) return

    dispatch({ type: FoxEthLpDepositActionType.SET_OPPORTUNITY, payload: foxEthLpOpportunity })
  }, [foxEthLpOpportunity])

  if (loading || !underlyingAsset || !marketData || !foxEthLpOpportunity || !StepConfig) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <DepositContext.Provider value={{ state, dispatch }}>
      <DefiModalContent>
        <DefiModalHeader
          title={translate('modals.deposit.depositInto', {
            opportunity: foxEthLpOpportunity.opportunityName!,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
