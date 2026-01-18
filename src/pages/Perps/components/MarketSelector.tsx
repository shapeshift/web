import { ChevronDownIcon, SearchIcon, TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Skeleton,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { HYPERLIQUID_POPULAR_MARKETS } from '@/lib/hyperliquid/constants'
import type { AugmentedMarket } from '@/lib/hyperliquid/types'
import type { MarketSortBy } from '@/pages/Perps/hooks/useMarkets'

const chevronDownIcon = <ChevronDownIcon />
const searchIcon = <SearchIcon color='text.subtle' />

type MarketSelectorProps = {
  selectedMarket: AugmentedMarket | undefined
  markets: AugmentedMarket[]
  filteredMarkets: AugmentedMarket[]
  isLoading: boolean
  searchQuery: string
  sortBy: MarketSortBy
  onSearchChange: (query: string) => void
  onSortChange: (sortBy: MarketSortBy) => void
  onMarketSelect: (coin: string) => void
}

type MarketItemProps = {
  market: AugmentedMarket
  isSelected: boolean
  onClick: () => void
}

const hoverBg = { bg: 'background.surface.raised.hover' }

const MarketItem = memo(({ market, isSelected, onClick }: MarketItemProps) => {
  const selectedBg = useColorModeValue('blue.50', 'whiteAlpha.100')
  const greenColor = useColorModeValue('green.500', 'green.400')
  const redColor = useColorModeValue('red.500', 'red.400')

  const priceChangePercent = useMemo(() => {
    return parseFloat(market.priceChangePercent24h) || 0
  }, [market.priceChangePercent24h])

  const priceChangeColor = priceChangePercent >= 0 ? greenColor : redColor
  const PriceChangeIcon = priceChangePercent >= 0 ? TriangleUpIcon : TriangleDownIcon

  return (
    <Box
      as='button'
      type='button'
      onClick={onClick}
      width='full'
      p={3}
      borderRadius='lg'
      bg={isSelected ? selectedBg : 'background.surface.raised.base'}
      _hover={hoverBg}
      transition='all 0.2s'
      textAlign='left'
    >
      <HStack spacing={3} width='full' justify='space-between'>
        <VStack align='start' spacing={0} minW={0}>
          <Text fontWeight='semibold' fontSize='sm'>
            {market.coin}
          </Text>
          <Text fontSize='xs' color='text.subtle'>
            {market.maxLeverage}x
          </Text>
        </VStack>
        <VStack align='end' spacing={0}>
          <Amount.Fiat value={market.markPx} fontSize='sm' fontWeight='medium' />
          <HStack spacing={1}>
            <PriceChangeIcon boxSize={2} color={priceChangeColor} />
            <Text fontSize='xs' color={priceChangeColor} fontWeight='medium'>
              {Math.abs(priceChangePercent).toFixed(2)}%
            </Text>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  )
})

type SortButtonProps = {
  label: string
  isActive: boolean
  onClick: () => void
}

const SortButton = memo(({ label, isActive, onClick }: SortButtonProps) => {
  const activeBg = useColorModeValue('blue.100', 'blue.800')
  const activeColor = useColorModeValue('blue.700', 'blue.200')

  return (
    <Button
      size='xs'
      variant={isActive ? 'solid' : 'ghost'}
      bg={isActive ? activeBg : undefined}
      color={isActive ? activeColor : 'text.subtle'}
      onClick={onClick}
      fontWeight={isActive ? 'semibold' : 'normal'}
    >
      {label}
    </Button>
  )
})

const PopularMarketChip = memo(
  ({
    coin,
    isSelected,
    onClick,
  }: {
    coin: string
    isSelected: boolean
    onClick: () => void
  }) => {
    const activeBg = useColorModeValue('blue.100', 'blue.800')
    const activeColor = useColorModeValue('blue.700', 'blue.200')

    return (
      <Button
        size='xs'
        variant={isSelected ? 'solid' : 'outline'}
        bg={isSelected ? activeBg : undefined}
        color={isSelected ? activeColor : undefined}
        onClick={onClick}
        fontWeight={isSelected ? 'semibold' : 'normal'}
        borderRadius='full'
      >
        {coin}
      </Button>
    )
  },
)

export const MarketSelector = memo(
  ({
    selectedMarket,
    markets,
    filteredMarkets,
    isLoading,
    searchQuery,
    sortBy,
    onSearchChange,
    onSortChange,
    onMarketSelect,
  }: MarketSelectorProps) => {
    const translate = useTranslate()
    const [isOpen, setIsOpen] = useState(false)
    const borderColor = useColorModeValue('gray.200', 'gray.700')
    const greenColor = useColorModeValue('green.500', 'green.400')
    const redColor = useColorModeValue('red.500', 'red.400')

    const handleOpen = useCallback(() => setIsOpen(true), [])

    const handleClose = useCallback(() => {
      onSearchChange('')
      setIsOpen(false)
    }, [onSearchChange])

    const handleMarketClick = useCallback(
      (coin: string) => {
        onMarketSelect(coin)
        onSearchChange('')
        setIsOpen(false)
      },
      [onMarketSelect, onSearchChange],
    )

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value)
      },
      [onSearchChange],
    )

    const handleSortByVolume = useCallback(() => onSortChange('volume'), [onSortChange])
    const handleSortByName = useCallback(() => onSortChange('name'), [onSortChange])
    const handleSortByPriceChange = useCallback(() => onSortChange('priceChange'), [onSortChange])

    const selectedPriceChangePercent = useMemo(() => {
      if (!selectedMarket) return 0
      return parseFloat(selectedMarket.priceChangePercent24h) || 0
    }, [selectedMarket])

    const priceChangeColor = selectedPriceChangePercent >= 0 ? greenColor : redColor
    const PriceChangeIcon = selectedPriceChangePercent >= 0 ? TriangleUpIcon : TriangleDownIcon

    const popularMarkets = useMemo(() => {
      return HYPERLIQUID_POPULAR_MARKETS.filter(coin => markets.some(m => m.coin === coin))
    }, [markets])

    if (isLoading) {
      return <Skeleton height='56px' borderRadius='lg' width='full' />
    }

    if (markets.length === 0) {
      return (
        <Box
          p={4}
          borderRadius='lg'
          border='1px solid'
          borderColor={borderColor}
          textAlign='center'
        >
          <Text color='text.subtle' fontSize='sm'>
            {translate('perps.noMarketsAvailable')}
          </Text>
        </Box>
      )
    }

    return (
      <>
        <Button
          variant='outline'
          width='full'
          height='auto'
          p={3}
          onClick={handleOpen}
          rightIcon={chevronDownIcon}
          justifyContent='space-between'
        >
          {selectedMarket ? (
            <HStack spacing={3} flex={1}>
              <VStack align='start' spacing={0}>
                <Text fontWeight='bold' fontSize='md'>
                  {selectedMarket.coin}
                </Text>
                <Text fontSize='xs' color='text.subtle'>
                  {translate('perps.perpetual')}
                </Text>
              </VStack>
              <Box ml='auto'>
                <VStack align='end' spacing={0}>
                  <Amount.Fiat value={selectedMarket.markPx} fontSize='sm' fontWeight='semibold' />
                  <HStack spacing={1}>
                    <PriceChangeIcon boxSize={2} color={priceChangeColor} />
                    <Text fontSize='xs' color={priceChangeColor} fontWeight='medium'>
                      {Math.abs(selectedPriceChangePercent).toFixed(2)}%
                    </Text>
                  </HStack>
                </VStack>
              </Box>
            </HStack>
          ) : (
            <Text color='text.subtle'>{translate('perps.selectMarket')}</Text>
          )}
        </Button>

        <Dialog isOpen={isOpen} onClose={handleClose} height='80vh'>
          <DialogHeader>
            <DialogHeader.Left>{null}</DialogHeader.Left>
            <DialogHeader.Middle>
              <DialogTitle>{translate('perps.selectMarket')}</DialogTitle>
            </DialogHeader.Middle>
            <DialogHeader.Right>
              <DialogCloseButton />
            </DialogHeader.Right>
          </DialogHeader>
          <DialogBody pb={6}>
            <VStack spacing={4} align='stretch'>
              <InputGroup>
                <InputLeftElement pointerEvents='none'>{searchIcon}</InputLeftElement>
                <Input
                  placeholder={translate('common.search')}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  variant='filled'
                />
              </InputGroup>

              <Flex wrap='wrap' gap={2}>
                {popularMarkets.map(coin => (
                  <PopularMarketChip
                    key={coin}
                    coin={coin}
                    isSelected={selectedMarket?.coin === coin}
                    onClick={() => handleMarketClick(coin)}
                  />
                ))}
              </Flex>

              <HStack spacing={2}>
                <Text fontSize='xs' color='text.subtle' fontWeight='medium'>
                  {translate('perps.sortBy')}:
                </Text>
                <SortButton
                  label={translate('perps.volume')}
                  isActive={sortBy === 'volume'}
                  onClick={handleSortByVolume}
                />
                <SortButton
                  label={translate('perps.name')}
                  isActive={sortBy === 'name'}
                  onClick={handleSortByName}
                />
                <SortButton
                  label={translate('perps.change')}
                  isActive={sortBy === 'priceChange'}
                  onClick={handleSortByPriceChange}
                />
              </HStack>

              {filteredMarkets.length === 0 ? (
                <Text color='text.subtle' textAlign='center' py={4}>
                  {translate('common.noResultsFound')}
                </Text>
              ) : (
                <VStack spacing={2} align='stretch' maxH='400px' overflowY='auto'>
                  {filteredMarkets.map(market => (
                    <MarketItem
                      key={market.coin}
                      market={market}
                      isSelected={selectedMarket?.coin === market.coin}
                      onClick={() => handleMarketClick(market.coin)}
                    />
                  ))}
                </VStack>
              )}
            </VStack>
          </DialogBody>
        </Dialog>
      </>
    )
  },
)
