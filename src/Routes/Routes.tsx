import union from 'lodash/union'
import { FaLock, FaRocket, FaTable, FaTractor, FaWallet, FaWater } from 'react-icons/fa'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'
import { AssetsIcon } from 'components/Icons/Assets'
import { DashboardIcon } from 'components/Icons/Dashboard'
import { Layout } from 'components/Layout/Layout'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { Account } from 'pages/Accounts/Account'
import { Accounts } from 'pages/Accounts/Accounts'
import { AccountToken } from 'pages/Accounts/AccountToken/AccountToken'
import { AccountTokenTxHistory } from 'pages/Accounts/AccountToken/AccountTokenTxHistory'
import { AccountTxHistory } from 'pages/Accounts/AccountTxHistory'
import { Asset } from 'pages/Assets/Asset'
import { Assets } from 'pages/Assets/Assets'
import { AssetTxHistory } from 'pages/Assets/AssetTxHistory'
import { ConnectWallet } from 'pages/ConnectWallet/ConnectWallet'
import { Dashboard } from 'pages/Dashboard/Dashboard'
import { Farming } from 'pages/Defi/views/Farming'
import { LiquidityPools } from 'pages/Defi/views/LiquidityPools'
import { Overview } from 'pages/Defi/views/Overview'
import { StakingVaults } from 'pages/Defi/views/StakingVaults'
import { Flags } from 'pages/Flags/Flags'
import { PrivacyPolicy } from 'pages/Legal/PrivacyPolicy'
import { TermsOfService } from 'pages/Legal/TermsOfService'
import { NotFound } from 'pages/NotFound/NotFound'

import { generateAppRoutes, Route as NestedRoute } from './helpers'
import { PrivateRoute } from './PrivateRoute'

export const routes: Array<NestedRoute> = [
  {
    path: '/dashboard',
    label: 'navBar.dashboard',
    icon: <DashboardIcon />,
    main: Dashboard
  },
  {
    path: '/assets',
    label: 'navBar.assets',
    main: Assets,
    icon: <AssetsIcon color='inherit' />,
    routes: [
      {
        path: '/:chainId/:assetSubId',
        label: 'Overview',
        icon: <AssetsIcon color='inherit' />,
        main: null,
        hide: true,
        routes: [
          {
            path: '/',
            label: 'navBar.overview',
            main: Asset
          },
          {
            path: '/transactions',
            label: 'navBar.transactions',
            main: AssetTxHistory
          }
        ]
      }
    ]
  },
  {
    path: '/accounts',
    label: 'navBar.accounts',
    main: Accounts,
    icon: <FaWallet color='inherit' />,
    routes: [
      {
        path: '/:accountId',
        label: 'Account Details',
        main: null,
        hide: true,
        routes: [
          {
            path: '/',
            label: 'navBar.overview',
            main: Account
          },
          {
            path: '/transactions',
            label: 'navBar.transactions',
            main: AccountTxHistory
          },
          {
            path: '/:assetId',
            label: 'navBar.overview',
            main: null,
            hide: true,
            routes: [
              {
                path: '/',
                main: AccountToken,
                label: 'navBar.overview'
              },
              {
                path: '/transactions',
                main: AccountTokenTxHistory,
                label: 'navBar.transactions'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/defi',
    label: 'navBar.defi',
    icon: <FaRocket />,
    main: null,
    routes: [
      {
        path: '/',
        label: 'defi.overview',
        main: Overview,
        icon: <FaTable />
      },
      {
        path: '/liquidity-pools',
        label: 'defi.liquidityPools',
        main: LiquidityPools,
        icon: <FaWater />,
        disable: true
      },
      {
        path: '/earn',
        label: 'defi.earn',
        main: StakingVaults,
        icon: <FaLock />
      },
      {
        path: '/farming',
        label: 'defi.farming',
        main: Farming,
        icon: <FaTractor />,
        disable: true
      }
    ]
  }
]

function useLocationBackground() {
  const location = useLocation<{ background: any }>()
  const background = location.state && location.state.background
  return { background, location }
}

export const Routes = (props: { additionalRoutes?: Array<NestedRoute> }) => {
  const { background, location } = useLocationBackground()
  const { state } = useWallet()
  const hasWallet = Boolean(state.walletInfo?.deviceId) || state.isLoadingLocalWallet

  const appRoutes = generateAppRoutes(union(props?.additionalRoutes, routes))

  return (
    <Switch location={background || location}>
      {appRoutes.map((route, index) => {
        return (
          <PrivateRoute key={index} path={route.path} exact hasWallet={hasWallet}>
            <Layout route={route} />
          </PrivateRoute>
        )
      })}
      <Route path='/connect-wallet'>
        <ConnectWallet />
      </Route>
      <Route path={'/legal/terms-of-service'}>
        <Layout
          route={{
            path: '/legal/terms-of-service',
            label: 'Terms of Service',
            main: TermsOfService
          }}
        />
      </Route>
      <Route path={'/legal/privacy-policy'}>
        <Layout
          route={{
            path: '/legal/privacy-policy',
            label: 'Privacy Policy',
            main: PrivacyPolicy
          }}
        />
      </Route>
      <Route path='/flags'>
        <Layout
          route={{
            path: '/flags',
            label: 'Flags',
            main: Flags
          }}
        />
      </Route>
      <Redirect from='/' to='/dashboard' />
      <Route component={NotFound} />
    </Switch>
  )
}
