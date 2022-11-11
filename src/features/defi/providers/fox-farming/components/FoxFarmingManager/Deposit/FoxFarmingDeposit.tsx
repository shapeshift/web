import { Center, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, toAccountId, toAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
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
import { LP_EARN_OPPORTUNITIES } from 'state/slices/opportunitiesSlice/constants'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioLoading,
  selectStakingOpportunitiesById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { FoxFarmingDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'FoxFarming', 'FoxFarmingDeposit'],
})

type FoxFarmingDepositProps = {
  onAccountIdChange: AccountDropdownProps['onChange']
  accountId: AccountId | undefined
}
export const FoxFarmingDeposit: React.FC<FoxFarmingDepositProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const toast = useToast()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const { farmingAccountId } = useFoxEth()

  const stakingOpportunitiesById = useAppSelector(selectStakingOpportunitiesById)

  // TODO: Use purpose-built earn selector
  const opportunity = useMemo(
    () =>
      stakingOpportunitiesById[
        toAccountId({ account: contractAddress, chainId: ethChainId }) as StakingId
      ],
    [contractAddress, stakingOpportunitiesById],
  )

  const foxFarmingOpportunity: EarnOpportunityType | undefined = useMemo(
    () =>
      opportunity && {
        ...LP_EARN_OPPORTUNITIES[opportunity.assetId],
        ...opportunity,
        chainId: fromAssetId(opportunity.assetId).chainId,
      },
    [opportunity],
  )

  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        if (!(farmingAccountId && contractAddress && foxFarmingOpportunity)) return

        dispatch({
          type: FoxFarmingDepositActionType.SET_USER_ADDRESS,
          payload: fromAccountId(farmingAccountId).account,
        })
        dispatch({
          type: FoxFarmingDepositActionType.SET_OPPORTUNITY,
          payload: foxFarmingOpportunity,
        })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'FoxFarmingDeposit error')
      }
    })()
  }, [farmingAccountId, translate, toast, contractAddress, opportunity, foxFarmingOpportunity])

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
      [DefiStep.Info]: {
        label: translate('defi.steps.deposit.info.title'),
        description: translate('defi.steps.deposit.info.description', { asset: asset.symbol }),
        component: ownProps => (
          <Deposit {...ownProps} accountId={accountId} onAccountIdChange={handleAccountIdChange} />
        ),
      },
      [DefiStep.Approve]: {
        label: translate('defi.steps.approve.title'),
        component: ownProps => <Approve {...ownProps} accountId={accountId} />,
        props: {
          contractAddress,
        },
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
  }, [accountId, handleAccountIdChange, translate, asset.symbol, contractAddress])

  if (loading || !asset || !marketData || !opportunity) {
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
            opportunity: opportunity.name,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
