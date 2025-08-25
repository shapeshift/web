import { TimeIcon } from '@chakra-ui/icons'
import { lazy } from 'react'
import { FaCreditCard, FaFlag } from 'react-icons/fa'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { TbGraph } from 'react-icons/tb'

import type { Route } from './helpers'
import { RouteCategory } from './helpers'

import { ExploreIcon } from '@/components/Icons/Explore'
import { FoxIcon } from '@/components/Icons/FoxIcon'
import { HomeIcon } from '@/components/Icons/Home'
import { PoolsIcon } from '@/components/Icons/Pools'
import { RFOXIcon } from '@/components/Icons/RFOX'
import { SwapIcon } from '@/components/Icons/SwapIcon'
import { TCYIcon } from '@/components/Icons/TCYIcon'
import { WalletIcon } from '@/components/Icons/WalletIcon'
import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { ClaimRoutePaths } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/types'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { getConfig } from '@/config'
import { assetIdPaths } from '@/hooks/useRouteAssetId/useRouteAssetId'
import { Accounts } from '@/pages/Accounts/Accounts'
import { ExploreCategory } from '@/pages/Explore/ExploreCategory'
import { FoxPage } from '@/pages/Fox/FoxPage'
import { History } from '@/pages/History/History'
import { RFOX } from '@/pages/RFOX/RFOX'
import { TCYNavIndicator } from '@/pages/TCY/components/TCYNavIndicator'
import { TCY } from '@/pages/TCY/tcy'
import { ClaimTab } from '@/pages/Trade/tabs/ClaimTab'
import { LimitTab } from '@/pages/Trade/tabs/LimitTab'
import { TradeTab } from '@/pages/Trade/tabs/TradeTab'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

export const TRADE_ROUTE_ASSET_SPECIFIC =
  '/trade/:chainId/:assetSubId/:sellChainId/:sellAssetSubId/:sellAmountCryptoBaseUnit'
export const LIMIT_ORDER_ROUTE_ASSET_SPECIFIC =
  '/limit/:chainId/:assetSubId/:sellChainId/:sellAssetSubId/:sellAmountCryptoBaseUnit/:limitPriceMode/:limitPriceDirection/:limitPrice'

const Dashboard = makeSuspenseful(
  lazy(() =>
    import('@/pages/Dashboard/Dashboard').then(({ Dashboard }) => ({
      default: Dashboard,
    })),
  ),
  {},
  true,
)

const Asset = makeSuspenseful(
  lazy(() =>
    import('@/pages/Assets/Asset').then(({ Asset }) => ({
      default: Asset,
    })),
  ),
  {},
  true,
)

const Assets = makeSuspenseful(
  lazy(() =>
    import('@/pages/Assets/Assets').then(({ Assets }) => ({
      default: Assets,
    })),
  ),
  {},
  true,
)

const Buy = makeSuspenseful(
  lazy(() =>
    import('@/pages/Buy/Buy').then(({ Buy }) => ({
      default: Buy,
    })),
  ),
  {},
  true,
)

const Flags = makeSuspenseful(
  lazy(() =>
    import('@/pages/Flags/Flags').then(({ Flags }) => ({
      default: Flags,
    })),
  ),
  {},
  true,
)

const Explore = makeSuspenseful(
  lazy(() =>
    import('@/pages/Explore/Explore').then(({ Explore }) => ({
      default: Explore,
    })),
  ),
  {},
  true,
)

const LendingPage = makeSuspenseful(
  lazy(() =>
    import('@/pages/Lending/LendingPage').then(({ LendingPage }) => ({
      default: LendingPage,
    })),
  ),
  {},
  true,
)

const PoolsPage = makeSuspenseful(
  lazy(() =>
    import('@/pages/ThorChainLP/PoolsPage').then(({ PoolsPage }) => ({
      default: PoolsPage,
    })),
  ),
  {},
  true,
)

const MarketsPage = makeSuspenseful(
  lazy(() =>
    import('@/pages/Markets/MarketsPage').then(({ MarketsPage }) => ({
      default: MarketsPage,
    })),
  ),
  {},
  true,
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
    path: '/wallet/*',
    label: 'navBar.home',
    shortLabel: 'navBar.home',
    icon: <HomeIcon />,
    main: Dashboard,
    category: RouteCategory.Featured,
    mobileNav: true,
    hideDesktop: true,
    priority: 1,
  },
  {
    path: '/accounts/*',
    label: 'navBar.myWallet',
    shortLabel: 'navBar.wallet',
    icon: <WalletIcon />,
    main: Accounts,
    category: RouteCategory.Featured,
    mobileNav: false,
    priority: 5,
    hide: true,
  },
  {
    path: '/wallet/*',
    label: 'navBar.myWallet',
    shortLabel: 'navBar.wallet',
    icon: <WalletIcon />,
    main: Dashboard,
    category: RouteCategory.Featured,
    mobileNav: false,
    priority: 5,
  },
  {
    path: '/history',
    label: 'navBar.history',
    icon: <TimeIcon />,
    mobileNav: true,
    hideDesktop: true,
    main: History,
    priority: 7,
  },
  {
    path: '/trade/*',
    label: 'navBar.trade',
    shortLabel: 'navBar.tradeShort',
    icon: <SwapIcon />,
    mobileNav: true,
    priority: 2,
    main: TradeTab,
    category: RouteCategory.Featured,
    relatedPaths: ['/trade', '/limit', '/claim'],
    routes: [
      {
        path: TRADE_ROUTE_ASSET_SPECIFIC,
        main: TradeTab,
        hide: true,
      },
      {
        path: TradeRoutePaths.Confirm,
        main: TradeTab,
        hide: true,
      },
      {
        path: TradeRoutePaths.VerifyAddresses,
        main: TradeTab,
        hide: true,
      },
      {
        path: TradeRoutePaths.QuoteList,
        main: TradeTab,
        hide: true,
      },
      ...assetIdPaths.map<Route>(assetIdPath => ({
        path: assetIdPath,
        main: TradeTab,
        hide: true,
      })),
    ],
  },
  {
    path: '/markets/*',
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
    path: '/explore',
    label: 'navBar.explore',
    icon: <ExploreIcon />,
    main: Explore,
    mobileNav: true,
    hideDesktop: true,
    priority: 7,
    routes: [
      {
        path: 'category/:category',
        main: ExploreCategory,
        hide: true,
      },
      {
        path: 'category/:category/:tag',
        main: ExploreCategory,
        hide: true,
      },
    ],
  },
  {
    path: '/rfox/*',
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
    priority: 6,
    mobileNav: false,
    disable: !getConfig().VITE_FEATURE_FOX_PAGE,
  },
  {
    path: '/tcy/*',
    label: 'navBar.tcy',
    icon: <TCYIcon />,
    main: TCY,
    category: RouteCategory.Thorchain,
    disable: !getConfig().VITE_FEATURE_THORCHAIN_TCY,
    menuRightComponent: <TCYNavIndicator />,
  },
  {
    path: '/pools/*',
    label: 'navBar.pools',
    icon: <PoolsIcon />,
    main: PoolsPage,
    category: RouteCategory.Thorchain,
    priority: 1,
    mobileNav: false,
    disable: !getConfig().VITE_FEATURE_THORCHAIN_LP,
  },
  {
    path: '/lending/*',
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
    hide: window.location.hostname !== 'localhost',
    main: Flags,
  },
  {
    path: '/limit/*',
    label: '',
    hideDesktop: true,
    main: LimitTab,
    routes: [
      {
        path: LIMIT_ORDER_ROUTE_ASSET_SPECIFIC,
        main: LimitTab,
        hide: true,
      },
      {
        path: LimitOrderRoutePaths.Confirm,
        main: LimitTab,
        hide: true,
      },
      {
        path: LimitOrderRoutePaths.AllowanceApproval,
        main: LimitTab,
        hide: true,
      },
      {
        path: LimitOrderRoutePaths.PlaceOrder,
        main: LimitTab,
        hide: true,
      },
      {
        path: LimitOrderRoutePaths.Orders,
        main: LimitTab,
        hide: true,
      },
    ],
  },
  {
    path: '/claim/*',
    label: '',
    hideDesktop: true,
    mobileNav: false,
    priority: 4,
    main: ClaimTab,
    routes: [
      {
        path: ClaimRoutePaths.Confirm,
        main: ClaimTab,
        hide: true,
      },
      {
        path: ClaimRoutePaths.Status,
        main: ClaimTab,
        hide: true,
      },
    ],
  },
]
