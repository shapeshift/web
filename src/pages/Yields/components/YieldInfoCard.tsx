import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Box,
  Card,
  CardBody,
  Flex,
  Heading,
  HStack,
  Tag,
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

    return (
      <Card data-testid='yield-info-card'>
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
              {assetIcon}
              <Heading as='h2' size='md'>
                {yieldTitle}
              </Heading>
              <HStack spacing={2} flexWrap='wrap' ml='auto'>
                <Tag borderRadius='full' px={3} textTransform='capitalize' alignSelf='stretch'>
                  {type}
                </Tag>
                {yieldItem.chainId && (
                  <Tag gap={1} borderRadius='full' p={2} textTransform='capitalize'>
                    <ChainIcon chainId={yieldItem.chainId} boxSize='20px' />
                    {yieldItem.network}
                  </Tag>
                )}
                {validatorOrProvider?.name && (
                  <Tag gap={1} borderRadius='full' p={2}>
                    {validatorOrProvider.logoURI && (
                      <Avatar
                        boxSize='20px'
                        src={validatorOrProvider.logoURI}
                        name={validatorOrProvider.name}
                      />
                    )}
                    {validatorOrProvider.name}
                  </Tag>
                )}
              </HStack>
            </Flex>

            <HStack spacing={3} flexWrap='wrap'>
              <Box data-testid='yield-info-apy'>
                <GradientApy fontSize='4xl' fontWeight='medium'>
                  {apy}% {translate('common.apy')}
                </GradientApy>
              </Box>
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
