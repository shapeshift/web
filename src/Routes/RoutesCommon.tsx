import { lazy } from 'react'
import { FaCreditCard, FaFlag } from 'react-icons/fa'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { TbGraph } from 'react-icons/tb'

import type { Route } from './helpers'
import { RouteCategory } from './helpers'

import { DefiIcon } from '@/components/Icons/DeFi'
import { ExploreIcon } from '@/components/Icons/Explore'
import { FoxIcon } from '@/components/Icons/FoxIcon'
import { HomeIcon } from '@/components/Icons/Home'
import { PoolsIcon } from '@/components/Icons/Pools'
import { RFOXIcon } from '@/components/Icons/RFOX'
import { SwapIcon } from '@/components/Icons/SwapIcon'
import { WalletIcon } from '@/components/Icons/WalletIcon'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { ClaimRoutePaths } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/types'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { getConfig } from '@/config'
import { assetIdPaths } from '@/hooks/useRouteAssetId/useRouteAssetId'
import { FoxPage } from '@/pages/Fox/FoxPage'
import { RFOX } from '@/pages/RFOX/RFOX'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

export const TRADE_ROUTE_ASSET_SPECIFIC =
  '/trade/:chainId/:assetSubId/:sellChainId/:sellAssetSubId/:sellAmountCryptoBaseUnit'
export const LIMIT_ORDER_ROUTE_ASSET_SPECIFIC =
  '/limit/:chainId/:assetSubId/:sellChainId/:sellAssetSubId/:sellAmountCryptoBaseUnit'

const Home = makeSuspenseful(
  lazy(() =>
    import('@/pages/Home/Home').then(({ Home }) => ({
      default: Home,
    })),
  ),
)

const Dashboard = makeSuspenseful(
  lazy(() =>
    import('@/pages/Dashboard/Dashboard').then(({ Dashboard }) => ({
      default: Dashboard,
    })),
  ),
)

const Asset = makeSuspenseful(
  lazy(() =>
    import('@/pages/Assets/Asset').then(({ Asset }) => ({
      default: Asset,
    })),
  ),
)

const Assets = makeSuspenseful(
  lazy(() =>
    import('@/pages/Assets/Assets').then(({ Assets }) => ({
      default: Assets,
    })),
  ),
)

const Buy = makeSuspenseful(
  lazy(() =>
    import('@/pages/Buy/Buy').then(({ Buy }) => ({
      default: Buy,
    })),
  ),
)

const Flags = makeSuspenseful(
  lazy(() =>
    import('@/pages/Flags/Flags').then(({ Flags }) => ({
      default: Flags,
    })),
  ),
)

const Explore = makeSuspenseful(
  lazy(() =>
    import('@/pages/Explore/Explore').then(({ Explore }) => ({
      default: Explore,
    })),
  ),
)

const StakingVaults = makeSuspenseful(
  lazy(() =>
    import('@/pages/Defi/views/StakingVaults').then(({ StakingVaults }) => ({
      default: StakingVaults,
    })),
  ),
)

const LendingPage = makeSuspenseful(
  lazy(() =>
    import('@/pages/Lending/LendingPage').then(({ LendingPage }) => ({
      default: LendingPage,
    })),
  ),
)

const PoolsPage = makeSuspenseful(
  lazy(() =>
    import('@/pages/ThorChainLP/PoolsPage').then(({ PoolsPage }) => ({
      default: PoolsPage,
    })),
  ),
)

const MarketsPage = makeSuspenseful(
  lazy(() =>
    import('@/pages/Markets/MarketsPage').then(({ MarketsPage }) => ({
      default: MarketsPage,
    })),
  ),
)

const Trade = makeSuspenseful(
  lazy(() =>
    import('@/pages/Trade/Trade').then(({ Trade }) => ({
      default: Trade,
    })),
  ),
)

/**
 * WARNING: whenever routes that contain user addresses are edited here, we need
 * to make sure that we update the tests in lib/mixpanel/helpers.test.ts and
 * the corresponding parsed routes in lib/mixpanel/helpers.ts
 *
 * THIS IS CRITICAL FOR MIXPANEL TO NOT COLLECT USER ADDRESSES
 */

export const routes: Route[] = [
  {
    path: '/home',
    label: 'navBar.home',
    icon: <HomeIcon />,
    mobileNav: true,
    hideDesktop: true,
    main: Home,
    priority: 1,
  },
  {
    path: '/trade',
    label: 'navBar.trade',
    shortLabel: 'navBar.tradeShort',
    icon: <SwapIcon />,
    mobileNav: false,
    priority: 2,
    main: Trade,
    category: RouteCategory.Featured,
    routes: [
      {
        path: TRADE_ROUTE_ASSET_SPECIFIC,
        main: Trade,
        hide: true,
      },
      {
        path: TradeRoutePaths.Confirm,
        main: Trade,
        hide: true,
      },
      {
        path: TradeRoutePaths.VerifyAddresses,
        main: Trade,
        hide: true,
      },
      {
        path: TradeRoutePaths.QuoteList,
        main: Trade,
        hide: true,
      },
      ...assetIdPaths.map<Route>(assetIdPath => ({
        path: assetIdPath,
        main: Trade,
        hide: true,
      })),
    ],
  },
  {
    path: '/markets',
    label: 'navBar.markets',
    icon: <TbGraph />,
    main: MarketsPage,
    category: RouteCategory.Featured,
    priority: 3,
    mobileNav: false,
    disable: !getConfig().VITE_FEATURE_MARKETS,
  },
  {
    path: '/buy-crypto',
    label: 'navBar.buyCrypto',
    shortLabel: 'navBar.buyCryptoShort',
    icon: <FaCreditCard />,
    main: Buy,
    category: RouteCategory.Featured,
    mobileNav: false,
    priority: 4,
    routes: assetIdPaths.map(assetIdPath => ({
      path: assetIdPath,
      main: Buy,
      hide: true,
    })),
  },
  {
    path: '/wallet',
    label: 'navBar.myWallet',
    shortLabel: 'navBar.wallet',
    icon: <WalletIcon />,
    main: Dashboard,
    category: RouteCategory.Featured,
    mobileNav: true,
    priority: 5,
  },
  {
    path: '/earn',
    label: 'defi.earn',
    icon: <DefiIcon />,
    main: StakingVaults,
    category: RouteCategory.Featured,
    mobileNav: true,
    priority: 6,
  },
  {
    path: '/explore',
    label: 'navBar.explore',
    icon: <ExploreIcon />,
    main: Explore,
    mobileNav: true,
    hideDesktop: true,
    priority: 7,
  },
  {
    path: '/rfox',
    label: 'navBar.rFOX',
    icon: <RFOXIcon />,
    mobileNav: false,
    priority: 1,
    main: RFOX,
    category: RouteCategory.Fox,
    disable: !getConfig().VITE_FEATURE_RFOX,
  },
  {
    path: '/fox',
    label: 'navBar.foxEcosystem',
    icon: <FoxIcon />,
    main: FoxPage,
    category: RouteCategory.Fox,
    priority: 2,
    mobileNav: false,
    disable: !getConfig().VITE_FEATURE_FOX_PAGE,
  },
  {
    path: '/pools',
    label: 'navBar.pools',
    icon: <PoolsIcon />,
    main: PoolsPage,
    category: RouteCategory.Thorchain,
    priority: 1,
    mobileNav: false,
    disable: !getConfig().VITE_FEATURE_THORCHAIN_LP,
  },
  {
    path: '/lending',
    label: 'navBar.lending',
    icon: <RiExchangeFundsLine />,
    main: LendingPage,
    category: RouteCategory.Thorchain,
    priority: 2,
    mobileNav: false,
    disable: !getConfig().VITE_FEATURE_THORCHAIN_LENDING,
    isViewOnly: true,
  },
  {
    path: '/assets',
    main: Assets,
    hide: true,
    routes: assetIdPaths.map(assetIdPath => ({
      path: assetIdPath,
      main: Asset,
      hide: true,
    })),
  },
  {
    path: '/flags',
    label: 'navBar.featureFlags',
    icon: <FaFlag />,
    hide:
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== getConfig().VITE_LOCAL_IP,
    main: Flags,
  },
  {
    path: '/limit',
    label: '',
    hideDesktop: true,
    main: Trade,
    routes: [
      {
        path: LIMIT_ORDER_ROUTE_ASSET_SPECIFIC,
        main: Trade,
        hide: true,
      },
      {
        path: LimitOrderRoutePaths.Confirm,
        main: Trade,
        hide: true,
      },
      {
        path: LimitOrderRoutePaths.AllowanceApproval,
        main: Trade,
        hide: true,
      },
      {
        path: LimitOrderRoutePaths.PlaceOrder,
        main: Trade,
        hide: true,
      },
      {
        path: LimitOrderRoutePaths.Orders,
        main: Trade,
        hide: true,
      },
    ],
  },
  {
    path: '/claim',
    label: '',
    hideDesktop: true,
    mobileNav: false,
    priority: 4,
    main: Trade,
    routes: [
      {
        path: ClaimRoutePaths.Confirm,
        main: Trade,
        hide: true,
      },
      {
        path: ClaimRoutePaths.Status,
        main: Trade,
        hide: true,
      },
    ],
  },
]
