import { Center, Flex, useToast } from '@chakra-ui/react'
import { AssetNamespace, caip19 } from '@shapeshiftoss/caip'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { NetworkTypes } from '@shapeshiftoss/types'
import { DepositValues } from 'features/defi/components/Deposit/Deposit'
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
import { bnOrZero } from 'lib/bignumber/bignumber'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { Approve } from './components/Approve'
import { Confirm } from './components/Confirm'
import { Deposit } from './components/Deposit'
import { Status } from './components/Status'
import { DepositPath } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { FoxyDepositActionType, initialState, reducer } from './DepositReducer'

export const routes = [
  { step: 0, path: DepositPath.Deposit, label: 'Deposit' },
  { step: 1, path: DepositPath.Approve, label: 'Approve' },
  { path: DepositPath.ApproveSettings, label: 'Approve Settings' },
  { step: 2, path: DepositPath.Confirm, label: 'Confirm' },
  { path: DepositPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 3, path: DepositPath.Status, label: 'Status' },
]

export type FoxyDepositProps = {
  api: FoxyApi
}

export const FoxyDeposit = ({ api }: FoxyDepositProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const location = useLocation()
  const translate = useTranslate()
  const appDispatch = useAppDispatch()
  const toast = useToast()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress, tokenId } = query
  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const assetId = caip19.toCAIP19({ chain, network, assetNamespace, assetReference: tokenId })

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  if (!marketData) appDispatch(marketApi.endpoints.findByCaip19.initiate(assetId))

  // user info
  const chainAdapterManager = useChainAdapters()
  const { state: walletState } = useWallet()
  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        if (!walletState.wallet || !contractAddress) return
        const chainAdapter = await chainAdapterManager.byChainId('eip155:1')
        const [address, foxyOpportunity] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          api.getFoxyOpportunityByStakingAddress(contractAddress),
        ])
        dispatch({ type: FoxyDepositActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: FoxyDepositActionType.SET_OPPORTUNITY, payload: foxyOpportunity })
      } catch (error) {
        // TODO: handle client side errors
        console.error('FoxyDeposit error:', error)
      }
    })()
  }, [api, chainAdapterManager, contractAddress, walletState.wallet])

  const getDepositGasEstimate = async (deposit: DepositValues) => {
    if (!state.userAddress || !tokenId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateDepositGas({
          tokenContractAddress: tokenId,
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
