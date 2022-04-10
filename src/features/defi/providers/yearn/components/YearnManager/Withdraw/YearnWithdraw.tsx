import { Center, Flex } from '@chakra-ui/react'
import { AssetNamespace, caip19 } from '@shapeshiftoss/caip'
import { YearnVaultApi } from '@shapeshiftoss/investor-yearn'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useReducer } from 'react'
import { useSelector } from 'react-redux'
import { Route, Switch, useLocation } from 'react-router-dom'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectPortfolioLoading,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Confirm } from './components/Confirm'
import { Status } from './components/Status'
import { Withdraw } from './components/Withdraw'
import { WithdrawPath } from './WithdrawCommon'
import { WithdrawContext } from './WithdrawContext'
import { initialState, reducer, YearnWithdrawActionType } from './WithdrawReducer'

export const routes = [
  { step: 0, path: WithdrawPath.Withdraw, label: 'Amount' },
  { step: 1, path: WithdrawPath.Confirm, label: 'Confirm' },
  { path: WithdrawPath.ConfirmSettings, label: 'Confirm Settings' },
  { step: 2, path: WithdrawPath.Status, label: 'Status' },
]

type YearnWithdrawProps = {
  api: YearnVaultApi
}

export const YearnWithdraw = ({ api }: YearnWithdrawProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const location = useLocation()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, contractAddress: vaultAddress, tokenId } = query

  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  // Asset info
  const underlyingAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: tokenId,
  })
  const assetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: vaultAddress,
  })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, underlyingAssetCAIP19))

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
        dispatch({ type: YearnWithdrawActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: YearnWithdrawActionType.SET_VAULT, payload: vault })
        dispatch({
          type: YearnWithdrawActionType.SET_PRICE_PER_SHARE,
          payload: pricePerShare.toString(),
        })
      } catch (error) {
        // TODO: handle client side errors
        console.error('YearnWithdraw error:', error)
      }
    })()
  }, [api, chainAdapter, vaultAddress, walletState.wallet])

  const renderRoute = (route: { step?: number; path: string; label: string }) => {
    switch (route.path) {
      case WithdrawPath.Withdraw:
        return <Withdraw api={api} />
      case WithdrawPath.Confirm:
        return <Confirm api={api} />
      case WithdrawPath.Status:
        return <Status />
      default:
        throw new Error('Route does not exist')
    }
  }

  if (loading || !asset || !marketData)
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
