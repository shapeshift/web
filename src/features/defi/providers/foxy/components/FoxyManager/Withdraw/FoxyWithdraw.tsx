import { Center } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
  DefiSteps,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import qs from 'qs'
import { useEffect, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { DefiStepProps, Steps } from 'components/DeFi/components/Steps'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectMarketDataById,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Status } from './components/Status'
import { Withdraw } from './components/Withdraw'
import { FoxyWithdrawActionType } from './WithdrawCommon'
import { WithdrawContext } from './WithdrawContext'
import { initialState, reducer } from './WithdrawReducer'
export const FoxyWithdraw = () => {
  const { foxy: api } = useFoxy()
  const translate = useTranslate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { query, history, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, rewardId, assetReference } = query

  const assetNamespace = 'erc20'
  // Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: rewardId,
  })
  const underlyingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  // user info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet)
  const { state: walletState } = useWallet()
  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        if (!(walletState.wallet && contractAddress && chainAdapter && api)) return
        const [address, foxyOpportunity] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          api.getFoxyOpportunityByStakingAddress(contractAddress),
        ])
        // Get foxy fee for instant sends
        const foxyFeePercentage = await api.instantUnstakeFee({
          contractAddress,
        })

        dispatch({
          type: FoxyWithdrawActionType.SET_FOXY_FEE,
          payload: bnOrZero(foxyFeePercentage).toString(),
        })
        dispatch({
          type: FoxyWithdrawActionType.SET_USER_ADDRESS,
          payload: address,
        })
        dispatch({
          type: FoxyWithdrawActionType.SET_OPPORTUNITY,
          payload: foxyOpportunity,
        })
      } catch (error) {
        // TODO: handle client side errors
        console.error('FoxyWithdraw error:', error)
      }
    })()
  }, [api, chainAdapter, contractAddress, walletState.wallet])

  const StepConfig: DefiStepProps = {
    [DefiSteps.Info]: {
      label: translate('defi.steps.withdraw.info.title'),
      description: translate('defi.steps.withdraw.info.yieldyDescription', {
        asset: underlyingAsset.symbol,
      }),
      component: Withdraw,
    },
    [DefiSteps.Approve]: {
      label: translate('defi.steps.approve.title'),
      component: Approve,
    },
    [DefiSteps.Confirm]: {
      label: translate('defi.steps.confirm.title'),
      component: Confirm,
    },
    [DefiSteps.Status]: {
      label: 'Status',
      component: Status,
    },
  }

  const handleBack = () => {
    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }

  if (loading || !asset || !marketData || !feeMarketData)
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
          title={translate('modals.withdraw.withdrawFrom', {
            opportunity: `${underlyingAsset.symbol} Yieldy`,
          })}
        />
        <Steps steps={StepConfig} />
      </DefiModalContent>
    </WithdrawContext.Provider>
  )
}
