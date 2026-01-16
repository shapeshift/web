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
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { AssetIcon } from '@/components/AssetIcon'
import { ChainIcon } from '@/components/ChainMenu'
import { bnOrZero } from '@/lib/bignumber/bignumber'
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
    const yieldTitle = titleOverride ?? yieldItem.metadata.name ?? yieldItem.token.symbol

    const assetIcon = useMemo(
      () =>
        iconSource.assetId ? (
          <AssetIcon assetId={iconSource.assetId} size='lg' />
        ) : (
          <AssetIcon src={iconSource.src} size='lg' />
        ),
      [iconSource],
    )

    const hasOverlay = validatorOrProvider?.logoURI || yieldItem.chainId

    const stackedIconElement = useMemo(
      () =>
        !hasOverlay ? (
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
        ),
      [assetIcon, hasOverlay, validatorOrProvider, yieldItem.chainId],
    )

    const type = yieldItem.mechanics.type
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)

    const description = yieldItem.metadata.description

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

            <Flex gap={4} align='center'>
              {stackedIconElement}
              <Box flex={1}>
                <Heading as='h2' size='md' mb={1}>
                  {yieldTitle}
                </Heading>
                <HStack spacing={2} flexWrap='wrap'>
                  {validatorOrProvider?.name && (
                    <HStack spacing={1.5}>
                      <Text color='text.subtle' fontSize='sm'>
                        {validatorOrProvider.name}
                      </Text>
                    </HStack>
                  )}
                  {yieldItem.chainId && (
                    <HStack spacing={1}>
                      <ChainIcon chainId={yieldItem.chainId} boxSize='14px' />
                      <Text color='text.subtle' fontSize='sm' textTransform='capitalize'>
                        {yieldItem.network}
                      </Text>
                    </HStack>
                  )}
                </HStack>
              </Box>
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
                <GradientApy fontSize='md'>
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
              >
                {typeLabel}
              </Badge>
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
