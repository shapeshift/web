import { Center, useToast } from '@chakra-ui/react'
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
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { DefiStepProps } from 'components/DeFi/components/Steps'
import { Steps } from 'components/DeFi/components/Steps'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioLoading,
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

export const FoxFarmingDeposit = () => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const toast = useToast()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const { accountAddress, foxFarmingOpportunities, farmingLoading: foxFarmingLoading } = useFoxEth()
  const opportunity = foxFarmingOpportunities.find(e => e.contractAddress === contractAddress)

  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        if (!(accountAddress && contractAddress && opportunity)) return

        dispatch({ type: FoxFarmingDepositActionType.SET_USER_ADDRESS, payload: accountAddress })
        dispatch({ type: FoxFarmingDepositActionType.SET_OPPORTUNITY, payload: opportunity })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'FoxFarmingDeposit error')
      }
    })()
  }, [accountAddress, translate, toast, contractAddress, opportunity])

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
        component: Deposit,
      },
      [DefiStep.Approve]: {
        label: translate('defi.steps.approve.title'),
        component: Approve,
        props: {
          contractAddress,
        },
      },
      [DefiStep.Confirm]: {
        label: translate('defi.steps.confirm.title'),
        component: Confirm,
      },
      [DefiStep.Status]: {
        label: 'Status',
        component: Status,
      },
    }
  }, [translate, asset.symbol, contractAddress])

  if (loading || foxFarmingLoading || !asset || !marketData || !opportunity) {
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
            opportunity: opportunity.opportunityName,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </DepositContext.Provider>
  )
}
