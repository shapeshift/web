import {
  FaFlag,
  FaHistory,
  FaLock,
  FaRocket,
  FaTable,
  FaTractor,
  FaWallet,
  FaWater,
} from 'react-icons/fa'
import { AssetsIcon } from 'components/Icons/Assets'
import { DashboardIcon } from 'components/Icons/Dashboard'
import { Account } from 'pages/Accounts/Account'
import { Accounts } from 'pages/Accounts/Accounts'
import { AccountToken } from 'pages/Accounts/AccountToken/AccountToken'
import { AccountTokenTxHistory } from 'pages/Accounts/AccountToken/AccountTokenTxHistory'
import { AccountTxHistory } from 'pages/Accounts/AccountTxHistory'
import { Asset } from 'pages/Assets/Asset'
import { Assets } from 'pages/Assets/Assets'
import { AssetTxHistory } from 'pages/Assets/AssetTxHistory'
import { Dashboard } from 'pages/Dashboard/Dashboard'
import { Farming } from 'pages/Defi/views/Farming'
import { LiquidityPools } from 'pages/Defi/views/LiquidityPools'
import { Overview } from 'pages/Defi/views/Overview'
import { StakingVaults } from 'pages/Defi/views/StakingVaults'
import { Flags } from 'pages/Flags/Flags'
import { TransactionHistory } from 'pages/TransactionHistory/TransactionHistory'

import { Route as NestedRoute } from './helpers'

export const routes: Array<NestedRoute> = [
  {
    path: '/dashboard',
    label: 'navBar.dashboard',
    icon: <DashboardIcon />,
    main: Dashboard,
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
            main: Asset,
          },
          {
            path: '/transactions',
            label: 'navBar.transactions',
            main: AssetTxHistory,
          },
        ],
      },
    ],
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
    icon: <FaRocket />,
    main: null,
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
    icon: <FaHistory />,
    main: TransactionHistory,
  },
  {
    path: '/flags',
    label: 'navBar.featureFlags',
    icon: <FaFlag />,
    hide: window.location.hostname !== 'localhost',
    main: Flags,
  },
]
