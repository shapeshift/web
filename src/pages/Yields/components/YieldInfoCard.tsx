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
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'

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
}

export const YieldInfoCard = memo(
  ({ yieldItem, validatorOrProvider, titleOverride }: YieldInfoCardProps) => {
    const translate = useTranslate()

    const iconSource = resolveYieldInputAssetIcon(yieldItem)
    const apy = bnOrZero(yieldItem.rewardRate.total).times(100).toFixed(2)
    const yieldTitle = titleOverride ?? getYieldDisplayName(yieldItem)
    const type = yieldItem.mechanics.type
    const description = yieldItem.metadata.description

    const assetIcon = iconSource.assetId ? (
      <AssetIcon assetId={iconSource.assetId} size='lg' />
    ) : (
      <AssetIcon src={iconSource.src} size='lg' />
    )

    const hasOverlay = validatorOrProvider?.logoURI || yieldItem.chainId

    const stackedIconElement = !hasOverlay ? (
      assetIcon
    ) : (
      <Box position='relative'>
        {assetIcon}
        {validatorOrProvider?.logoURI ? (
          <Avatar
            size='xs'
            src={validatorOrProvider.logoURI}
            name={validatorOrProvider.name}
            position='absolute'
            bottom='-4px'
            right='-4px'
            border='2px solid'
            borderColor='background.surface.raised.base'
          />
        ) : yieldItem.chainId ? (
          <Box
            position='absolute'
            bottom='-4px'
            right='-4px'
            bg='background.surface.raised.base'
            borderRadius='full'
            p='3px'
          >
            <ChainIcon chainId={yieldItem.chainId} boxSize='16px' />
          </Box>
        ) : null}
      </Box>
    )

    return (
      <Card variant='dashboard'>
        <CardBody p={{ base: 4, md: 6 }}>
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

            {!yieldItem.status.enter &&
              !yieldItem.metadata.deprecated &&
              !yieldItem.metadata.underMaintenance && (
                <Alert status='warning' borderRadius='lg' variant='subtle'>
                  <AlertIcon />
                  <AlertDescription fontSize='sm'>
                    {translate('yieldXYZ.depositsDisabledDescription')}
                  </AlertDescription>
                </Alert>
              )}

            <Flex gap={4} align='center'>
              {stackedIconElement}
              <Heading as='h2' size='md'>
                {yieldTitle}
              </Heading>
            </Flex>

            <HStack spacing={3} flexWrap='wrap'>
              <Box
                bg='background.surface.overlay.base'
                borderRadius='full'
                px={3}
                py={1.5}
                borderWidth={1}
                borderColor='border.base'
              >
                <GradientApy fontSize='sm'>
                  {apy}% {translate('common.apy')}
                </GradientApy>
              </Box>
              <Badge
                colorScheme='gray'
                variant='subtle'
                borderRadius='full'
                px={3}
                py={1.5}
                fontWeight='medium'
                fontSize='sm'
                textTransform='capitalize'
              >
                {type}
              </Badge>
            </HStack>

            <HStack spacing={6} flexWrap='wrap'>
              <HStack spacing={2}>
                {iconSource.assetId ? (
                  <AssetIcon assetId={iconSource.assetId} size='xs' />
                ) : (
                  <AssetIcon src={iconSource.src} size='xs' />
                )}
                <Text fontSize='md' fontWeight='semibold'>
                  {yieldItem.token.symbol}
                </Text>
              </HStack>
              {yieldItem.chainId && (
                <HStack spacing={2}>
                  <ChainIcon chainId={yieldItem.chainId} boxSize='20px' />
                  <Text fontSize='md' fontWeight='semibold' textTransform='capitalize'>
                    {yieldItem.network}
                  </Text>
                </HStack>
              )}
              {validatorOrProvider?.name && (
                <HStack spacing={2}>
                  {validatorOrProvider.logoURI && (
                    <Avatar
                      size='xs'
                      src={validatorOrProvider.logoURI}
                      name={validatorOrProvider.name}
                    />
                  )}
                  <Text fontSize='md' fontWeight='semibold'>
                    {validatorOrProvider.name}
                  </Text>
                </HStack>
              )}
            </HStack>

            {description && (
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
