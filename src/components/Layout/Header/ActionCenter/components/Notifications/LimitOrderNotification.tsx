import { CloseIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, HStack, Icon, Stack, useColorModeValue } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { useMemo } from 'react'

import { ActionStatusIcon } from '../ActionStatusIcon'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import type { LimitOrderAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'

type SwapNotificationProps = {
  handleClick: () => void
  action: LimitOrderAction
} & RenderProps

const toastHoverProps = {
  transform: 'translateY(-2px)',
}

export const LimitOrderNotification = ({ handleClick, action, onClose }: SwapNotificationProps) => {
  const crossBgColor = useColorModeValue('gray.850', 'white')
  const crossColor = useColorModeValue('white', 'gray.850')

  const buttonHoverProps = useMemo(
    () => ({
      opacity: 0.8,
      bg: crossBgColor,
      color: crossColor,
    }),
    [crossBgColor, crossColor],
  )

  const limitOrderNotificationTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    if (action.status === ActionStatus.Complete) {
      return {
        sellAmountAndSymbol: (
          <Amount.Crypto
            value={action.limitOrderMetadata.executedSellAmountCryptoPrecision}
            symbol={action.limitOrderMetadata.sellAsset.symbol}
            fontSize='sm'
            fontWeight='bold'
            maximumFractionDigits={6}
            omitDecimalTrailingZeros
            display='inline'
          />
        ),
        buyAmountAndSymbol: (
          <Amount.Crypto
            value={action.limitOrderMetadata.executedBuyAmountCryptoPrecision}
            symbol={action.limitOrderMetadata.buyAsset.symbol}
            fontSize='sm'
            fontWeight='bold'
            maximumFractionDigits={6}
            omitDecimalTrailingZeros
            display='inline'
          />
        ),
      }
    }

    return {
      sellAmountAndSymbol: (
        <Amount.Crypto
          value={action.limitOrderMetadata.sellAmountCryptoPrecision}
          symbol={action.limitOrderMetadata.sellAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
      buyAmountAndSymbol: (
        <Amount.Crypto
          value={action.limitOrderMetadata.buyAmountCryptoPrecision}
          symbol={action.limitOrderMetadata.buyAsset.symbol}
          fontSize='sm'
          fontWeight='bold'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
    }
  }, [action])

  const limitOrderTitleTranslation = useMemo(() => {
    if (!action) return 'actionCenter.limitOrder.processing'
    if (action.status === ActionStatus.Open) return 'actionCenter.limitOrder.placed'
    if (action.status === ActionStatus.Complete) return 'actionCenter.limitOrder.complete'
    if (action.status === ActionStatus.Expired) return 'actionCenter.limitOrder.expired'
    if (action.status === ActionStatus.Cancelled) return 'actionCenter.limitOrder.cancelled'

    return 'actionCenter.limitOrder.placed'
  }, [action])

  return (
    <Box position='relative' _hover={toastHoverProps} transition='all 0.2s'>
      <Button
        size='xs'
        onClick={onClose}
        position='absolute'
        top={0}
        right={0}
        zIndex={1}
        backgroundColor={crossBgColor}
        borderRadius='full'
        _hover={buttonHoverProps}
        transform='translate(20%, -20%)'
      >
        <Icon as={CloseIcon} boxSize={'10px'} color={crossColor} />
      </Button>
      <Box
        onClick={handleClick}
        cursor='pointer'
        p={4}
        boxShadow='lg'
        width='100%'
        bg='background.surface.overlay.base'
        borderRadius='20'
        position='relative'
      >
        <Stack spacing={3}>
          <Flex alignItems='center' justifyContent='space-between' pe={6}>
            <HStack spacing={2}>
              <AssetIconWithBadge
                assetId={action.limitOrderMetadata.sellAsset.assetId}
                secondaryAssetId={action.limitOrderMetadata.buyAsset.assetId}
                size='md'
              >
                <ActionStatusIcon status={action?.status} />
              </AssetIconWithBadge>

              <Box ml={2}>
                <Text
                  flex={1}
                  fontSize='sm'
                  letterSpacing='0.02em'
                  translation={limitOrderTitleTranslation}
                  components={limitOrderNotificationTranslationComponents}
                />
              </Box>
            </HStack>
          </Flex>
        </Stack>
      </Box>
    </Box>
  )
}
