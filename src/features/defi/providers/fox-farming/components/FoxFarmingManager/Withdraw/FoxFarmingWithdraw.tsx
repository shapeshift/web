import { Center } from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip/dist/accountId/accountId'
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
import { selectPortfolioLoading } from 'state/slices/selectors'
import type { Nullable } from 'types/common'

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
  accountId: Nullable<AccountId>
  onAccountIdChange: AccountDropdownProps['onChange']
}
export const FoxFarmingWithdraw: React.FC<FoxFarmingWithdrawProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { contractAddress } = query

  const { accountAddress, foxFarmingOpportunities, farmingLoading: foxFarmingLoading } = useFoxEth()
  const opportunity = useMemo(
    () => foxFarmingOpportunities.find(e => e.contractAddress === contractAddress),
    [contractAddress, foxFarmingOpportunities],
  )

  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        if (!(accountAddress && contractAddress && opportunity)) return

        dispatch({ type: FoxFarmingWithdrawActionType.SET_USER_ADDRESS, payload: accountAddress })
        dispatch({ type: FoxFarmingWithdrawActionType.SET_OPPORTUNITY, payload: opportunity })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'FoxFarmingWithdraw error')
      }
    })()
  }, [accountAddress, translate, contractAddress, opportunity])

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
      [DefiStep.Info]: opportunity?.expired
        ? {
            label: translate('defi.steps.withdraw.info.title'),
            description: translate('defi.steps.withdraw.info.farmingExpiredDescription'),
            component: ExpiredWithdraw,
          }
        : {
            label: translate('defi.steps.withdraw.info.title'),
            description: translate('defi.steps.withdraw.info.description', {
              asset: opportunity?.opportunityName,
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
        component: Approve,
      },
      [DefiStep.Confirm]: {
        label: translate('defi.steps.confirm.title'),
        component: Confirm,
      },
      [DefiStep.Status]: {
        label: 'Status',
        component: () => <Status accountId={accountId} />,
      },
    }
  }, [
    accountId,
    handleAccountIdChange,
    opportunity?.expired,
    opportunity?.opportunityName,
    translate,
  ])

  if (loading || !opportunity || foxFarmingLoading)
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
            opportunity: opportunity?.opportunityName,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </WithdrawContext.Provider>
  )
}
