import { Box, Flex, useMediaQuery } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import AutoScroll from 'embla-carousel-auto-scroll'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo } from 'react'

import { useTopAssets } from '../hooks/useTopAssets'
import { useTopAssetsFilters } from '../hooks/useTopAssetsFilters'
import { TopAssetCard } from './TopAssetCard'
import { TopAssetsFiltersPopover } from './TopAssetsFiltersPopover'

import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { selectHasUserEnteredAmount } from '@/state/slices/tradeInputSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

const MAX_CARD_WIDTH = 250

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
}

const slideStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  height: 'auto',
  marginLeft: 'calc(0.5rem * -1)',
}

export const TopAssetsCarousel = () => {
  const dispatch = useAppDispatch()
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)

  const shouldShow = useMemo(() => {
    return !isSmallerThanMd && !hasUserEnteredAmount
  }, [isSmallerThanMd, hasUserEnteredAmount])

  const {
    selectedCategory,
    selectedOrder,
    selectedSort,
    selectedChainId,
    categoryLabel,
    orderLabel,
    sortOptions,
    handleCategoryChange,
    handleSortOptionClick,
    handleOrderChange,
  } = useTopAssetsFilters()

  const { assets, isLoading } = useTopAssets({
    selectedCategory,
    selectedOrder,
    selectedSort,
    selectedChainId,
  })

  const isVisible = useMemo(() => {
    return assets.length > 0
  }, [assets.length])

  const autoScrollPlugin = useMemo(
    () =>
      AutoScroll({
        speed: 1,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        stopOnFocusIn: false,
        startDelay: 0,
      }),
    [],
  )

  const handleRowClick = useCallback(
    (asset: Asset) => {
      const mixpanel = getMixPanel()
      mixpanel?.track(MixPanelEvent.HighlightedTokenClicked, {
        assetId: asset.assetId,
        asset: asset.symbol,
        name: asset.name,
        category: selectedCategory,
        chainId: selectedChainId,
        order: selectedOrder,
        sort: selectedSort,
      })

      dispatch(tradeInput.actions.setBuyAsset(asset))
    },
    [dispatch, selectedCategory, selectedChainId, selectedOrder, selectedSort],
  )

  const assetsCards = useMemo(() => {
    return assets.map(asset => (
      <motion.div
        key={asset.assetId}
        className='embla__slide'
        style={{
          minWidth: 0,
          flex: '0 0 auto',
          maxWidth: `${MAX_CARD_WIDTH - 8}px`,
          position: 'relative',
          paddingLeft: '0.5rem',
        }}
        variants={cardVariants}
      >
        <TopAssetCard asset={asset} onClick={handleRowClick} />
      </motion.div>
    ))
  }, [assets, handleRowClick])

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      dragFree: true,
      align: 'start',
      slidesToScroll: 1,
    },
    [autoScrollPlugin],
  )

  useEffect(() => {
    if (!emblaApi || !shouldShow || assets.length === 0) return

    const timeoutId = requestAnimationFrame(() => {
      emblaApi.reInit()
    })

    return () => {
      cancelAnimationFrame(timeoutId)
    }
  }, [emblaApi, assets, shouldShow])

  if (!shouldShow || (assets.length === 0 && !isLoading)) return null

  return (
    <Box position='fixed' bottom={0} left={0} right={0} zIndex={1000} width='100%'>
      <Flex
        width='100%'
        bg='background.surface.raised.base'
        backdropFilter='blur(30px)'
        position='relative'
      >
        <Box className='embla' overflow='hidden' width='100%'>
          <Box
            className='embla__viewport'
            ref={shouldShow && isVisible ? emblaRef : null}
            overflow='hidden'
            width='100%'
          >
            <motion.div
              key={`carousel-${selectedCategory}-${selectedSort}-${selectedOrder}-${selectedChainId}-${assets.length}`}
              className='embla__container'
              style={slideStyle}
              variants={containerVariants}
              initial='hidden'
              animate={isVisible ? 'visible' : 'hidden'}
            >
              {assetsCards}
            </motion.div>
          </Box>
        </Box>
        <TopAssetsFiltersPopover
          isLoading={isLoading}
          selectedCategory={selectedCategory}
          selectedOrder={selectedOrder}
          selectedSort={selectedSort}
          categoryLabel={categoryLabel}
          orderLabel={orderLabel}
          sortOptions={sortOptions}
          handleCategoryChange={handleCategoryChange}
          handleSortOptionClick={handleSortOptionClick}
          handleOrderChange={handleOrderChange}
        />
      </Flex>
    </Box>
  )
}
