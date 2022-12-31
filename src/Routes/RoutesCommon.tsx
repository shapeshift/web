import { getConfig } from 'config'
import { FaCreditCard, FaFlag, FaLock, FaTable, FaTractor, FaWater } from 'react-icons/fa'
import { IoSwapVertical } from 'react-icons/io5'
import { AccountsIcon } from 'components/Icons/Accounts'
import { AssetsIcon } from 'components/Icons/Assets'
import { DashboardIcon } from 'components/Icons/Dashboard'
import { DefiIcon } from 'components/Icons/DeFi'
import { TxHistoryIcon } from 'components/Icons/TxHistory'
import { assetIdPaths } from 'hooks/useRouteAssetId/useRouteAssetId'
import { Account } from 'pages/Accounts/Account'
import { Accounts } from 'pages/Accounts/Accounts'
import { AccountToken } from 'pages/Accounts/AccountToken/AccountToken'
import { AccountTokenTxHistory } from 'pages/Accounts/AccountToken/AccountTokenTxHistory'
import { AccountTxHistory } from 'pages/Accounts/AccountTxHistory'
import { Asset } from 'pages/Assets/Asset'
import { Assets } from 'pages/Assets/Assets'
import { AssetTxHistory } from 'pages/Assets/AssetTxHistory'
import { Buy } from 'pages/Buy/Buy'
import { Dashboard } from 'pages/Dashboard/Dashboard'
import { Farming } from 'pages/Defi/views/Farming'
import { LiquidityPools } from 'pages/Defi/views/LiquidityPools'
import { Overview } from 'pages/Defi/views/Overview'
import { StakingVaults } from 'pages/Defi/views/StakingVaults'
import { Flags } from 'pages/Flags/Flags'
import { Trade } from 'pages/Trade/Trade'
import { TransactionHistory } from 'pages/TransactionHistory/TransactionHistory'

import type { Route as NestedRoute } from './helpers'
import { RouteCategory } from './helpers'

export const routes: NestedRoute[] = [
  {
    path: '/dashboard',
    label: 'navBar.dashboard',
    icon: <DashboardIcon />,
    main: Dashboard,
    category: RouteCategory.Wallet,
  },
  {
    path: '/assets',
    label: 'navBar.assets',
    main: Assets,
    icon: <AssetsIcon />,
    category: RouteCategory.Explore,
    routes: assetIdPaths.map(assetIdPath => ({
      path: assetIdPath,
      label: 'Overview',
      icon: <AssetsIcon />,
      main: null,
      hide: true,
      routes: [
        {
          path: '/',
          label: 'navBar.overview',
          main: Asset,
        },
        {
          path: '/transactions',
          label: 'navBar.transactions',
          main: AssetTxHistory,
        },
      ],
    })),
  },
  {
    path: '/accounts',
    label: 'navBar.accounts',
    main: Accounts,
    icon: <AccountsIcon />,
    category: RouteCategory.Wallet,
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
            main: Account,
          },
          {
            path: '/transactions',
            label: 'navBar.transactions',
            main: AccountTxHistory,
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
                label: 'navBar.overview',
              },
              {
                path: '/transactions',
                main: AccountTokenTxHistory,
                label: 'navBar.transactions',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/defi',
    label: 'navBar.defi',
    icon: <DefiIcon />,
    main: null,
    category: RouteCategory.Explore,
    routes: [
      {
        path: '/',
        label: 'defi.overview',
        main: Overview,
        icon: <FaTable />,
      },
      {
        path: '/liquidity-pools',
        label: 'defi.liquidityPools',
        main: LiquidityPools,
        icon: <FaWater />,
        disable: true,
      },
      {
        path: '/earn',
        label: 'defi.earn',
        main: StakingVaults,
        icon: <FaLock />,
      },
      {
        path: '/farming',
        label: 'defi.farming',
        main: Farming,
        icon: <FaTractor />,
        disable: true,
      },
    ],
  },
  {
    path: '/transaction-history',
    label: 'navBar.transactionHistory',
    icon: <TxHistoryIcon />,
    main: TransactionHistory,
    category: RouteCategory.Wallet,
  },
  {
    path: '/trade',
    label: 'navBar.trade',
    icon: <IoSwapVertical />,
    main: Trade,
    category: RouteCategory.Explore,
    routes: assetIdPaths.map(assetIdPath => ({
      label: 'Trade Asset',
      path: assetIdPath,
      main: Trade,
      hide: true,
    })),
  },
  {
    path: '/buy-crypto',
    label: 'navBar.buyCrypto',
    icon: <FaCreditCard />,
    main: Buy,
    category: RouteCategory.Wallet,
    routes: assetIdPaths.map(assetIdPath => ({
      label: 'Buy Asset',
      path: assetIdPath,
      main: Buy,
    })),
  },
  {
    path: '/flags',
    label: 'navBar.featureFlags',
    icon: <FaFlag />,
    hide:
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== getConfig().REACT_APP_LOCAL_IP,
    main: Flags,
  },
]
