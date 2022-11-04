import { Center } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
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
import type { UserEarnOpportunityType } from 'context/FoxEthProvider/FoxEthProvider'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { logger } from 'lib/logger'
import { LP_EARN_OPPORTUNITIES } from 'state/slices/opportunitiesSlice/constants'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import { serializeUserStakingId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectPortfolioLoading,
  selectUserStakingOpportunityByUserStakingId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
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
  const { chainId, contractAddress } = query

  const { farmingAccountId } = useFoxEth()

  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        accountId!,
        toAssetId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }) as StakingId,
      ),
    }),
    [accountId, chainId, contractAddress],
  )
  const opportunityData = useAppSelector(state =>
    selectUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const foxFarmingOpportunity: UserEarnOpportunityType = useMemo(
    () => ({
      ...LP_EARN_OPPORTUNITIES[opportunityData?.assetId ?? ''],
      ...opportunityData,
      chainId: fromAssetId(opportunityData?.assetId ?? '').chainId,
      rewardsAmountCryptoPrecision: opportunityData?.rewardsAmountCryptoPrecision ?? '',
    }),
    [opportunityData],
  )

  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        if (!(farmingAccountId && contractAddress && opportunityData)) return

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
  }, [farmingAccountId, translate, contractAddress, opportunityData, foxFarmingOpportunity])

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
      [DefiStep.Info]: opportunityData?.expired
        ? {
            label: translate('defi.steps.withdraw.info.title'),
            description: translate('defi.steps.withdraw.info.farmingExpiredDescription'),
            component: ExpiredWithdraw,
          }
        : {
            label: translate('defi.steps.withdraw.info.title'),
            description: translate('defi.steps.withdraw.info.description', {
              asset: opportunityData?.name,
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
        component: ownProps => <Confirm {...ownProps} accountId={accountId} />,
      },
      [DefiStep.Status]: {
        label: 'Status',
        component: () => <Status accountId={accountId} />,
      },
    }
  }, [accountId, handleAccountIdChange, opportunityData?.expired, opportunityData?.name, translate])

  if (loading || !opportunityData)
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
            opportunity: opportunityData?.name,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </WithdrawContext.Provider>
  )
}
