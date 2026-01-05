import { usePrevious, useToast } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { btcAssetId, ethAssetId, foxAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import type { LedgerOpenAppEventArgs } from '@shapeshiftoss/chain-adapters'
import { emitter } from '@shapeshiftoss/chain-adapters'
import { useQuery } from '@tanstack/react-query'
import difference from 'lodash/difference'
import React, { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useDiscoverAccounts } from './hooks/useDiscoverAccounts'
import { usePortfolioFetch } from './hooks/usePortfolioFetch'
import { useSnapStatusHandler } from './hooks/useSnapStatusHandler'

import { DEFAULT_HISTORY_TIMEFRAME } from '@/constants/Config'
import { LanguageTypeEnum } from '@/constants/LanguageTypeEnum'
import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { useActionCenterSubscribers } from '@/hooks/useActionCenterSubscribers/useActionCenterSubscribers'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useLedgerConnectionState } from '@/hooks/useLedgerConnectionState'
import { useMixpanelPortfolioTracking } from '@/hooks/useMixpanelPortfolioTracking/useMixpanelPortfolioTracking'
import { useModal } from '@/hooks/useModal/useModal'
import { useRouteAssetId } from '@/hooks/useRouteAssetId/useRouteAssetId'
import { useTransactionsSubscriber } from '@/hooks/useTransactionsSubscriber'
import { useUser } from '@/hooks/useUser/useUser'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { getAssetService, initAssetService } from '@/lib/asset-service'
import {
  useDeltaMarketDataQuery,
  useFiatMarketDataQuery,
  useSingleAssetMarketDataQuery,
  useTopMarketDataQuery,
} from '@/lib/graphql/queries'
import { useGetFiatRampsQuery } from '@/state/apis/fiatRamps/fiatRamps'
import { assets } from '@/state/slices/assetsSlice/assetsSlice'
import { limitOrderInput } from '@/state/slices/limitOrderInputSlice/limitOrderInputSlice'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAccountIdsByChainId,
  selectAssetIds,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
  selectWalletId,
} from '@/state/slices/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

/**
 * note - be super careful playing with this component, as it's responsible for asset,
 * market data, and portfolio fetching, and we don't want to over or under fetch data,
 * from unchained, market apis, or otherwise. it's optimized such that it won't unnecessarily render
 *
 * e.g. unintentionally clearing the portfolio can create obscure bugs that don't manifest
 * for some time as reselect does a really good job of memoizing things
 *
 */

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const toast = useToast()
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const { supportedChains } = usePlugins()
  const { isLoadingLocalWallet, modal, wallet, isConnected } = useWallet().state
  const assetIds = useAppSelector(selectAssetIds)
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)
  const portfolioAssetIds = useAppSelector(selectPortfolioAssetIds)
  const walletId = useAppSelector(selectWalletId)
  const prevWalletId = usePrevious(walletId)
  const routeAssetId = useRouteAssetId()
  const { isSnapInstalled } = useIsSnapInstalled()
  const { close: closeModal, open: openModal } = useModal('ledgerOpenApp')

  // Previously <TransactionsProvider />
  useTransactionsSubscriber()
  useActionCenterSubscribers()
  useSnapStatusHandler()
  // Handle Ledger device connection state and wallet disconnection
  useLedgerConnectionState()

  // Initialize user system
  useUser()

  // Initialize asset service and populate Redux with assets
  const { isError: isAssetServiceError } = useQuery({
    queryKey: ['assetService'],
    queryFn: async () => {
      await initAssetService()
      const service = getAssetService()

      dispatch(
        assets.actions.upsertAssets({
          byId: service.assetsById,
          ids: service.assetIds,
        }),
      )
      dispatch(assets.actions.setRelatedAssetIndex(service.relatedAssetIndex))

      const btcAsset = service.assetsById[btcAssetId]
      const ethAsset = service.assetsById[ethAssetId]
      if (btcAsset && ethAsset) {
        dispatch(tradeInput.actions.setBuyAsset(btcAsset))
        dispatch(tradeInput.actions.setSellAsset(ethAsset))
        dispatch(tradeRampInput.actions.setBuyAsset(btcAsset))
        dispatch(tradeRampInput.actions.setSellAsset(ethAsset))
      }

      const foxAsset = service.assetsById[foxAssetId]
      const usdcAsset = service.assetsById[usdcAssetId]
      if (foxAsset && usdcAsset) {
        dispatch(limitOrderInput.actions.setBuyAsset(foxAsset))
        dispatch(limitOrderInput.actions.setSellAsset(usdcAsset))
      }

      return null
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })

  // Show error toast if asset loading fails
  useEffect(() => {
    if (isAssetServiceError) {
      toast({
        position: 'top-right',
        title: translate('common.somethingWentWrong'),
        description: translate('common.somethingWentWrongBody'),
        status: 'error',
        duration: null,
        isClosable: true,
      })
    }
  }, [isAssetServiceError, toast, translate])

  useEffect(() => {
    const handleLedgerOpenApp = ({ chainId, reject }: LedgerOpenAppEventArgs) => {
      const onCancel = () => {
        closeModal()
        reject()
      }

      openModal({ chainId, onCancel })
    }

    const handleLedgerAppOpened = () => {
      closeModal()
    }

    emitter.on('LedgerOpenApp', handleLedgerOpenApp)
    emitter.on('LedgerAppOpened', handleLedgerAppOpened)

    return () => {
      emitter.off('LedgerOpenApp', handleLedgerOpenApp)
      emitter.off('LedgerAppOpened', handleLedgerAppOpened)
    }
    // Empty deps array intentional - event listeners are global via EventEmitter.
    // They should register once on AppProvider mount and remain stable throughout app lifecycle.
    // The handlers capture closeModal/openModal but these are stable functions from ModalProvider.
    // Re-registering listeners on every render was causing the Ledger app gate flakiness (issue #11492).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // track anonymous portfolio
  useMixpanelPortfolioTracking()

  const topMarketDataQuery = useTopMarketDataQuery({
    enabled: !modal,
  })

  useDiscoverAccounts()
  usePortfolioFetch()

  useGetFiatRampsQuery()

  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  useEffect(() => {
    if (selectedLocale in LanguageTypeEnum) {
      void import(`dayjs/locale/${selectedLocale}.js`)
    }
  }, [selectedLocale])

  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)

  useEffect(() => {
    if (!wallet) return
    const walletSupportedChainIds = supportedChains.filter(chainId => {
      return walletSupportsChain({
        chainId,
        wallet,
        isSnapInstalled,
        checkConnectedAccountIds: false, // don't check connected account ids, we're detecting initial runtime support for chains
      })
    })
    dispatch(portfolio.actions.setWalletSupportedChainIds(walletSupportedChainIds))
  }, [accountIdsByChainId, dispatch, isSnapInstalled, wallet, supportedChains])

  useEffect(() => {
    if (portfolioLoadingStatus === 'loading') return
    if (!isConnected) return
  }, [dispatch, isConnected, portfolioLoadingStatus])

  // Resets the sell and buy asset AccountIDs on wallet change to that we don't get stale trade input account selections while we're loading the new wallet
  useEffect(() => {
    if (!prevWalletId) return
    if (walletId === prevWalletId) return

    dispatch(tradeInput.actions.setSellAccountId(undefined))
    dispatch(tradeInput.actions.setBuyAccountId(undefined))
  }, [dispatch, prevWalletId, walletId])

  const deltaAssetIds = useMemo(() => {
    if (!(isConnected || (portfolioLoadingStatus !== 'loading' && !modal && !isLoadingLocalWallet)))
      return []
    if (topMarketDataQuery.isPending) return []
    if (!topMarketDataQuery.data) return []

    const topAssetIds = Object.keys(topMarketDataQuery.data) as AssetId[]
    return difference(portfolioAssetIds, topAssetIds)
  }, [
    topMarketDataQuery.isPending,
    topMarketDataQuery.data,
    isConnected,
    isLoadingLocalWallet,
    modal,
    portfolioAssetIds,
    portfolioLoadingStatus,
  ])

  useDeltaMarketDataQuery({
    assetIds: deltaAssetIds,
    enabled:
      deltaAssetIds.length > 0 &&
      (isConnected || (portfolioLoadingStatus !== 'loading' && !modal && !isLoadingLocalWallet)),
  })

  const currency = useAppSelector(preferences.selectors.selectSelectedCurrency)

  const { isError: isFiatError } = useFiatMarketDataQuery({
    symbol: currency,
    timeframe: DEFAULT_HISTORY_TIMEFRAME,
    enabled: currency !== 'USD',
  })

  useEffect(() => {
    if (!isFiatError) return
    toast({
      position: 'top-right',
      title: translate('multiCurrency.toast.title', { symbol: currency }),
      description: translate('multiCurrency.toast.description'),
      status: 'error',
      duration: null,
      isClosable: true,
    })
    dispatch(preferences.actions.setSelectedCurrency({ currency: 'USD' }))
  }, [currency, dispatch, isFiatError, toast, translate])

  useSingleAssetMarketDataQuery({
    assetId: routeAssetId,
    enabled: Boolean(routeAssetId),
  })

  // If the assets aren't loaded, then the app isn't ready to render
  // This fixes issues with refreshes on pages that expect assets to already exist
  return <>{Boolean(assetIds.length) && children}</>
}
