import { getConfig } from 'config'
import { FaCreditCard, FaFlag } from 'react-icons/fa'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { AssetsIcon } from 'components/Icons/Assets'
import { DashboardIcon } from 'components/Icons/Dashboard'
import { DefiIcon } from 'components/Icons/DeFi'
import { PoolsIcon } from 'components/Icons/Pools'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { TxHistoryIcon } from 'components/Icons/TxHistory'
import { assetIdPaths } from 'hooks/useRouteAssetId/useRouteAssetId'
import { Asset } from 'pages/Assets/Asset'
import { Assets } from 'pages/Assets/Assets'
import { AssetTxHistory } from 'pages/Assets/AssetTxHistory'
import { Buy } from 'pages/Buy/Buy'
import { Dashboard } from 'pages/Dashboard/Dashboard'
import { StakingVaults } from 'pages/Defi/views/StakingVaults'
import { Flags } from 'pages/Flags/Flags'
import { LendingPage } from 'pages/Lending/LendingPage'
import { PoolsPage } from 'pages/ThorChainLP/PoolsPage'
import { Trade } from 'pages/Trade/Trade'
import { TransactionHistory } from 'pages/TransactionHistory/TransactionHistory'

import type { Route as NestedRoute } from './helpers'
import { RouteCategory } from './helpers'

/**
 * WARNING: whenever routes that contain user addresses are edited here, we need
 * to make sure that we update the tests in lib/mixpanel/helpers.test.ts and
 * the corresponding parsed routes in lib/mixpanel/helpers.ts
 *
 * THIS IS CRITICAL FOR MIXPANEL TO NOT COLLECT USER ADDRESSES
 */

export const routes: NestedRoute[] = [
  {
    path: '/trade',
    label: 'navBar.trade',
    shortLabel: 'navBar.tradeShort',
    icon: <SwapIcon />,
    mobileNav: true,
    priority: 2,
    main: Trade,
    category: RouteCategory.Featured,
    routes: assetIdPaths.map(assetIdPath => ({
      label: 'Trade Asset',
      path: assetIdPath,
      main: Trade,
      hide: true,
    })),
  },
  {
    path: '/lending',
    label: 'navBar.lending',
    icon: <RiExchangeFundsLine />,
    main: LendingPage,
    category: RouteCategory.Featured,
    priority: 4,
    mobileNav: false,
    disable: !getConfig().REACT_APP_FEATURE_THORCHAIN_LENDING,
  },
  {
    path: '/pools',
    label: 'navBar.pools',
    icon: <PoolsIcon />,
    main: PoolsPage,
    category: RouteCategory.Featured,
    priority: 4,
    mobileNav: false,
    disable: !getConfig().REACT_APP_FEATURE_THORCHAIN_LP,
  },
  {
    path: '/earn',
    label: 'defi.earn',
    icon: <DefiIcon />,
    main: StakingVaults,
    category: RouteCategory.Featured,
    mobileNav: true,
    priority: 3,
  },
  {
    path: '/buy-crypto',
    label: 'navBar.buyCrypto',
    shortLabel: 'navBar.buyCryptoShort',
    icon: <FaCreditCard />,
    main: Buy,
    category: RouteCategory.Featured,
    mobileNav: true,
    priority: 4,
    routes: assetIdPaths.map(assetIdPath => ({
      label: 'Buy Asset',
      path: assetIdPath,
      main: Buy,
    })),
  },
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
  {
    path: '/assets/:chainId/:assetSubId/transactions',
    label: 'navBar.transactions',
    main: AssetTxHistory,
    hide: true,
  },
  {
    path: '/assets/:chainId/:assetSubId/:nftId/transactions',
    label: 'navBar.transactions',
    main: AssetTxHistory,
    hide: true,
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
      ],
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
