import type { UseDisclosureReturn } from '@chakra-ui/react'
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useEventListener,
  useUpdateEffect,
} from '@chakra-ui/react'
import { captureException, setContext } from '@sentry/react'
import { fromAssetId, solanaChainId, toAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getAssetNamespaceFromChainId, makeAsset } from '@shapeshiftoss/utils'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MultiRef from 'react-multi-ref'
import { generatePath, useHistory } from 'react-router-dom'
import scrollIntoView from 'scroll-into-view-if-needed'

import { SearchResults } from './SearchResults'

import { GlobalFilter } from '@/components/StakingVaults/GlobalFilter'
import { useGetCustomTokensQuery } from '@/components/TradeAssetSearch/hooks/useGetCustomTokensQuery'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { useModal } from '@/hooks/useModal/useModal'
import { parseAddressInput } from '@/lib/address/address'
import { ALCHEMY_SDK_SUPPORTED_CHAIN_IDS } from '@/lib/alchemySdkInstance'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { isSome } from '@/lib/utils'
import { assets as assetsSlice } from '@/state/slices/assetsSlice/assetsSlice'
import type { GlobalSearchResult, SendResult } from '@/state/slices/search-selectors'
import {
  GlobalSearchResultType,
  selectGlobalItemsFromFilter,
} from '@/state/slices/search-selectors'
import { selectAssets } from '@/state/slices/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

const inputGroupProps = { size: 'xl' }
const sxProp2 = { p: 0 }

export const GlobalSearchModal = memo(
  ({
    isOpen,
    onClose,
    onOpen,
    onToggle,
  }: Pick<UseDisclosureReturn, 'isOpen' | 'onClose' | 'onOpen' | 'onToggle'>) => {
    const [sendResults, setSendResults] = useState<SendResult[]>([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const menuRef = useRef<HTMLDivElement>(null)
    const [menuNodes] = useState(() => new MultiRef<number, HTMLElement>())
    const eventRef = useRef<'mouse' | 'keyboard' | null>(null)
    const history = useHistory()
    const dispatch = useAppDispatch()
    const mixpanel = getMixPanel()
    const globalSearchFilter = useMemo(() => ({ searchQuery }), [searchQuery])
    const results = useAppSelector(state => selectGlobalItemsFromFilter(state, globalSearchFilter))
    const [assetResults, txResults] = results
    const flatResults = useMemo(() => [...results, sendResults].flat(), [results, sendResults])
    const resultsCount = flatResults.length
    const isMac = useMemo(() => /Mac/.test(navigator.userAgent), [])

    const customTokenSupportedChainIds = useMemo(() => {
      // Solana _is_ supported by Alchemy, but not by the SDK
      return [...ALCHEMY_SDK_SUPPORTED_CHAIN_IDS, solanaChainId]
    }, [])

    const { data: customTokens, isLoading: isLoadingCustomTokens } = useGetCustomTokensQuery({
      contractAddress: searchQuery,
      chainIds: customTokenSupportedChainIds,
    })

    const customAssets = useMemo(() => {
      if (!customTokens?.length) return []

      // Do not move me to a regular useSelector(), as this is reactive on the *whole* assets set and would make this component extremely reactive for no reason
      const assetsById = selectAssets(store.getState())

      const assets = customTokens
        .map(metaData => {
          if (!metaData) return null
          const { name, symbol, decimals, logo, chainId, contractAddress } = metaData

          if (!name || !symbol || !decimals) return null

          const assetId = toAssetId({
            chainId,
            assetNamespace: getAssetNamespaceFromChainId(chainId as KnownChainIds),
            assetReference: contractAddress,
          })

          const minimalAsset = {
            assetId,
            name,
            symbol,
            precision: decimals,
            icon: logo ?? undefined,
          }

          return makeAsset(assetsById, minimalAsset)
        })
        .filter(isSome)

      return assets
    }, [customTokens])

    useEffect(() => {
      customAssets.forEach(asset => {
        // Do not move me to a regular useSelector(), as this is reactive on the *whole* assets set and would make this component extremely reactive for no reason
        const assetsById = selectAssets(store.getState())

        if (!assetsById[asset.assetId]) {
          dispatch(assetsSlice.actions.upsertAsset(asset))
        }
      })
    }, [customAssets, dispatch])

    const send = useModal('send')
    useEffect(() => {
      if (!searchQuery) setActiveIndex(0)
    }, [searchQuery])

    useEventListener('keydown', event => {
      const hotkey = isMac ? 'metaKey' : 'ctrlKey'
      if (event?.key?.toLowerCase() === 'k' && event[hotkey]) {
        event.preventDefault()
        isOpen ? onClose() : onOpen()
      }
    })

    useEffect(() => {
      if (!searchQuery?.length) return

      setSendResults([])
      ;(async () => {
        const parsed = await parseAddressInput({ urlOrAddress: searchQuery })
        if (parsed) {
          const { chainId, address, vanityAddress } = parsed
          const adapter = getChainAdapterManager().get(chainId)
          if (!adapter) throw new Error(`No adapter found for chainId ${chainId}`)

          // Set the fee AssetId as a default - users can select their preferred token later during the flow
          setSendResults([
            {
              type: GlobalSearchResultType.Send,
              id: adapter.getFeeAssetId(),
              address,
              vanityAddress,
            },
          ])
        }
      })()
    }, [searchQuery])

    const handleClick = useCallback(
      (item: GlobalSearchResult) => {
        switch (item.type) {
          case GlobalSearchResultType.Send: {
            // We don't want to pre-select the asset for EVM ChainIds
            const assetId = !isEvmChainId(fromAssetId(item.id).chainId) ? item.id : undefined
            mixpanel?.track(MixPanelEvent.SendClick)
            send.open({ assetId, input: searchQuery })
            onToggle()
            break
          }
          case GlobalSearchResultType.Asset: {
            // Reset the sell amount to zero, since we may be coming from a different sell asset in regular swapper
            dispatch(tradeInput.actions.setSellAmountCryptoPrecision('0'))
            const url = `/assets/${item.id}`
            history.push(url)
            onToggle()
            break
          }
          case GlobalSearchResultType.Transaction: {
            const path = generatePath('/wallet/activity/transaction/:txId', {
              txId: item.id,
            })
            history.push(path)
            onToggle()
            break
          }
          default:
            break
        }
      },
      [mixpanel, send, searchQuery, onToggle, dispatch, history],
    )

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        eventRef.current = 'keyboard'
        switch (e.key) {
          case 'ArrowDown': {
            e.preventDefault()
            if (activeIndex && activeIndex === resultsCount - 1) {
              setActiveIndex(0)
            } else {
              setActiveIndex((activeIndex ?? -1) + 1)
            }
            break
          }
          case 'ArrowUp': {
            e.preventDefault()
            if (!activeIndex) {
              setActiveIndex(resultsCount - 1)
            } else {
              setActiveIndex(activeIndex - 1)
            }
            break
          }
          case 'Enter': {
            e.preventDefault()
            e.stopPropagation()
            const item = flatResults[activeIndex]
            if (!item) {
              setContext('flatResults', { flatResults })
              setContext('activeIndex', { activeIndex })
              captureException(new Error(`No item found for index ${activeIndex}`))
              return
            }
            handleClick(item)
            break
          }
          default:
            break
        }
      },
      [activeIndex, flatResults, handleClick, resultsCount],
    )

    useUpdateEffect(() => {
      if (!menuRef.current || eventRef.current === 'mouse') return
      const node = menuNodes.map.get(activeIndex)
      if (!node) return
      scrollIntoView(node, {
        scrollMode: 'if-needed',
        block: 'nearest',
        inline: 'nearest',
        boundary: menuRef.current,
      })
    }, [activeIndex])

    useEffect(() => {
      if (isOpen && searchQuery.length > 0) {
        setSearchQuery('')
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const handleClose = useCallback(() => {
      setSearchQuery('')
      onClose()
    }, [onClose])

    useUpdateEffect(() => {
      setActiveIndex(0)
    }, [searchQuery])

    const isSearching = useMemo(
      () => searchQuery.length > 0 || isLoadingCustomTokens,
      [searchQuery.length, isLoadingCustomTokens],
    )

    return (
      <Modal scrollBehavior='inside' isOpen={isOpen} onClose={handleClose} size='lg'>
        <ModalOverlay />
        <ModalContent overflow='hidden'>
          <ModalHeader
            position='sticky'
            top={0}
            sx={sxProp2}
            borderBottomWidth={1}
            borderColor='whiteAlpha.100'
          >
            <GlobalFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onKeyDown={onKeyDown}
              inputGroupProps={inputGroupProps}
              borderBottomRadius={0}
              borderWidth={0}
            />
          </ModalHeader>
          <ModalBody px={0} ref={menuRef}>
            <SearchResults
              assetResults={assetResults}
              txResults={txResults}
              sendResults={sendResults}
              activeIndex={activeIndex}
              searchQuery={searchQuery}
              isSearching={isSearching}
              onClickResult={handleClick}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    )
  },
)
