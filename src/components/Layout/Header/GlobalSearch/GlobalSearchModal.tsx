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
import type { Asset } from '@shapeshiftoss/types'
import { makeAsset } from '@shapeshiftoss/utils'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MultiRef from 'react-multi-ref'
import { useNavigate } from 'react-router-dom'
import scrollIntoView from 'scroll-into-view-if-needed'

import { AssetSearchResults } from './AssetSearchResults'

import { GlobalFilter } from '@/components/StakingVaults/GlobalFilter'
import { useGetCustomTokensQuery } from '@/components/TradeAssetSearch/hooks/useGetCustomTokensQuery'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { CUSTOM_TOKEN_IMPORT_SUPPORTED_CHAIN_IDS } from '@/lib/customTokenImportSupportedChainIds'
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
    const resultsCount = results.length
    const isMac = useMemo(() => /Mac/.test(navigator.userAgent), [])
    const handleClose = useCallback(() => {
      setSearchQuery('')
      onClose()
    }, [onClose])

    const { modalContentProps, overlayProps, modalProps } = useModalRegistration({
      isOpen,
      onClose: handleClose,
    })

    const { data: customTokens, isLoading: isLoadingCustomTokens } = useGetCustomTokensQuery({
      contractAddress: searchQuery,
      chainIds: CUSTOM_TOKEN_IMPORT_SUPPORTED_CHAIN_IDS,
    })

    useEffect(() => {
      if (!customTokens?.length) return

      const assetsById = selectAssets(store.getState())

      customTokens
        .filter(token => !assetsById[token.assetId])
        .forEach(token => dispatch(assetsSlice.actions.upsertAsset(makeAsset(assetsById, token))))
    }, [customTokens, dispatch])

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

    useUpdateEffect(() => {
      setActiveIndex(0)
    }, [searchQuery])

    const isSearching = useMemo(
      () => searchQuery.length > 0 || isLoadingCustomTokens,
      [searchQuery.length, isLoadingCustomTokens],
    )

    return (
      <Modal scrollBehavior='inside' {...modalProps} size='lg'>
        <ModalOverlay {...overlayProps} />
        <ModalContent overflow='hidden' data-testid='global-search-modal' {...modalContentProps}>
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
              results={results}
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
