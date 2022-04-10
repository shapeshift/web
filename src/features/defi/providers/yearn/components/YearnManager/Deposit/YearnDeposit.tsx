import { Center, Flex, useToast } from '@chakra-ui/react'
import { AssetNamespace, caip19 } from '@shapeshiftoss/caip'
import { YearnVaultApi } from '@shapeshiftoss/investor-yearn'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
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
import { initialState, reducer, YearnDepositActionType } from './DepositReducer'

export const routes = [
  { step: 0, path: DepositPath.Deposit, label: 'Deposit' },
  { step: 1, path: DepositPath.Approve, label: 'Approve' },
  { path: DepositPath.ApproveSettings, label: 'Approve Settings' },
  { step: 2, path: DepositPath.Confirm, label: 'Confirm' },
  { path: DepositPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 3, path: DepositPath.Status, label: 'Status' },
]

export type YearnDepositProps = {
  api: YearnVaultApi
}

export const YearnDeposit = ({ api }: YearnDepositProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const location = useLocation()
  const translate = useTranslate()
  const toast = useToast()
  const appDispatch = useAppDispatch()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress: vaultAddress, tokenId } = query

  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const assetCAIP19 = caip19.toCAIP19({ chain, network, assetNamespace, assetReference: tokenId })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))
  if (!marketData) appDispatch(marketApi.endpoints.findByCaip19.initiate(assetCAIP19))

  // user info
  const chainAdapterManager = useChainAdapters()
  const chainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const { state: walletState } = useWallet()
  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        if (!walletState.wallet || !vaultAddress) return
        const [address, vault, pricePerShare] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          api.findByDepositVaultAddress(vaultAddress),
          api.pricePerShare({ vaultAddress }),
        ])
        dispatch({ type: YearnDepositActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: YearnDepositActionType.SET_VAULT, payload: vault })
        dispatch({
          type: YearnDepositActionType.SET_PRICE_PER_SHARE,
          payload: pricePerShare.toString(),
        })
      } catch (error) {
        // TODO: handle client side errors
        console.error('YearnDeposit error:', error)
      }
    })()
  }, [api, chainAdapter, vaultAddress, walletState.wallet])

  const getDepositGasEstimate = async (deposit: DepositValues) => {
    if (!state.userAddress || !tokenId) return
    try {
      const [gasLimit, gasPrice] = await Promise.all([
        api.estimateDepositGas({
          tokenContractAddress: tokenId,
          amountDesired: bnOrZero(deposit.cryptoAmount)
            .times(`1e+${asset.precision}`)
            .decimalPlaces(0),
          userAddress: state.userAddress,
          vaultAddress,
        }),
        api.getGasPrice(),
      ])
      return bnOrZero(gasPrice).times(gasLimit).toFixed(0)
    } catch (error) {
      console.error('YearnDeposit:getDepositGasEstimate error:', error)
      toast({
        position: 'top-right',
        description: translate('common.somethingWentWrongBody'),
        title: translate('common.somethingWentWrong'),
        status: 'error',
      })
    }
  }

  const renderRoute = (route: { step?: number; path: string; label: string }) => {
    const apy = state.vault.metadata?.apy?.net_apy

    switch (route.path) {
      case DepositPath.Deposit:
        return <Deposit api={api} apy={apy} getDepositGasEstimate={getDepositGasEstimate} />
      case DepositPath.Approve:
        return <Approve api={api} getDepositGasEstimate={getDepositGasEstimate} />
      case DepositPath.Confirm:
        return <Confirm api={api} />
      case DepositPath.Status:
        return <Status />
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
