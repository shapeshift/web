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
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  useMediaQuery,
} from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import AutoScroll from 'embla-carousel-auto-scroll'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbAdjustmentsHorizontal } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { TopAssetCard } from './TopAssetCard'

import { OrderDirection } from '@/components/OrderDropdown/types'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import { RawText, Text } from '@/components/Text'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { isSome } from '@/lib/utils'
import { MarketsCategories, sortOptionsByCategory } from '@/pages/Markets/constants'
import { CATEGORY_TO_QUERY_HOOK } from '@/pages/Markets/hooks/useCoingeckoData'
import { usePortalsAssetsQuery } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import { useRows } from '@/pages/Markets/hooks/useRows'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssets } from '@/state/slices/selectors'
import { selectHasUserEnteredAmount } from '@/state/slices/tradeInputSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

const TOP_ASSETS_LIMIT = 20
const MAX_CARD_WIDTH = 250

const buttonHoverProps = { bg: 'transparent', color: 'text.base' }
const settingsIcon = <TbAdjustmentsHorizontal />
const checkedIcon = <Icon as={CheckIcon} color='blue.200' fontSize='20px' />
const menuButtonHoverProps = { bg: 'background.surface.raised.hover' }

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
      fontSize='sm'
      iconPlacement='end'
      icon={checkedIcon}
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
  const { selectedCategory, selectedOrder, selectedSort, selectedChainId } = useAppSelector(
    preferences.selectors.selectHighlightedTokensFilters,
  )
  const rows = useRows({ limit: TOP_ASSETS_LIMIT })

  const shouldShow = useMemo(() => {
    return !isSmallerThanMd && !hasUserEnteredAmount
  }, [isSmallerThanMd, hasUserEnteredAmount])

  const [isVisible, setIsVisible] = useState(false)

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
    const isLoading =
      selectedCategory === MarketsCategories.OneClickDefi
        ? isPortalsAssetsLoading
        : isCategoryQueryDataLoading

    if (isLoading) return []

    return selectedCategory === MarketsCategories.OneClickDefi ? oneClickDefiAssets : categoryAssets
  }, [
    oneClickDefiAssets,
    categoryAssets,
    selectedCategory,
    isPortalsAssetsLoading,
    isCategoryQueryDataLoading,
  ])

  const handleCategoryChange = useCallback(
    (category: MarketsCategories) => {
      dispatch(preferences.actions.setHighlightedTokensSelectedCategory(category))

      switch (category) {
        case MarketsCategories.TopMovers:
          dispatch(
            preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.PriceChange),
          )
          break
        case MarketsCategories.OneClickDefi:
          dispatch(preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.Apy))
          break
        case MarketsCategories.MarketCap:
          dispatch(preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.MarketCap))
          break
        case MarketsCategories.TradingVolume:
          dispatch(preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.Volume))
          break
        case MarketsCategories.RecentlyAdded:
          dispatch(preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.MarketCap))
          break
        default:
          dispatch(
            preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.PriceChange),
          )
          break
      }
    },
    [dispatch],
  )

  const handleSortChange = useCallback(
    (sort: SortOptionsKeys) => {
      dispatch(preferences.actions.setHighlightedTokensSelectedSort(sort))
    },
    [dispatch],
  )

  const handleOrderChange = useCallback(
    (order: OrderDirection) => {
      dispatch(preferences.actions.setHighlightedTokensSelectedOrder(order))
    },
    [dispatch],
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

  const popularAssetsCards = useMemo(() => {
    return popularAssets.map(asset => (
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
  }, [popularAssets, handleRowClick])

  const categoryLabel = useMemo(() => {
    return selectedCategory === MarketsCategories.OneClickDefi
      ? translate(`markets.categories.${selectedCategory}.filterTitle`)
      : translate(`markets.categories.${selectedCategory}.title`)
  }, [selectedCategory, translate])

  const orderLabel = useMemo(() => {
    return translate(
      selectedOrder === OrderDirection.Ascending ? 'common.ascending' : 'common.descending',
    )
  }, [selectedOrder, translate])

  const sortOptions = useMemo(() => {
    return sortOptionsByCategory[selectedCategory]
  }, [selectedCategory])

  const handleSortOptionClick = useCallback(
    (sortOption: SortOptionsKeys) => () => {
      handleSortChange(sortOption)
    },
    [handleSortChange],
  )

  const handleOrderDescendingClick = useCallback(() => {
    handleOrderChange(OrderDirection.Descending)
  }, [handleOrderChange])

  const handleOrderAscendingClick = useCallback(() => {
    handleOrderChange(OrderDirection.Ascending)
  }, [handleOrderChange])

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
    if (popularAssets.length === 0) {
      setIsVisible(false)
    } else {
      setIsVisible(true)
    }
  }, [popularAssets.length, selectedCategory, selectedSort, selectedOrder, selectedChainId])

  useEffect(() => {
    if (!emblaApi || !shouldShow || popularAssets.length === 0) return

    const timeoutId = requestAnimationFrame(() => {
      emblaApi.reInit()
    })

    return () => {
      cancelAnimationFrame(timeoutId)
    }
  }, [emblaApi, popularAssets, shouldShow])

  if (!shouldShow || popularAssets.length === 0) return null

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
              key={`carousel-${selectedCategory}-${selectedSort}-${selectedOrder}-${selectedChainId}-${popularAssets.length}`}
              className='embla__container'
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                height: 'auto',
                marginLeft: 'calc(0.5rem * -1)',
              }}
              variants={containerVariants}
              initial='hidden'
              animate={isVisible && popularAssets.length > 0 ? 'visible' : 'hidden'}
            >
              {popularAssetsCards}
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
          <Popover placement='top-end' closeOnBlur={true} returnFocusOnClose={false}>
            <PopoverTrigger>
              <IconButton
                aria-label={translate('common.settings')}
                icon={settingsIcon}
                size='md'
                fontSize='xl'
                variant='ghost'
                _hover={buttonHoverProps}
                _active={buttonHoverProps}
              />
            </PopoverTrigger>
            <PopoverContent zIndex={1001} width='280px'>
              <PopoverBody p={4}>
                <Flex flexDirection='column' gap={4}>
                  <Box>
                    <Text
                      translation='common.list'
                      mb={2}
                      color='text.primary'
                      fontWeight='bold'
                      fontSize='sm'
                    />
                    <Menu>
                      <MenuButton
                        as={Box}
                        width='100%'
                        px={3}
                        py={2}
                        bg='background.surface.raised.base'
                        borderRadius='md'
                        cursor='pointer'
                        _hover={menuButtonHoverProps}
                      >
                        <RawText fontSize='sm'>{categoryLabel}</RawText>
                      </MenuButton>
                      <MenuList zIndex={1002}>
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
                      </MenuList>
                    </Menu>
                  </Box>

                  {sortOptions && (
                    <Box>
                      <Text
                        translation='common.sortBy'
                        mb={2}
                        color='text.primary'
                        fontWeight='bold'
                        fontSize='sm'
                      />
                      <Menu>
                        <MenuButton
                          as={Box}
                          width='100%'
                          px={3}
                          py={2}
                          bg='background.surface.raised.base'
                          borderRadius='md'
                          cursor='pointer'
                          _hover={menuButtonHoverProps}
                        >
                          <RawText fontSize='sm'>
                            {translate(`dashboard.portfolio.${selectedSort}`)}
                          </RawText>
                        </MenuButton>
                        <MenuList zIndex={1002}>
                          <MenuOptionGroup type='radio' value={selectedSort}>
                            {sortOptions.map(sortOption => (
                              <MenuItemOption
                                key={sortOption}
                                value={sortOption}
                                onClick={handleSortOptionClick(sortOption)}
                                fontSize='sm'
                                iconPlacement='end'
                                icon={checkedIcon}
                                color={selectedSort === sortOption ? 'text.primary' : 'text.subtle'}
                              >
                                {translate(`dashboard.portfolio.${sortOption}`)}
                              </MenuItemOption>
                            ))}
                          </MenuOptionGroup>
                        </MenuList>
                      </Menu>
                    </Box>
                  )}

                  <Box>
                    <Text
                      translation='common.orderBy'
                      mb={2}
                      color='text.primary'
                      fontWeight='bold'
                      fontSize='sm'
                    />
                    <Menu>
                      <MenuButton
                        as={Box}
                        width='100%'
                        px={3}
                        py={2}
                        bg='background.surface.raised.base'
                        borderRadius='md'
                        cursor='pointer'
                        _hover={menuButtonHoverProps}
                      >
                        <RawText fontSize='sm'>{orderLabel}</RawText>
                      </MenuButton>
                      <MenuList zIndex={1002}>
                        <MenuOptionGroup type='radio' value={selectedOrder}>
                          <MenuItemOption
                            value={OrderDirection.Descending}
                            onClick={handleOrderDescendingClick}
                            fontSize='sm'
                            iconPlacement='end'
                            icon={checkedIcon}
                            color={
                              selectedOrder === OrderDirection.Descending
                                ? 'text.primary'
                                : 'text.subtle'
                            }
                          >
                            {translate('common.descending')}
                          </MenuItemOption>
                          <MenuItemOption
                            value={OrderDirection.Ascending}
                            onClick={handleOrderAscendingClick}
                            fontSize='sm'
                            iconPlacement='end'
                            icon={checkedIcon}
                            color={
                              selectedOrder === OrderDirection.Ascending
                                ? 'text.primary'
                                : 'text.subtle'
                            }
                          >
                            {translate('common.ascending')}
                          </MenuItemOption>
                        </MenuOptionGroup>
                      </MenuList>
                    </Menu>
                  </Box>
                </Flex>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </Flex>
      </Flex>
    </Box>
  )
}
