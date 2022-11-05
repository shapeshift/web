import { Center, useToast } from '@chakra-ui/react'
import { toAssetId } from '@keepkey/caip'
import { KnownChainIds } from '@keepkey/types'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import qs from 'qs'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { DefiStepProps } from 'components/DeFi/components/Steps'
import { Steps } from 'components/DeFi/components/Steps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Confirm } from './components/Confirm'
import { Status } from './components/Status'
import { Withdraw } from './components/Withdraw'
import { IdleWithdrawActionType } from './WithdrawCommon'
import { WithdrawContext } from './WithdrawContext'
import { initialState, reducer } from './WithdrawReducer'

const moduleLogger = logger.child({
  namespace: ['Defi', 'Providers', 'Idle', 'IdleManager', 'Withdraw', 'IdleWithdraw'],
})

export const IdleWithdraw = () => {
  const { idleInvestor } = useIdle()
  const [state, dispatch] = useReducer(reducer, initialState)
  const translate = useTranslate()
  const toast = useToast()
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress: vaultAddress, assetReference } = query

  const assetNamespace = 'erc20'
  // Asset info
  const underlyingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: vaultAddress,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, underlyingAssetId))

  // user info
  const chainAdapterManager = getChainAdapterManager()
  const chainAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet)
  const { state: walletState } = useWallet()
  const loading = useSelector(selectPortfolioLoading)
  const bip44Params = chainAdapter?.getBIP44Params({ accountNumber: 0 })

  useEffect(() => {
    ;(async () => {
      try {
        if (!(walletState.wallet && vaultAddress && idleInvestor && chainAdapter && bip44Params))
          return
        const [address, opportunity] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet, bip44Params }),
          idleInvestor.findByOpportunityId(
            toAssetId({ chainId, assetNamespace, assetReference: vaultAddress }),
          ),
        ])
        if (!opportunity) {
          return toast({
            position: 'top-right',
            description: translate('common.somethingWentWrongBody'),
            title: translate('common.somethingWentWrong'),
            status: 'error',
          })
        }
        dispatch({ type: IdleWithdrawActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: IdleWithdrawActionType.SET_OPPORTUNITY, payload: opportunity })
      } catch (error) {
        // TODO: handle client side errors

        moduleLogger.error(error, 'IdleWithdraw:useEffect error')
      }
    })()
  }, [
    idleInvestor,
    chainAdapter,
    vaultAddress,
    walletState.wallet,
    translate,
    toast,
    chainId,
    bip44Params,
  ])

  const handleBack = useCallback(() => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [history, location, query])

  const StepConfig: DefiStepProps = useMemo(() => {
    return {
      [DefiStep.Info]: {
        label: translate('defi.steps.withdraw.info.title'),
        description: translate('defi.steps.withdraw.info.description', {
          asset: underlyingAsset.symbol,
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
    // We only need this to update on symbol change
  }, [translate, underlyingAsset.symbol])

  if (loading || !asset || !marketData)
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
            opportunity: `${underlyingAsset.symbol} Vault`,
          })}
          onBack={handleBack}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </WithdrawContext.Provider>
  )
}
