import { Center, Flex, useToast } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { KnownChainIds } from '@shapeshiftoss/types'
import { WithdrawValues } from 'features/defi/components/Withdraw/Withdraw'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Route, Switch, useLocation } from 'react-router-dom'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
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
import { FoxyWithdrawActionType, routes, WithdrawPath } from './WithdrawCommon'
import { WithdrawContext } from './WithdrawContext'
import { initialState, reducer } from './WithdrawReducer'

type FoxyWithdrawProps = {
  api: FoxyApi
}

export const FoxyWithdraw = ({ api }: FoxyWithdrawProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const location = useLocation()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, rewardId } = query
  const toast = useToast()

  const assetNamespace = 'erc20'
  // Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: rewardId,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
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
        if (!(walletState.wallet && contractAddress && chainAdapter)) return
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

  const getWithdrawGasEstimate = async (withdraw: WithdrawValues) => {
    if (!state.userAddress || !rewardId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateWithdrawGas({
          tokenContractAddress: rewardId,
          contractAddress,
          amountDesired: bnOrZero(
            bn(withdraw.cryptoAmount).times(`1e+${asset.precision}`),
          ).decimalPlaces(0),
          userAddress: state.userAddress,
          type: state.withdraw.withdrawType,
        }),
        api.getGasPrice(),
      ])
      const returVal = bnOrZero(bn(gasPrice).times(gasLimit)).toFixed(0)
      return returVal
    } catch (error) {
      console.error('FoxyWithdraw:getWithdrawGasEstimate error:', error)
      const fundsError =
        error instanceof Error && error.message.includes('Not enough funds in reserve')
      toast({
        position: 'top-right',
        description: fundsError
          ? translate('defi.notEnoughFundsInReserve')
          : translate('common.somethingWentWrong'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }

  const renderRoute = (route: { step?: number; path: string; label: string }) => {
    switch (route.path) {
      case WithdrawPath.Withdraw:
        return <Withdraw api={api} getWithdrawGasEstimate={getWithdrawGasEstimate} />
      case WithdrawPath.Approve:
        return <Approve api={api} getWithdrawGasEstimate={getWithdrawGasEstimate} />
      case WithdrawPath.Confirm:
        return <Confirm api={api} />
      case WithdrawPath.Status:
        return <Status />
      default:
        throw new Error('Route does not exist')
    }
  }

  if (loading || !asset || !marketData || !feeMarketData)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

  return (
    <WithdrawContext.Provider value={{ state, dispatch }}>
      <Flex width='full' minWidth={{ base: '100%', md: '500px' }} flexDir='column'>
        <RouteSteps routes={routes} location={location} />
        <Flex flexDir='column' width='full'>
          <AnimatePresence exitBeforeEnter initial={false}>
            <Switch location={location} key={location.key}>
              {routes.map(route => {
                return (
                  <Route
                    exact
                    key={route.path}
                    render={() => renderRoute(route)}
                    path={route.path}
                  />
                )
              })}
            </Switch>
          </AnimatePresence>
        </Flex>
      </Flex>
    </WithdrawContext.Provider>
  )
}
