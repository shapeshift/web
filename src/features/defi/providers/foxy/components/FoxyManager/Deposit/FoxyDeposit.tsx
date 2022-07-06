import { Center, Flex, useToast } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { DepositValues } from 'features/defi/components/Deposit/Deposit'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { AnimatePresence } from 'framer-motion'
import { useFoxyApr } from 'plugins/foxPage/hooks/useFoxyApr'
import { useEffect, useReducer } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { Route, Switch, useLocation } from 'react-router-dom'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
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
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { DepositPath, FoxyDepositActionType, routes } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

export const FoxyDeposit = () => {
  const { foxy: api } = useFoxy()
  const [state, dispatch] = useReducer(reducer, initialState)
  const location = useLocation()
  const translate = useTranslate()
  const toast = useToast()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // user info
  const chainAdapterManager = useChainAdapters()
  const { state: walletState } = useWallet()
  const { foxyApr, loaded: isFoxyAprLoaded } = useFoxyApr()
  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        const chainAdapter = await chainAdapterManager.get(KnownChainIds.EthereumMainnet)
        if (!(walletState.wallet && contractAddress && isFoxyAprLoaded && chainAdapter && api))
          return
        const [address, foxyOpportunity] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          api.getFoxyOpportunityByStakingAddress(contractAddress),
        ])
        dispatch({ type: FoxyDepositActionType.SET_USER_ADDRESS, payload: address })
        dispatch({
          type: FoxyDepositActionType.SET_OPPORTUNITY,
          payload: { ...foxyOpportunity, apy: foxyApr ?? '' },
        })
      } catch (error) {
        // TODO: handle client side errors
        console.error('FoxyDeposit error:', error)
      }
    })()
  }, [api, chainAdapterManager, contractAddress, walletState.wallet, foxyApr, isFoxyAprLoaded])

  const getDepositGasEstimate = async (deposit: DepositValues) => {
    if (!state.userAddress || !assetReference || !api) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateDepositGas({
          tokenContractAddress: assetReference,
          contractAddress,
          amountDesired: bnOrZero(deposit.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          userAddress: state.userAddress,
        }),
        api.getGasPrice(),
      ])
      return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
    } catch (error) {
      console.error('FoxyDeposit:getDepositGasEstimate error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }

  const renderRoute = (route: { step?: number; path: string; label: string }) => {
    const apy = state.foxyOpportunity.apy

    switch (route.path) {
      case DepositPath.Deposit:
        return <Deposit apy={String(apy)} api={api} getDepositGasEstimate={getDepositGasEstimate} />
      case DepositPath.Approve:
        return <Approve api={api} getDepositGasEstimate={getDepositGasEstimate} />
      case DepositPath.Confirm:
        return <Confirm apy={String(apy)} api={api} />
      case DepositPath.Status:
        return <Status apy={String(apy)} api={api} />
      default:
        throw new Error('Route does not exist')
    }
  }

  if (loading || !asset || !marketData) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <DepositContext.Provider value={{ state, dispatch }}>
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
    </DepositContext.Provider>
  )
}
