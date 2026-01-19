import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Badge,
  Box,
  Card,
  CardBody,
  Flex,
  Heading,
  HStack,
  Stack,
  Tag,
  TagLeftIcon,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getYieldDisplayName } from '@/lib/yieldxyz/getYieldDisplayName'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { resolveYieldInputAssetIcon } from '@/lib/yieldxyz/utils'
import { GradientApy } from '@/pages/Yields/components/GradientApy'

type ValidatorOrProviderInfo = {
  name: string
  logoURI?: string
  description?: string
  documentation?: string
} | null

type YieldInfoCardProps = {
  yieldItem: AugmentedYieldDto
  validatorOrProvider: ValidatorOrProviderInfo
  titleOverride?: string
  userBalanceUserCurrency?: string
  userBalanceCrypto?: string
}

export const YieldInfoCard = memo(
  ({
    yieldItem,
    validatorOrProvider,
    titleOverride,
    userBalanceUserCurrency,
    userBalanceCrypto,
  }: YieldInfoCardProps) => {
    const translate = useTranslate()

    const iconSource = resolveYieldInputAssetIcon(yieldItem)
    const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toFixed(2)
    const yieldTitle = titleOverride ?? getYieldDisplayName(yieldItem)
    const type = yieldItem.mechanics.type
    const description = yieldItem.metadata.description

    const hasPosition = useMemo(() => bnOrZero(userBalanceCrypto).gt(0), [userBalanceCrypto])

    const assetIcon = iconSource.assetId ? (
      <AssetIcon assetId={iconSource.assetId} size='lg' />
    ) : (
      <AssetIcon src={iconSource.src} size='lg' />
    )

    const hasOverlay = validatorOrProvider?.logoURI || yieldItem.chainId

    const stackedIconElement = !hasOverlay ? assetIcon : <Box position='relative'>{assetIcon}</Box>

    return (
      <Card position='relative' overflow='hidden'>
        <Box
          position='absolute'
          width='100px'
          top={0}
          left={0}
          right={0}
          bottom={0}
          zIndex={0}
          transform='scale(1)'
          filter='blur(50px)'
        >
          {assetIcon}
        </Box>
        <CardBody>
          <VStack spacing={4} align='stretch'>
            {yieldItem.metadata.deprecated && (
              <Alert status='error' borderRadius='lg' variant='subtle'>
                <AlertIcon />
                <AlertDescription fontSize='sm'>
                  {translate('yieldXYZ.deprecatedDescription')}
                </AlertDescription>
              </Alert>
            )}

            {yieldItem.metadata.underMaintenance && !yieldItem.metadata.deprecated && (
              <Alert status='warning' borderRadius='lg' variant='subtle'>
                <AlertIcon />
                <AlertDescription fontSize='sm'>
                  {translate('yieldXYZ.underMaintenanceDescription')}
                </AlertDescription>
              </Alert>
            )}

            <Flex gap={4} align='center'>
              {stackedIconElement}
              <Stack spacing={0}>
                <Heading as='h2' size='md'>
                  {yieldTitle}
                </Heading>
                <Text color='text.subtle' fontSize='sm' textTransform='capitalize'>
                  {[yieldItem.network, validatorOrProvider?.name].filter(Boolean).join(' • ')}
                </Text>
              </Stack>

              <HStack spacing={2} flexWrap='wrap' ml='auto'>
                {yieldItem.chainId && (
                  <Tag
                    borderRadius='full'
                    pr={3}
                    py={2}
                    bg='background.button.secondary.base'
                    alignSelf='stretch'
                  >
                    <TagLeftIcon as={ChainIcon} chainId={yieldItem.chainId} boxSize='24px' />
                    <Text fontSize='sm' fontWeight='semibold' textTransform='capitalize'>
                      {yieldItem.network}
                    </Text>
                  </Tag>
                )}
                {validatorOrProvider?.name && (
                  <Tag
                    borderRadius='full'
                    pr={3}
                    py={2}
                    alignSelf='stretch'
                    bg='background.button.secondary.base'
                  >
                    {validatorOrProvider.logoURI && (
                      <TagLeftIcon
                        as={Avatar}
                        size='md'
                        src={validatorOrProvider.logoURI}
                        name={validatorOrProvider.name}
                      />
                    )}
                    <Text fontSize='sm' fontWeight='semibold'>
                      {validatorOrProvider.name}
                    </Text>
                  </Tag>
                )}
                <Tag
                  size='md'
                  borderRadius='full'
                  textTransform='capitalize'
                  alignSelf='stretch'
                  px={3}
                  bg='background.button.secondary.base'
                >
                  {type}
                </Tag>
              </HStack>
            </Flex>

            {hasPosition ? (
              <VStack spacing={0} justify='flex-start' align='flex-start' mt={4}>
                <Text color='text.subtle' fontSize='sm' lineHeight={1}>
                  {translate('yieldXYZ.myPosition')}
                </Text>
                <HStack spacing={3} align='center'>
                  <Amount.Fiat
                    fontSize='5xl'
                    fontWeight='medium'
                    value={userBalanceUserCurrency ?? '0'}
                  />
                  <Badge
                    colorScheme='green'
                    fontSize='md'
                    px={3}
                    py={1}
                    borderRadius='full'
                    fontWeight='semibold'
                  >
                    {apy}% {translate('common.apy')}
                  </Badge>
                </HStack>
                <Text fontSize='sm' color='text.subtle'>
                  <Amount.Crypto
                    value={userBalanceCrypto ?? '0'}
                    symbol={yieldItem.token.symbol}
                    abbreviated
                  />
                </Text>
              </VStack>
            ) : (
              <HStack spacing={3} flexWrap='wrap'>
                <GradientApy fontSize='5xl'>
                  {apy}% {translate('common.apy')}
                </GradientApy>
              </HStack>
            )}

            {description && !hasPosition && (
              <Text color='text.subtle' fontSize='sm' lineHeight='tall'>
                {description}
              </Text>
            )}
          </VStack>
        </CardBody>
      </Card>
    )
  },
)
