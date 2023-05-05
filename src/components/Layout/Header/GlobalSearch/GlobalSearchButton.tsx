import { SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  IconButton,
  Kbd,
  List,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  useEventListener,
  useUpdateEffect,
} from '@chakra-ui/react'
import { DefiAction, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MultiRef from 'react-multi-ref'
import { useTranslate } from 'react-polyglot'
import { generatePath, useHistory, useLocation } from 'react-router'
import scrollIntoView from 'scroll-into-view-if-needed'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { SearchEmpty } from 'components/StakingVaults/SearchEmpty'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType, selectGlobalItemsFromFilter } from 'state/slices/search-selectors'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssets,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetResults } from './AssetResults/AssetResults'
import { LpResults } from './LpResults/LpResults'
import { StakingResults } from './StakingResults/StakingResults'
import { TxResults } from './TxResults/TxResults'
import { makeOpportunityRouteDetails } from './utils'

export const GlobalSeachButton = () => {
  const { isOpen, onClose, onOpen, onToggle } = useDisclosure()
  const [activeIndex, setActiveIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuNodes] = useState(() => new MultiRef<number, HTMLElement>())
  const eventRef = useRef<'mouse' | 'keyboard' | null>(null)
  const history = useHistory()
  const location = useLocation()
  const translate = useTranslate()
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
  const flatResults = useMemo(() => results.flat(), [results])
  const resultsCount = flatResults.length

  useEffect(() => {
    if (!searchQuery) setActiveIndex(0)
  }, [searchQuery])

  useEventListener('keydown', event => {
    const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.userAgent)
    const hotkey = isMac ? 'metaKey' : 'ctrlKey'
    if (event?.key?.toLowerCase() === 'k' && event[hotkey]) {
      event.preventDefault()
      isOpen ? onClose() : onOpen()
    }
  })

  const handleClick = useCallback(
    (item: GlobalSearchResult) => {
      switch (item.type) {
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
        case 'Control':
        case 'Alt':
        case 'Shift': {
          e.preventDefault()
          onToggle()
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
    [activeIndex, flatResults, handleClick, onToggle, resultsCount],
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
  const renderResults = useMemo(() => {
    return isSearching && !results?.length ? (
      <SearchEmpty searchQuery={searchQuery} />
    ) : (
      <List>
        <AssetResults
          onClick={handleClick}
          results={assetResults}
          activeIndex={activeIndex}
          startingIndex={0}
          searchQuery={searchQuery}
          menuNodes={menuNodes}
        />
        <StakingResults
          results={stakingResults}
          onClick={handleClick}
          activeIndex={activeIndex}
          startingIndex={assetResults.length}
          searchQuery={searchQuery}
          menuNodes={menuNodes}
        />
        <LpResults
          results={lpResults}
          onClick={handleClick}
          activeIndex={activeIndex}
          startingIndex={assetResults.length + stakingResults.length}
          searchQuery={searchQuery}
          menuNodes={menuNodes}
        />
        <TxResults
          results={txResults}
          onClick={handleClick}
          activeIndex={activeIndex}
          startingIndex={assetResults.length + stakingResults.length + lpResults.length}
          searchQuery={searchQuery}
          menuNodes={menuNodes}
        />
      </List>
    )
  }, [
    activeIndex,
    assetResults,
    handleClick,
    isSearching,
    lpResults,
    menuNodes,
    results?.length,
    searchQuery,
    stakingResults,
    txResults,
  ])

  return (
    <>
      <Box maxWidth='xl' width={{ base: 'auto', md: 'full' }} mr={{ base: 0, md: 'auto' }}>
        <IconButton
          display={{ base: 'flex', md: 'none' }}
          icon={<SearchIcon />}
          aria-label='Search'
          onClick={onOpen}
        />
        <Button
          variant='input'
          width='full'
          leftIcon={<SearchIcon />}
          onClick={onOpen}
          size='lg'
          fontSize='md'
          alignItems='center'
          display={{ base: 'none', md: 'flex' }}
          sx={{ svg: { width: '18px', height: '18px' } }}
        >
          {translate('common.search')}
          <Box ml='auto'>
            <Kbd>⌘</Kbd>+<Kbd>K</Kbd>
          </Box>
        </Button>
      </Box>
      <Modal scrollBehavior='inside' isOpen={isOpen} onClose={handleClose} size='lg'>
        <ModalOverlay />
        <ModalContent overflow='hidden'>
          <ModalHeader
            position='sticky'
            top={0}
            sx={{ p: 0 }}
            borderBottomWidth={1}
            borderColor='whiteAlpha.100'
          >
            <GlobalFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onKeyDown={onKeyDown}
              inputGroupProps={{ size: 'xl' }}
              borderBottomRadius={0}
              borderWidth={0}
            />
          </ModalHeader>
          <ModalBody px={0} ref={menuRef}>
            {renderResults}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
