<<<<<<< HEAD
import { FaLock, FaPiggyBank, FaTable, FaTractor, FaWater } from 'react-icons/fa'
import { Navigate, Routes, Route, useLocation, useParams } from 'react-router-dom'
=======
import { FaLock, FaRocket, FaTable, FaTractor, FaWallet, FaWater } from 'react-icons/fa'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'
>>>>>>> upstream/develop
import { AssetsIcon } from 'components/Icons/Assets'
import { DashboardIcon } from 'components/Icons/Dashboard'
import { Layout } from 'components/Layout/Layout'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { Account } from 'pages/Accounts/Account'
import { Accounts } from 'pages/Accounts/Accounts'
import { AccountToken } from 'pages/Accounts/AccountToken'
import { Asset } from 'pages/Assets/Asset'
import { AssetRightSidebar } from 'pages/Assets/AssetRightSidebar'
import { Assets } from 'pages/Assets/Assets'
import { AssetSidebar } from 'pages/Assets/AssetSidebar'
import { ConnectWallet } from 'pages/ConnectWallet/ConnectWallet'
import { Dashboard } from 'pages/Dashboard/Dashboard'
import { DashboardSidebar } from 'pages/Dashboard/DashboardSidebar'
import { DefiSidebar } from 'pages/Defi/components/DefiSidebar'
import { Farming } from 'pages/Defi/views/Farming'
import { LiquidityPools } from 'pages/Defi/views/LiquidityPools'
import { Overview } from 'pages/Defi/views/Overview'
import { StakingVaults } from 'pages/Defi/views/StakingVaults'
import { NotFound } from 'pages/NotFound/NotFound'

import { generateAppRoutes, Route as NestedRoute } from './helpers'
import { PrivateRoute } from './PrivateRoute'

export const routesShift: Array<NestedRoute> = [
  {
    path: '/dashboard',
    label: 'navBar.dashboard',
    icon: <DashboardIcon />,
    main: <Dashboard />,
    rightSidebar: <DashboardSidebar />
  },
  {
    path: '/assets',
    label: 'navBar.assets',
    main: <Assets />,
    icon: <AssetsIcon color='inherit' />,
    routes: [
      {
        path: '/:chain/:tokenId?',
        label: 'Asset Details',
        main: <Asset />,
        leftSidebar: <AssetSidebar />,
        rightSidebar: <AssetRightSidebar />
      }
    ]
  },
  {
    path: '/accounts',
    label: 'navBar.accounts',
    main: <Accounts />,
    icon: <FaWallet color='inherit' />,
    routes: [
      {
        path: '/:accountId',
        label: 'Account Details',
        main: <Account />,
        leftSidebar: <AssetSidebar />,
        rightSidebar: <AssetRightSidebar />
      },
      {
        path: '/:accountId/:assetId?',
        label: 'Account Asset',
        main: <AccountToken />,
        leftSidebar: <AssetSidebar />,
        rightSidebar: <AssetRightSidebar />
      }
    ]
  },
  {
    path: '/defi',
    label: 'navBar.defi',
    icon: <FaRocket />,
    main: null,
    leftSidebar: <DefiSidebar />,
    routes: [
      {
        path: '/',
        label: 'defi.overview',
        main: <Overview />,
        icon: <FaTable />,
        leftSidebar: <DefiSidebar />
      },
      {
        path: '/liquidity-pools',
        label: 'defi.liquidityPools',
        main: <LiquidityPools />,
        icon: <FaWater />,
        leftSidebar: <DefiSidebar />,
        disable: true
      },
      {
        path: '/earn',
        label: 'defi.earn',
        main: <StakingVaults />,
        icon: <FaLock />,
        leftSidebar: <DefiSidebar />
      },
      {
        path: '/farming',
        label: 'defi.farming',
        main: <Farming />,
        icon: <FaTractor />,
        leftSidebar: <DefiSidebar />,
        disable: true
      }
    ]
  } /* ,
  {
    path: '/trade-history',
    label: 'navBar.tradeHistory',
    icon: <TimeIcon />,
    main: <TradeHistory />
  } */
]

const appRoutes = generateAppRoutes(routesShift)

function useLocationBackground() {
  let location = useLocation()
  let params = useParams()
  const background = location.state && params.background
  return { background, location }
}

export const ShiftRoutes = () => {
  const { background, location } = useLocationBackground()
  const { state, dispatch } = useWallet()
  const hasWallet = Boolean(state.walletInfo?.deviceId)
  return (
    <Routes location={location}>
      {appRoutes.map((route, index) => {
        return (
          <PrivateRoute key={index} path={route.path} hasWallet={hasWallet}>
            <Layout route={route} />
          </PrivateRoute>
        )
      })}
      <Route
        path='/connect-wallet'
        element={<ConnectWallet dispatch={dispatch} hasWallet={hasWallet} />}
      />
      <Navigate to='/dashboard' />
      <Route element={NotFound} />
    </Routes>
  )
}
