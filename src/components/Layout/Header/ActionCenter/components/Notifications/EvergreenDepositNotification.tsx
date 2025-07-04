import { CloseIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, HStack, Icon, Link, Stack, useColorModeValue } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { useMemo } from 'react'

import { ActionStatusIcon } from '../ActionStatusIcon'

import { Amount } from '@/components/Amount/Amount'
import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { TextPropTypes } from '@/components/Text/Text'
import { Text } from '@/components/Text/Text'
import type { EvergreenDepositAction } from '@/state/slices/actionSlice/types'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { foxEthPair } from '@/state/slices/opportunitiesSlice/constants'

type EvergreenDepositNotificationProps = {
  handleClick: () => void
  action: EvergreenDepositAction
} & RenderProps

const toastHoverProps = {
  transform: 'translateY(-2px)',
}

export const EvergreenDepositNotification = ({
  handleClick,
  action,
  onClose,
}: EvergreenDepositNotificationProps) => {
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

  const { lpAsset, depositAmountCryptoPrecision, contractAddress } = action.evergreenDepositMetadata

  const depositNotificationTranslationComponents: TextPropTypes['components'] = useMemo(() => {
    const contractLink = `${lpAsset.explorerAddressLink}${contractAddress}`

    return {
      depositAmountAndSymbol: (
        <Amount.Crypto
          value={depositAmountCryptoPrecision}
          symbol={lpAsset.symbol}
          fontSize='sm'
          maximumFractionDigits={6}
          omitDecimalTrailingZeros
          display='inline'
        />
      ),
      contractAddress: (
        <Link href={contractLink} isExternal fontSize='sm' display='inline' color='text.link'>
          {contractAddress.slice(0, 6)}...
        </Link>
      ),
    }
  }, [depositAmountCryptoPrecision, lpAsset.symbol, lpAsset.explorerAddressLink, contractAddress])

  const depositTranslation = useMemo(() => {
    switch (action.status) {
      case ActionStatus.Pending:
        return 'notificationCenter.deposit.pending'
      case ActionStatus.Complete:
        return 'notificationCenter.deposit.complete'
      case ActionStatus.Failed:
        return 'notificationCenter.deposit.failed'
      default:
        return ''
    }
  }, [action.status])

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
                assetId={foxEthPair[0]}
                secondaryAssetId={foxEthPair[1]}
                size='md'
              >
                <ActionStatusIcon status={action.status} />
              </AssetIconWithBadge>

              <Box ml={2}>
                <Text
                  flex={1}
                  fontSize='sm'
                  letterSpacing='0.02em'
                  translation={depositTranslation}
                  components={depositNotificationTranslationComponents}
                />
              </Box>
            </HStack>
          </Flex>
        </Stack>
      </Box>
    </Box>
  )
}
