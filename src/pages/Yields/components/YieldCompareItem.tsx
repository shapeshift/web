import { Avatar, Box, Card, CardBody, Flex, Tag, Text } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { chainIdToFeeAssetId } from '@/lib/utils'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { GradientApy } from '@/pages/Yields/components/GradientApy'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldCompareItemProps = {
  yieldItem: AugmentedYieldDto
  providerName?: string
  providerIcon?: string
  onClick?: () => void
}

export const YieldCompareItem = memo(
  ({ yieldItem, providerName, providerIcon, onClick }: YieldCompareItemProps) => {
    const handleClick = useCallback(() => {
      onClick?.()
    }, [onClick])

    const feeAssetId = useMemo(
      () => (yieldItem.chainId ? chainIdToFeeAssetId(yieldItem.chainId) : undefined),
      [yieldItem.chainId],
    )

    const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

    const chainIcon = useMemo(
      () => feeAsset?.networkIcon ?? feeAsset?.icon,
      [feeAsset?.networkIcon, feeAsset?.icon],
    )

    const chainName = useMemo(
      () => feeAsset?.networkName ?? feeAsset?.name,
      [feeAsset?.networkName, feeAsset?.name],
    )

    const displayProviderName = useMemo(
      () => providerName ?? yieldItem.providerId,
      [providerName, yieldItem.providerId],
    )

    const apyFormatted = useMemo(
      () => `${(yieldItem.rewardRate.total * 100).toFixed(2)}%`,
      [yieldItem.rewardRate.total],
    )

    return (
      <Card
        as='button'
        bg='transparent'
        onClick={handleClick}
        w='full'
        boxShadow='none'
        _hover={{ bg: 'background.button.secondary.hover' }}
        transition='background 0.2s'
        borderBottomWidth='1px'
        borderColor='border.base'
        borderRadius='none'
        _first={{ borderTopRadius: 'xl' }}
        _last={{ borderBottomWidth: 0, borderBottomRadius: 'xl' }}
        cursor='pointer'
      >
        <CardBody display='flex' alignItems='center' gap={3}>
          <Box position='relative'>
            <Avatar size='sm' src={providerIcon} name={displayProviderName} />
            {chainIcon && (
              <LazyLoadAvatar
                position='absolute'
                right='-4px'
                bottom='-4px'
                boxSize='16px'
                src={chainIcon}
                borderWidth='2px'
                borderColor='background.surface.raised.base'
              />
            )}
          </Box>
          <Flex flex={1} flexDir='row' alignItems='center' minW={0} gap={2}>
            <Text fontWeight='semibold' fontSize='sm' noOfLines={1}>
              {displayProviderName}
            </Text>
            {chainName && (
              <Tag borderRadius='full' size='sm' bg='background.button.secondary.base'>
                {chainName}
              </Tag>
            )}
          </Flex>
          <GradientApy fontSize='lg' flexShrink={0}>
            {apyFormatted}
          </GradientApy>
        </CardBody>
      </Card>
    )
  },
)
