import { Center, Flex, useToast } from '@chakra-ui/react'
import { toAssetId } from '@shapeshiftoss/caip'
import { YearnInvestor } from '@shapeshiftoss/investor-yearn'
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
import { DepositPath, routes, YearnDepositActionType } from './DepositCommon'
import { DepositContext } from './DepositContext'
import { initialState, reducer } from './DepositReducer'

type YearnDepositProps = {
  yearnInvestor: YearnInvestor
}

export const YearnDeposit = ({ yearnInvestor }: YearnDepositProps) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const location = useLocation()
  const translate = useTranslate()
  const toast = useToast()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const chainAdapterManager = useChainAdapters()
  const { chainId, contractAddress: vaultAddress, assetReference } = query

  const assetNamespace = 'erc20'
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // user info
  const chainAdapter = chainAdapterManager.get(chainId)
  const { state: walletState } = useWallet()
  const loading = useSelector(selectPortfolioLoading)

  useEffect(() => {
    ;(async () => {
      try {
        if (!(walletState.wallet && vaultAddress && chainAdapter)) return
        const [address, opportunity] = await Promise.all([
          chainAdapter.getAddress({ wallet: walletState.wallet }),
          yearnInvestor.findByOpportunityId(
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

        dispatch({ type: YearnDepositActionType.SET_USER_ADDRESS, payload: address })
        dispatch({ type: YearnDepositActionType.SET_OPPORTUNITY, payload: opportunity })
      } catch (error) {
        // TODO: handle client side errors
        console.error('YearnDeposit error:', error)
      }
    })()
  }, [yearnInvestor, chainAdapter, vaultAddress, walletState.wallet, translate, toast, chainId])

  const getDepositGasEstimate = async (deposit: DepositValues): Promise<string | undefined> => {
    if (!(state.userAddress && state.opportunity && assetReference)) return
    try {
      const yearnOpportunity = await yearnInvestor.findByOpportunityId(
        state.opportunity?.positionAsset.assetId ?? '',
      )
      if (!yearnOpportunity) throw new Error('No opportunity')
      const preparedTx = await yearnOpportunity.prepareDeposit({
        amount: bnOrZero(deposit.cryptoAmount).times(`1e+${asset.precision}`).integerValue(),
        address: state.userAddress,
      })
      // TODO(theobold): Figure out a better way for the safety factor
      return bnOrZero(preparedTx.gasPrice).times(preparedTx.estimatedGas).integerValue().toString()
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
    if (!state.opportunity) return null

    switch (route.path) {
      case DepositPath.Deposit:
        return <Deposit getDepositGasEstimate={getDepositGasEstimate} />
      case DepositPath.Approve:
        return <Approve getDepositGasEstimate={getDepositGasEstimate} />
      case DepositPath.Confirm:
        return <Confirm />
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
