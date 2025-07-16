import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import type { CowSwapQuoteId } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { NotificationWrapper } from './NotificationWrapper'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectWalletLimitOrderActionByCowSwapQuoteId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SwapNotificationProps = {
  handleClick: () => void
  cowSwapQuoteId: CowSwapQuoteId
} & RenderProps

export const LimitOrderNotification = ({
  handleClick,
  cowSwapQuoteId,
  onClose,
}: SwapNotificationProps) => {
  const action = useAppSelector(state =>
    selectWalletLimitOrderActionByCowSwapQuoteId(state, { cowSwapQuoteId }),
  )

  const limitOrderNotificationTranslationComponents: TextPropTypes['components'] | undefined =
    useMemo(() => {
      if (!action) return

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

  if (!action) return null

  return (
    <NotificationWrapper handleClick={handleClick} onClose={onClose}>
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
    </NotificationWrapper>
  )
}
