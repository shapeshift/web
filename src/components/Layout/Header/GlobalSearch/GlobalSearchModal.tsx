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
import { fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MultiRef from 'react-multi-ref'
import { generatePath, useHistory, useLocation } from 'react-router'
import scrollIntoView from 'scroll-into-view-if-needed'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { parseAddressInput } from 'lib/address/address'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { DefiType } from 'state/slices/opportunitiesSlice/types'
import type { GlobalSearchResult, SendResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType, selectGlobalItemsFromFilter } from 'state/slices/search-selectors'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssets,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { SearchResults } from './SearchResults'
import { makeOpportunityRouteDetails } from './utils'

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
    const location = useLocation()
    const {
      state: { isConnected, isDemoWallet },
      dispatch,
    } = useWallet()

    const assets = useAppSelector(selectAssets)
    const stakingOpportunities = useAppSelector(
      selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
    )
    const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)
    const globalSearchFilter = useMemo(() => ({ searchQuery }), [searchQuery])
    const results = useAppSelector(state => selectGlobalItemsFromFilter(state, globalSearchFilter))
    const [assetResults, stakingResults, lpResults, txResults] = results
    const flatResults = useMemo(() => [...results, sendResults].flat(), [results, sendResults])
    const resultsCount = flatResults.length
    const isMac = useMemo(() => /Mac/.test(navigator.userAgent), [])

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
          // Set the fee AssetId as a default - users can select their preferred token later during the flow
          setSendResults([
            {
              type: GlobalSearchResultType.Send,
              id: getChainAdapterManager().get(chainId)!.getFeeAssetId(),
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
            send.open({ assetId, input: searchQuery })
            onToggle()
            break
          }
          case GlobalSearchResultType.Asset: {
            const url = `/assets/${item.id}`
            history.push(url)
            onToggle()
            break
          }
          case GlobalSearchResultType.LpOpportunity:
          case GlobalSearchResultType.StakingOpportunity: {
            if (!isConnected && isDemoWallet) {
              dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
              return
            }
            const data = makeOpportunityRouteDetails({
              opportunityId: item.id as OpportunityId,
              opportunityType:
                item.type === GlobalSearchResultType.StakingOpportunity
                  ? DefiType.Staking
                  : DefiType.LiquidityPool,
              action: DefiAction.Overview,
              location,
              stakingOpportunities,
              lpOpportunities,
              assets,
            })
            if (!data) return
            history.push(data)
            onToggle()
            break
          }
          case GlobalSearchResultType.Transaction: {
            const path = generatePath('/dashboard/activity/transaction/:txId', {
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
      [
        assets,
        dispatch,
        history,
        isConnected,
        isDemoWallet,
        location,
        lpOpportunities,
        onToggle,
        searchQuery,
        send,
        stakingOpportunities,
      ],
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
            handleClick(flatResults[activeIndex])
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

    const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

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
              stakingResults={stakingResults}
              lpResults={lpResults}
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
