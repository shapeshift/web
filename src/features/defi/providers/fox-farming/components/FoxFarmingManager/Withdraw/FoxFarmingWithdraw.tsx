import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
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
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { logger } from 'lib/logger'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import { selectEarnUserStakingOpportunity, selectPortfolioLoading } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { ExpiredWithdraw } from './components/ExpiredWithdraw'
import { Status } from './components/Status'
import { Withdraw } from './components/Withdraw'
import { FoxFarmingWithdrawActionType } from './WithdrawCommon'
import { WithdrawContext } from './WithdrawContext'
import { initialState, reducer } from './WithdrawReducer'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'FoxFarming', 'FoxFarmingWithdraw'],
})

type FoxFarmingWithdrawProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}
export const FoxFarmingWithdraw: React.FC<FoxFarmingWithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress } = query

  const { farmingAccountId } = useFoxEth()

  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        accountId!,
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }),
    [accountId, chainId, contractAddress],
  )
  const foxFarmingOpportunity = useAppSelector(state =>
    selectEarnUserStakingOpportunity(state, opportunityDataFilter),
  )

  console.log({ foxFarmingOpportunity })

  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(() => {
      try {
        if (!(farmingAccountId && contractAddress && foxFarmingOpportunity)) return

        dispatch({
          type: FoxFarmingWithdrawActionType.SET_USER_ADDRESS,
          payload: fromAccountId(farmingAccountId).account,
        })
        dispatch({
          type: FoxFarmingWithdrawActionType.SET_OPPORTUNITY,
          payload: foxFarmingOpportunity,
        })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'FoxFarmingWithdraw error')
      }
    })()
  }, [farmingAccountId, translate, contractAddress, foxFarmingOpportunity])

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
      [DefiStep.Info]: foxFarmingOpportunity?.expired
        ? {
            label: translate('defi.steps.withdraw.info.title'),
            description: translate('defi.steps.withdraw.info.farmingExpiredDescription'),
            component: ExpiredWithdraw,
          }
        : {
            label: translate('defi.steps.withdraw.info.title'),
            description: translate('defi.steps.withdraw.info.description', {
              asset: foxFarmingOpportunity?.name,
            }),
            component: ownProps => (
              <Withdraw
                {...ownProps}
                accountId={accountId}
                onAccountIdChange={handleAccountIdChange}
              />
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
        component: () => <Status accountId={accountId} />,
      },
    }
  }, [
    accountId,
    foxFarmingOpportunity?.expired,
    foxFarmingOpportunity?.name,
    handleAccountIdChange,
    translate,
  ])

  if (loading || !foxFarmingOpportunity)
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
            opportunity: foxFarmingOpportunity?.name,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </WithdrawContext.Provider>
  )
}
