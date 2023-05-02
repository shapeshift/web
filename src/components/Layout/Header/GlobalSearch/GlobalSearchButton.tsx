import { SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Kbd,
  List,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  useEventListener,
} from '@chakra-ui/react'
import { DefiAction, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory, useLocation } from 'react-router'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType, selectGlobalItemsFromFilter } from 'state/slices/search-selectors'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetResults } from './AssetResults'
import { LpResults } from './LpResults/LpResults'
import { StakingResults } from './StakingResults/StakingResults'
import { GoToOpportunity } from './utils'

export const GlobalSeachButton = () => {
  const { isOpen, onClose, onOpen, onToggle } = useDisclosure()
  const [activeIndex, setActiveIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()

  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )
  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)
  const results = useAppSelector(state =>
    selectGlobalItemsFromFilter(state, {
      searchQuery,
    }),
  )

  const assetResults = useMemo(() => {
    return results.filter(result => result.type === GlobalSearchResultType.Asset)
  }, [results])

  const stakingResults = useMemo(() => {
    return results.filter(result => result.type === GlobalSearchResultType.StakingOpportunity)
  }, [results])

  const lpResults = useMemo(() => {
    return results.filter(result => result.type === GlobalSearchResultType.LpOpportunity)
  }, [results])

  useEffect(() => {
    if (!searchQuery) setActiveIndex(0)
  }, [searchQuery])

  useEventListener('keydown', event => {
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator?.platform)
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
          const data = GoToOpportunity({
            opportunityId: item.id,
            opportunityType:
              item.type === GlobalSearchResultType.StakingOpportunity
                ? DefiType.Staking
                : DefiType.LiquidityPool,
            action: DefiAction.Overview,
            location,
            stakingOpportunities,
            lpOpportunities,
          })
          if (!data) return
          history.push(data)
          onToggle()
          break
        }
        default:
          break
      }
    },
    [
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
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          if (activeIndex && activeIndex === results.length - 1) {
            setActiveIndex(0)
          } else {
            setActiveIndex((activeIndex ?? -1) + 1)
          }
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          if (!activeIndex) {
            setActiveIndex(results.length - 1)
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
          handleClick(results[activeIndex])
          break
        }
        default:
          break
      }
    },
    [activeIndex, handleClick, onToggle, results],
  )

  return (
    <>
      <Box maxWidth='xl' width='full'>
        <Button
          variant='input'
          width='full'
          display='flex'
          leftIcon={<SearchIcon />}
          onClick={onOpen}
          size='lg'
          fontSize='md'
          alignItems='center'
          sx={{ svg: { width: '18px', height: '18px' } }}
        >
          Search
          <Box ml='auto'>
            <Kbd>⌘</Kbd>+<Kbd>K</Kbd>
          </Box>
        </Button>
      </Box>
      <Modal scrollBehavior='inside' isOpen={isOpen} onClose={onClose} size='lg'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader position='sticky' top={0}>
            <GlobalFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onKeyDown={onKeyDown}
            />
          </ModalHeader>
          <ModalBody px={0}>
            <List>
              <AssetResults
                onClick={handleClick}
                results={assetResults}
                activeIndex={activeIndex}
                startingIndex={0}
              />
              <StakingResults
                results={stakingResults}
                onClick={handleClick}
                activeIndex={activeIndex}
                startingIndex={assetResults.length}
              />
              <LpResults
                results={lpResults}
                onClick={handleClick}
                activeIndex={activeIndex}
                startingIndex={assetResults.length + stakingResults.length}
              />
            </List>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
