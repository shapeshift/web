import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Box,
  Button,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Skeleton,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { cosmosChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { SHAPESHIFT_VALIDATOR_LOGO, SHAPESHIFT_VALIDATOR_NAME } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto, ProviderDto, ValidatorDto } from '@/lib/yieldxyz/types'
import { getDefaultValidatorForYield } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'

const chevronDownIcon = <ChevronDownIcon />
const searchIcon = <SearchIcon color='text.subtle' />

type YieldSelectorProps = {
  selectedYieldId: string | undefined
  yields: AugmentedYieldDto[]
  onYieldSelect: (yieldId: string) => void
  isLoading: boolean
  sellAsset: Asset
  selectedValidator?: ValidatorDto
}

const isNativeStaking = (type: string | undefined): boolean =>
  ['native-staking', 'staking'].includes(type ?? '')

const getDisplayInfo = (
  yieldItem: AugmentedYieldDto,
  providers: Record<string, ProviderDto> | undefined,
): { name: string; logoURI: string | undefined } => {
  // For Cosmos native staking, always show ShapeShift DAO
  if (isNativeStaking(yieldItem.mechanics.type) && yieldItem.chainId === cosmosChainId) {
    return { name: SHAPESHIFT_VALIDATOR_NAME, logoURI: SHAPESHIFT_VALIDATOR_LOGO }
  }
  // For other yields, show provider info
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

    const requiresValidator = yieldItem.mechanics.requiresValidatorSelection
    const { data: validators } = useYieldValidators(yieldItem.id, requiresValidator)

    const apyDisplay = useMemo(() => {
      const apy = (yieldItem.rewardRate?.total ?? 0) * 100
      return `${apy.toFixed(2)}%`
    }, [yieldItem.rewardRate?.total])

    const providerOrValidatorInfo = useMemo(() => {
      // For staking yields with validators, show the default validator
      if (requiresValidator && validators?.length) {
        const defaultAddress = getDefaultValidatorForYield(yieldItem.id)
        const defaultValidator = defaultAddress
          ? validators.find(v => v.address === defaultAddress)
          : undefined
        const preferredValidator = validators.find(v => v.preferred) ?? validators[0]
        const validator = defaultValidator ?? preferredValidator
        if (validator) {
          return { name: validator.name, logoURI: validator.logoURI }
        }
      }
      // Fall back to the static display info (includes Cosmos ShapeShift DAO fallback)
      return getDisplayInfo(yieldItem, providers)
    }, [requiresValidator, validators, yieldItem, providers])

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
          <Avatar
            src={providerOrValidatorInfo.logoURI}
            name={providerOrValidatorInfo.name}
            size='sm'
          />
          <VStack align='start' spacing={0} flex={1} minW={0}>
            <Text fontWeight='semibold' fontSize='sm' noOfLines={1}>
              {yieldItem.metadata.name}
            </Text>
            <HStack spacing={1}>
              <Avatar
                src={providerOrValidatorInfo.logoURI}
                name={providerOrValidatorInfo.name}
                size='2xs'
              />
              <Text fontSize='xs' color='text.subtle' noOfLines={1}>
                {providerOrValidatorInfo.name}
              </Text>
            </HStack>
          </VStack>
          <GradientApy fontSize='sm' fontWeight='bold'>
            {apyDisplay}
          </GradientApy>
        </HStack>
      </Box>
    )
  },
)

const isStakingType = (type: string | undefined): boolean =>
  ['native-staking', 'pooled-staking', 'staking'].includes(type ?? '')

export const YieldSelector = memo(
  ({
    selectedYieldId,
    yields,
    onYieldSelect,
    isLoading,
    sellAsset,
    selectedValidator,
  }: YieldSelectorProps) => {
    const translate = useTranslate()
    const [isOpen, setIsOpen] = useState(false)
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

    const handleOpen = useCallback(() => setIsOpen(true), [])

    const handleClose = useCallback(() => {
      setSearchQuery('')
      setIsOpen(false)
    }, [])

    const handleYieldClick = useCallback(
      (yieldId: string) => {
        onYieldSelect(yieldId)
        setSearchQuery('')
        setIsOpen(false)
      },
      [onYieldSelect],
    )

    const selectedApyDisplay = useMemo(() => {
      if (!selectedYield) return '0.00%'
      const apy = (selectedYield.rewardRate?.total ?? 0) * 100
      return `${apy.toFixed(2)}%`
    }, [selectedYield])

    const selectedDisplayInfo = useMemo(() => {
      if (!selectedYield) return null
      // For staking yields with a validator, show validator info
      if (isStakingType(selectedYield.mechanics.type) && selectedValidator) {
        return {
          name: selectedValidator.name,
          logoURI: selectedValidator.logoURI,
        }
      }
      // Otherwise show provider info
      return getDisplayInfo(selectedYield, providers)
    }, [selectedYield, selectedValidator, providers])

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
          onClick={handleOpen}
          rightIcon={chevronDownIcon}
          justifyContent='space-between'
        >
          {selectedYield && selectedDisplayInfo ? (
            <HStack spacing={3} flex={1}>
              <Avatar src={selectedDisplayInfo.logoURI} name={selectedDisplayInfo.name} size='sm' />
              <VStack align='start' spacing={0} flex={1} minW={0}>
                <Text fontWeight='semibold' fontSize='sm' noOfLines={1}>
                  {selectedYield.metadata.name}
                </Text>
                <HStack spacing={1}>
                  <Avatar
                    src={selectedDisplayInfo.logoURI}
                    name={selectedDisplayInfo.name}
                    size='2xs'
                  />
                  <Text fontSize='xs' color='text.subtle' noOfLines={1}>
                    {selectedDisplayInfo.name}
                  </Text>
                </HStack>
              </VStack>
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

        <Dialog isOpen={isOpen} onClose={handleClose} height='80vh'>
          <DialogHeader>
            <DialogHeader.Left>{null}</DialogHeader.Left>
            <DialogHeader.Middle>
              <DialogTitle>
                {translate('earn.selectYieldFor', { asset: sellAsset?.symbol ?? '' })}
              </DialogTitle>
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
          </DialogBody>
        </Dialog>
      </>
    )
  },
)
