import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import type { AugmentedYieldDto, ProviderDto } from '@/lib/yieldxyz/types'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'

const chevronDownIcon = <ChevronDownIcon />
const searchIcon = <SearchIcon color='text.subtle' />

type YieldSelectorProps = {
  selectedYieldId: string | undefined
  yields: AugmentedYieldDto[]
  onYieldSelect: (yieldId: string) => void
  isLoading: boolean
  sellAsset: Asset
}

const getProviderInfo = (
  yieldItem: AugmentedYieldDto,
  providers: Record<string, ProviderDto> | undefined,
): { name: string; logoURI: string | undefined } => {
  const provider = providers?.[yieldItem.providerId]
  if (provider) {
    return { name: provider.name, logoURI: provider.logoURI }
  }
  return { name: yieldItem.metadata.name, logoURI: yieldItem.metadata.logoURI }
}

const hoverBg = { bg: 'background.surface.raised.hover' }

const getYieldTypeName = (type: string, translate: (key: string) => string): string => {
  const translationKey = `earn.yieldTypes.${type}`
  const translated = translate(translationKey)
  if (translated !== translationKey) return translated
  return type
    .split('-')
    .filter((word): word is string => Boolean(word))
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const YieldItem = memo(
  ({
    yieldItem,
    isSelected,
    onClick,
    providers,
  }: {
    yieldItem: AugmentedYieldDto
    isSelected: boolean
    onClick: () => void
    providers: Record<string, ProviderDto> | undefined
  }) => {
    const selectedBg = useColorModeValue('blue.50', 'whiteAlpha.100')

    const apyDisplay = useMemo(() => {
      const apy = (yieldItem.rewardRate?.total ?? 0) * 100
      return `${apy.toFixed(2)}%`
    }, [yieldItem.rewardRate?.total])

    const providerInfo = useMemo(
      () => getProviderInfo(yieldItem, providers),
      [yieldItem, providers],
    )

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
        <HStack spacing={3} width='full'>
          <Image
            src={providerInfo.logoURI}
            alt={providerInfo.name}
            boxSize='40px'
            borderRadius='full'
            fallbackSrc='https://assets.coingecko.com/coins/images/279/small/ethereum.png'
          />
          <VStack align='start' spacing={0} flex={1} minW={0}>
            <Text fontWeight='semibold' fontSize='sm' noOfLines={1}>
              {providerInfo.name}
            </Text>
          </VStack>
          <GradientApy fontSize='sm' fontWeight='bold'>
            {apyDisplay}
          </GradientApy>
        </HStack>
      </Box>
    )
  },
)

export const YieldSelector = memo(
  ({ selectedYieldId, yields, onYieldSelect, isLoading, sellAsset }: YieldSelectorProps) => {
    const translate = useTranslate()
    const { isOpen, onOpen, onClose } = useDisclosure()
    const borderColor = useColorModeValue('gray.200', 'gray.700')
    const [searchQuery, setSearchQuery] = useState('')
    const { data: providers } = useYieldProviders()

    const selectedYield = useMemo(() => {
      if (!selectedYieldId) return undefined
      return yields.find(y => y.id === selectedYieldId)
    }, [selectedYieldId, yields])

    const filteredYields = useMemo(() => {
      if (!searchQuery.trim()) return yields
      const query = searchQuery.toLowerCase()
      return yields.filter(
        y =>
          y.metadata.name.toLowerCase().includes(query) ||
          y.mechanics.type.toLowerCase().includes(query),
      )
    }, [yields, searchQuery])

    const groupedYields = useMemo(() => {
      const groups: Record<string, AugmentedYieldDto[]> = {}
      for (const yieldItem of filteredYields) {
        const type = yieldItem.mechanics.type
        if (!groups[type]) groups[type] = []
        groups[type].push(yieldItem)
      }
      for (const type of Object.keys(groups)) {
        groups[type].sort((a, b) => (b.rewardRate?.total ?? 0) - (a.rewardRate?.total ?? 0))
      }
      return groups
    }, [filteredYields])

    const handleYieldClick = useCallback(
      (yieldId: string) => {
        onYieldSelect(yieldId)
        setSearchQuery('')
        onClose()
      },
      [onYieldSelect, onClose],
    )

    const handleClose = useCallback(() => {
      setSearchQuery('')
      onClose()
    }, [onClose])

    const selectedApyDisplay = useMemo(() => {
      if (!selectedYield) return '0.00%'
      const apy = (selectedYield.rewardRate?.total ?? 0) * 100
      return `${apy.toFixed(2)}%`
    }, [selectedYield])

    const selectedProviderInfo = useMemo(
      () => (selectedYield ? getProviderInfo(selectedYield, providers) : null),
      [selectedYield, providers],
    )

    if (isLoading) {
      return <Skeleton height='80px' borderRadius='lg' />
    }

    if (yields.length === 0) {
      return (
        <Box
          p={4}
          borderRadius='lg'
          border='1px solid'
          borderColor={borderColor}
          textAlign='center'
        >
          <Text color='text.subtle' fontSize='sm'>
            {translate('earn.noYieldsAvailable', { asset: sellAsset?.symbol ?? 'asset' })}
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
          p={4}
          onClick={onOpen}
          rightIcon={chevronDownIcon}
          justifyContent='space-between'
        >
          {selectedYield && selectedProviderInfo ? (
            <HStack spacing={3} flex={1}>
              <Image
                src={selectedProviderInfo.logoURI}
                alt={selectedProviderInfo.name}
                boxSize='32px'
                borderRadius='full'
                fallbackSrc='https://assets.coingecko.com/coins/images/279/small/ethereum.png'
              />
              <Text fontWeight='semibold' fontSize='sm'>
                {selectedProviderInfo.name}
              </Text>
              <Box ml='auto'>
                <GradientApy fontSize='sm' fontWeight='bold'>
                  {selectedApyDisplay}
                </GradientApy>
              </Box>
            </HStack>
          ) : (
            <Text color='text.subtle'>{translate('earn.selectYieldOpportunity')}</Text>
          )}
        </Button>

        <Modal isOpen={isOpen} onClose={handleClose} size='md' scrollBehavior='inside'>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {translate('earn.selectYieldFor', { asset: sellAsset?.symbol ?? '' })}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4} align='stretch'>
                <InputGroup>
                  <InputLeftElement pointerEvents='none'>{searchIcon}</InputLeftElement>
                  <Input
                    placeholder={translate('common.search')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    variant='filled'
                  />
                </InputGroup>

                {Object.entries(groupedYields).length === 0 ? (
                  <Text color='text.subtle' textAlign='center' py={4}>
                    {translate('common.noResultsFound')}
                  </Text>
                ) : (
                  Object.entries(groupedYields).map(([type, typeYields]) => (
                    <Box key={type}>
                      <Text fontSize='xs' fontWeight='bold' color='text.subtle' mb={2}>
                        {getYieldTypeName(type, translate).toUpperCase()}
                      </Text>
                      <VStack spacing={2} align='stretch'>
                        {typeYields.map(yieldItem => (
                          <YieldItem
                            key={yieldItem.id}
                            yieldItem={yieldItem}
                            isSelected={yieldItem.id === selectedYieldId}
                            onClick={() => handleYieldClick(yieldItem.id)}
                            providers={providers}
                          />
                        ))}
                      </VStack>
                    </Box>
                  ))
                )}
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    )
  },
)
