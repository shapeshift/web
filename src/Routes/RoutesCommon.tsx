import { getConfig } from 'config'
import { FaCreditCard, FaFlag } from 'react-icons/fa'
import { IoSwapVertical } from 'react-icons/io5'
import { AssetsIcon } from 'components/Icons/Assets'
import { DashboardIcon } from 'components/Icons/Dashboard'
import { DefiIcon } from 'components/Icons/DeFi'
import { TxHistoryIcon } from 'components/Icons/TxHistory'
import { assetIdPaths } from 'hooks/useRouteAssetId/useRouteAssetId'
import { Asset } from 'pages/Assets/Asset'
import { Assets } from 'pages/Assets/Assets'
import { AssetTxHistory } from 'pages/Assets/AssetTxHistory'
import { Buy } from 'pages/Buy/Buy'
import { Dashboard } from 'pages/Dashboard/Dashboard'
import { StakingVaults } from 'pages/Defi/views/StakingVaults'
import { Flags } from 'pages/Flags/Flags'
import { Trade } from 'pages/Trade/Trade'
import { TransactionHistory } from 'pages/TransactionHistory/TransactionHistory'

import type { Route as NestedRoute } from './helpers'
import { RouteCategory } from './helpers'

export const routes: NestedRoute[] = [
  {
    path: '/dashboard',
    label: 'navBar.myWallet',
    shortLabel: 'navBar.dashboardShort',
    icon: <DashboardIcon />,
    main: Dashboard,
    category: RouteCategory.Wallet,
    mobileNav: true,
    priority: 0,
    routes: [
      {
        path: '/transaction-history',
        label: 'navBar.transactionHistory',
        icon: <TxHistoryIcon />,
        main: TransactionHistory,
        category: RouteCategory.Wallet,
      },
    ],
  },
  // {
  //   path: '/accounts',
  //   label: 'navBar.accounts',
  //   main: Accounts,
  //   icon: <AccountsIcon />,
  //   category: RouteCategory.Wallet,
  //   mobileNav: true,
  //   priority: 1,
  //   routes: [
  //     {
  //       path: '/:accountId',
  //       label: 'Account Details',
  //       main: null,
  //       hide: true,
  //       routes: [
  //         {
  //           path: '/',
  //           label: 'navBar.overview',
  //           main: Account,
  //         },
  //         {
  //           path: '/transactions',
  //           label: 'navBar.transactions',
  //           main: AccountTxHistory,
  //         },
  //         {
  //           path: '/:assetId',
  //           label: 'navBar.overview',
  //           main: null,
  //           hide: true,
  //           routes: [
  //             {
  //               path: '/',
  //               main: AccountToken,
  //               label: 'navBar.overview',
  //             },
  //             {
  //               path: '/transactions',
  //               main: AccountTokenTxHistory,
  //               label: 'navBar.transactions',
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //   ],
  // },
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
    path: '/earn',
    label: 'defi.earn',
    icon: <DefiIcon />,
    main: StakingVaults,
    category: RouteCategory.Explore,
    mobileNav: true,
    priority: 3,
  },
  {
    path: '/trade',
    label: 'navBar.trade',
    icon: <IoSwapVertical />,
    mobileNav: true,
    priority: 2,
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
    shortLabel: 'navBar.buyCryptoShort',
    icon: <FaCreditCard />,
    main: Buy,
    category: RouteCategory.Wallet,
    mobileNav: true,
    priority: 4,
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
