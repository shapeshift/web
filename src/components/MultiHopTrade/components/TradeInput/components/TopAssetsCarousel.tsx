import { CheckIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Portal,
  useMediaQuery,
} from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import AutoScroll from 'embla-carousel-auto-scroll'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbAdjustmentsHorizontal } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { TopAssetCard } from './TopAssetCard'

import { isSome } from '@/lib/utils'
import { MarketsCategories } from '@/pages/Markets/constants'
import { CATEGORY_TO_QUERY_HOOK } from '@/pages/Markets/hooks/useCoingeckoData'
import { usePortalsAssetsQuery } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import { useRows } from '@/pages/Markets/hooks/useRows'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssets } from '@/state/slices/selectors'
import { selectHasUserEnteredAmount } from '@/state/slices/tradeInputSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

const TOP_ASSETS_LIMIT = 20
const CARD_WIDTH = 250

const settingsIcon = <TbAdjustmentsHorizontal />
const buttonHoverProps = { bg: 'transparent', color: 'text.base' }

type CategoryMenuItemProps = {
  category: MarketsCategories
  selectedCategory: MarketsCategories
  onCategoryChange: (category: MarketsCategories) => void
  checkedIcon: React.ReactElement
}

const CategoryMenuItem = ({
  category,
  selectedCategory,
  onCategoryChange,
  checkedIcon,
}: CategoryMenuItemProps) => {
  const translate = useTranslate()
  const handleClick = useCallback(() => {
    onCategoryChange(category)
  }, [category, onCategoryChange])

  const label = useMemo(() => {
    return category === MarketsCategories.OneClickDefi
      ? translate(`markets.categories.${category}.filterTitle`)
      : translate(`markets.categories.${category}.title`)
  }, [category, translate])

  return (
    <MenuItemOption
      value={category}
      onClick={handleClick}
      fontSize='md'
      iconPlacement='end'
      icon={checkedIcon}
      fontWeight='bold'
      color={selectedCategory === category ? 'text.primary' : 'text.subtle'}
    >
      {label}
    </MenuItemOption>
  )
}

export const TopAssetsCarousel = () => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const [isSmallerThanMd] = useMediaQuery(`(max-width: ${breakpoints.md})`, { ssr: false })
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const assetsById = useAppSelector(selectAssets)
  const [isVisible, setIsVisible] = useState(false)
  const { selectedCategory, selectedOrder, selectedSort, selectedChainId } = useAppSelector(
    preferences.selectors.selectHighlightedTokensFilters,
  )
  const rows = useRows({ limit: TOP_ASSETS_LIMIT })

  const categoryHook = useMemo(
    () =>
      selectedCategory === MarketsCategories.OneClickDefi
        ? CATEGORY_TO_QUERY_HOOK[MarketsCategories.Trending]
        : CATEGORY_TO_QUERY_HOOK[selectedCategory],
    [selectedCategory],
  )

  const { data: categoryQueryData, isLoading: isCategoryQueryDataLoading } = categoryHook({
    enabled: selectedCategory !== MarketsCategories.OneClickDefi,
    orderBy: selectedOrder,
    sortBy: selectedSort,
  })

  const { data: portalsAssets, isLoading: isPortalsAssetsLoading } = usePortalsAssetsQuery({
    chainIds:
      selectedChainId === 'all'
        ? rows[selectedCategory].supportedChainIds ?? []
        : [selectedChainId],
    enabled: selectedCategory === MarketsCategories.OneClickDefi,
    sortBy: selectedSort,
    orderBy: selectedOrder,
    minApy: '1',
  })

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

  const oneClickDefiAssets = useMemo(() => {
    if (selectedCategory !== MarketsCategories.OneClickDefi || !portalsAssets) return []

    return portalsAssets.ids
      .slice(0, TOP_ASSETS_LIMIT)
      .map(id => assetsById[id])
      .filter(isSome)
  }, [selectedCategory, portalsAssets, assetsById])

  const categoryAssets = useMemo(() => {
    if (selectedCategory === MarketsCategories.OneClickDefi || !categoryQueryData) return []

    if (selectedChainId === 'all') {
      return categoryQueryData.ids
        .slice(0, TOP_ASSETS_LIMIT)
        .map(id => assetsById[id])
        .filter(isSome)
    }

    return categoryQueryData.ids
      .filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
      .slice(0, TOP_ASSETS_LIMIT)
      .map(id => assetsById[id])
      .filter(isSome)
  }, [selectedCategory, categoryQueryData, selectedChainId, assetsById])

  const popularAssets = useMemo(() => {
    return selectedCategory === MarketsCategories.OneClickDefi ? oneClickDefiAssets : categoryAssets
  }, [oneClickDefiAssets, categoryAssets, selectedCategory])

  const handleCategoryChange = useCallback(
    (category: MarketsCategories) => {
      dispatch(preferences.actions.setHighlightedTokensSelectedCategory(category))
    },
    [dispatch],
  )

  const checkedIcon = useMemo(() => <Icon as={CheckIcon} color='blue.200' fontSize='20px' />, [])

  const categoryMenuItems = useMemo(() => {
    return (
      <MenuOptionGroup type='radio' value={selectedCategory}>
        {Object.values(MarketsCategories).map(category => (
          <CategoryMenuItem
            key={category}
            category={category}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            checkedIcon={checkedIcon}
          />
        ))}
      </MenuOptionGroup>
    )
  }, [selectedCategory, handleCategoryChange, checkedIcon])

  const shouldShow = useMemo(() => {
    return (
      !isSmallerThanMd &&
      !hasUserEnteredAmount &&
      popularAssets.length > 0 &&
      !isCategoryQueryDataLoading &&
      !isPortalsAssetsLoading
    )
  }, [
    isSmallerThanMd,
    hasUserEnteredAmount,
    popularAssets.length,
    isCategoryQueryDataLoading,
    isPortalsAssetsLoading,
  ])

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
    setIsVisible(true)
  }, [])

  useEffect(() => {
    if (!emblaApi || !shouldShow) return
    emblaApi.reInit()
  }, [emblaApi, popularAssets.length, shouldShow])

  const containerVariants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.05,
        },
      },
    }),
    [],
  )

  const cardVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.4,
          ease: 'easeOut',
        },
      },
    }),
    [],
  )

  if (!shouldShow) return null

  return (
    <Box
      position='fixed'
      bottom={0}
      left={0}
      right={0}
      zIndex={1000}
      width='100%'
      overflow='hidden'
    >
      <Flex
        width='100%'
        overflow='hidden'
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
              className='embla__container'
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                height: 'auto',
                marginLeft: 'calc(0.5rem * -1)',
              }}
              variants={containerVariants}
              initial='hidden'
              animate={isVisible ? 'visible' : 'hidden'}
            >
              {popularAssets.map(asset => (
                <motion.div
                  key={asset.assetId}
                  className='embla__slide'
                  style={{
                    minWidth: 0,
                    flex: `0 0 ${CARD_WIDTH - 8}px`,
                    position: 'relative',
                    paddingLeft: '0.5rem',
                  }}
                  variants={cardVariants}
                >
                  <TopAssetCard asset={asset} />
                </motion.div>
              ))}
            </motion.div>
          </Box>
        </Box>
        <Flex
          height='44px'
          zIndex={99}
          alignItems='center'
          justifyContent='center'
          bg='background.surface.raised.base'
          width='auto'
          aspectRatio='1/1'
        >
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label={translate('common.settings')}
              icon={settingsIcon}
              size='md'
              fontSize='xl'
              variant='ghost'
              _hover={buttonHoverProps}
              _active={buttonHoverProps}
            />
            <Portal>
              <MenuList zIndex={1001}>{categoryMenuItems}</MenuList>
            </Portal>
          </Menu>
        </Flex>
      </Flex>
    </Box>
  )
}
