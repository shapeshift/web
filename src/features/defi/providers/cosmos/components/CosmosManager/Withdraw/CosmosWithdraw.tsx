import { Center } from '@chakra-ui/react'
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
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { DefiStepProps } from 'components/DeFi/components/Steps'
import { Steps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import type { MergedActiveStakingOpportunity } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Confirm } from './components/Confirm'
import { Status } from './components/Status'
import { Withdraw } from './components/Withdraw'
import { CosmosWithdrawActionType } from './WithdrawCommon'
import { WithdrawContext } from './WithdrawContext'
import { initialState, reducer } from './WithdrawReducer'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Cosmos', 'CosmosWithdraw'],
})

export const CosmosWithdraw = () => {
  const translate = useTranslate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query

  const assetNamespace = 'slip44' // TODO: add to query, why do we hardcode this?
  // Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference, // TODO: handle multiple denoms
  })
  const underlyingAssetId = toAssetId({
    // TODO: Underlying asset is the same as the staked asset for now, handle multiple denoms
    chainId,
    assetNamespace,
    assetReference,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  // user info
  const chainAdapterManager = getChainAdapterManager()
  const chainAdapter = chainAdapterManager.get(chainId)
  const { state: walletState } = useWallet()

  const opportunities = useCosmosSdkStakingBalances({ assetId })
  const cosmosOpportunity = useMemo(
    () =>
      opportunities?.cosmosSdkStakingOpportunities?.find(
        opportunity => opportunity.address === contractAddress,
      ) ?? {},
    [opportunities, contractAddress],
  ) as unknown as MergedActiveStakingOpportunity // TODO: remove casting

  useEffect(() => {
    ;(async () => {
      try {
        if (!(walletState.wallet && contractAddress && chainAdapter)) return
        const address = await chainAdapter.getAddress({ wallet: walletState.wallet })

        dispatch({
          type: CosmosWithdrawActionType.SET_USER_ADDRESS,
          payload: address,
        })
        dispatch({
          type: CosmosWithdrawActionType.SET_OPPORTUNITY,
          payload: { ...cosmosOpportunity },
        })
      } catch (error) {
        // TODO: handle client side errors
        moduleLogger.error(error, 'CosmosWithdraw error')
      }
    })()
  }, [cosmosOpportunity, chainAdapter, contractAddress, walletState.wallet])

  const StepConfig: DefiStepProps = useMemo(() => {
    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.withdraw.info.title'),
        description: translate('defi.steps.withdraw.info.yieldyDescription', {
          asset: underlyingAsset?.symbol ?? '',
        }),
        component: Withdraw,
      },
      [DefiStep.Confirm]: {
        label: translate('defi.steps.confirm.title'),
        component: Confirm,
      },
      [DefiStep.Status]: {
        label: translate('defi.steps.status.title'),
        component: Status,
      },
    }
  }, [translate, underlyingAsset?.symbol])

  const handleBack = () => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  if (!cosmosOpportunity?.isLoaded || !asset || !marketData || !feeMarketData)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

  return (
    <WithdrawContext.Provider value={{ state, dispatch }}>
      <DefiModalContent>
        <DefiModalHeader
          onBack={handleBack}
          title={translate('modals.withdraw.unstakeYour', {
            opportunity: `${underlyingAsset.symbol}`,
          })}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </WithdrawContext.Provider>
  )
}
