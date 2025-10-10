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
import { solanaChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import { getAssetNamespaceFromChainId, makeAsset } from '@shapeshiftoss/utils'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MultiRef from 'react-multi-ref'
import { useNavigate } from 'react-router-dom'
import scrollIntoView from 'scroll-into-view-if-needed'

import { AssetSearchResults } from './AssetSearchResults'

import { GlobalFilter } from '@/components/StakingVaults/GlobalFilter'
import { useGetCustomTokensQuery } from '@/components/TradeAssetSearch/hooks/useGetCustomTokensQuery'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { ALCHEMY_SDK_SUPPORTED_CHAIN_IDS } from '@/lib/alchemySdkInstance'
import { isSome } from '@/lib/utils'
import { assets as assetsSlice } from '@/state/slices/assetsSlice/assetsSlice'
import { selectAssets, selectAssetsBySearchQuery } from '@/state/slices/selectors'
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
    const [activeIndex, setActiveIndex] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const menuRef = useRef<HTMLDivElement>(null)
    const [menuNodes] = useState(() => new MultiRef<number, HTMLElement>())
    const eventRef = useRef<'mouse' | 'keyboard' | null>(null)
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const searchFilter = useMemo(() => ({ searchQuery, limit: 10 }), [searchQuery])
    const results = useAppSelector(state => selectAssetsBySearchQuery(state, searchFilter))
    const assetResults = results
    const resultsCount = results.length
    const isMac = useMemo(() => /Mac/.test(navigator.userAgent), [])
    const { modalStyle, overlayStyle, isHighestModal } = useModalRegistration({
      isOpen,
      modalId: 'global-search-modal',
    })

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

    useEffect(() => {
      if (!searchQuery) setActiveIndex(0)
    }, [searchQuery])

    useEventListener(document, 'keydown', event => {
      const hotkey = isMac ? 'metaKey' : 'ctrlKey'
      if (event?.key?.toLowerCase() === 'k' && event[hotkey]) {
        event.preventDefault()
        isOpen ? onClose() : onOpen()
      }
    })

    const handleClick = useCallback(
      (asset: Asset) => {
        // Reset the sell amount to zero, since we may be coming from a different sell asset in regular swapper
        dispatch(tradeInput.actions.setSellAmountCryptoPrecision('0'))
        const url = `/assets/${asset.assetId}`
        navigate(url)
        onToggle()
      },
      [onToggle, dispatch, navigate],
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
            const item = results[activeIndex]
            if (!item) {
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
      [activeIndex, handleClick, resultsCount, results],
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
      <Modal
        scrollBehavior='inside'
        isOpen={isOpen}
        onClose={handleClose}
        size='lg'
        trapFocus={isHighestModal}
        blockScrollOnMount={isHighestModal}
      >
        <ModalOverlay {...overlayStyle} />
        <ModalContent overflow='hidden' containerProps={modalStyle}>
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
            <AssetSearchResults
              results={assetResults}
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
