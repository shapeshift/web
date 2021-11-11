import { TimeIcon } from '@chakra-ui/icons'
import { FaLock, FaPiggyBank, FaTable, FaTractor, FaWater } from 'react-icons/fa'
import { Redirect, Route, Switch, useLocation } from 'react-router-dom'
import { AssetsIcon } from 'components/Icons/Assets'
import { DashboardIcon } from 'components/Icons/Dashboard'
import { Layout } from 'components/Layout/Layout'
import { Asset } from 'pages/Assets/Asset'
import { AssetRightSidebar } from 'pages/Assets/AssetRightSidebar'
import { Assets } from 'pages/Assets/Assets'
import { AssetSidebar } from 'pages/Assets/AssetSidebar'
import { Dashboard } from 'pages/Dashboard/Dashboard'
import { DashboardSidebar } from 'pages/Dashboard/DashboardSidebar'
import { EarnSidebar } from 'pages/Earn/components/EarnSidebar'
import { Farming } from 'pages/Earn/views/Farming'
import { LiquidityPools } from 'pages/Earn/views/LiquidityPools'
import { Overview } from 'pages/Earn/views/Overview'
import { StakingVaults } from 'pages/Earn/views/StakingVaults'
import { NotFound } from 'pages/NotFound/NotFound'
import { TradeHistory } from 'pages/TradeHistory/TradeHistory'

import { generateAppRoutes, Route as NestedRoute } from './helpers'

export const routes: Array<NestedRoute> = [
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
    path: '/earn',
    label: 'navBar.earn',
    icon: <FaPiggyBank />,
    main: null,
    disable: true,
    leftSidebar: <EarnSidebar />,
    routes: [
      {
        path: '/',
        label: 'earn.overview',
        main: <Overview />,
        icon: <FaTable />,
        leftSidebar: <EarnSidebar />
      },
      {
        path: '/liquidity-pools',
        label: 'earn.liquidityPools',
        main: <LiquidityPools />,
        icon: <FaWater />,
        leftSidebar: <EarnSidebar />,
        disable: true
      },
      {
        path: '/staking-vaults',
        label: 'earn.stakingVaults',
        main: <StakingVaults />,
        icon: <FaLock />,
        leftSidebar: <EarnSidebar />
      },
      {
        path: '/farming',
        label: 'earn.farming',
        main: <Farming />,
        icon: <FaTractor />,
        leftSidebar: <EarnSidebar />,
        disable: true
      }
    ]
  },
  {
    path: '/trade-history',
    label: 'navBar.tradeHistory',
    icon: <TimeIcon />,
    main: <TradeHistory />
  }
]

const appRoutes = generateAppRoutes(routes)

function useLocationBackground() {
  const location = useLocation<{ background: any }>()
  const background = location.state && location.state.background
  return { background, location }
}

export const Routes = () => {
  const { background, location } = useLocationBackground()

  return (
    <Switch location={background || location}>
      {appRoutes.map((route, index) => {
        return (
          <Route key={index} path={route.path} exact>
            <Layout route={route} />
          </Route>
        )
      })}
      <Redirect from='/' to='/dashboard' />
      <Route component={NotFound} />
    </Switch>
  )
}
