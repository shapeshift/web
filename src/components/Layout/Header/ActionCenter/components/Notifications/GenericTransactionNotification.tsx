import { CloseIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, HStack, Icon, Stack, useColorModeValue } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { useMemo } from 'react'

import { ActionStatusIcon } from '../ActionStatusIcon'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { selectWalletActionsSorted } from '@/state/slices/actionSlice/selectors'
import { isGenericTransactionAction } from '@/state/slices/actionSlice/types'
import { useAppSelector } from '@/state/store'

export type GenericTransactionNotificationProps = {
  handleClick: () => void
  actionId: string
} & RenderProps

const toastHoverProps = {
  transform: 'translateY(-2px)',
}

export const GenericTransactionNotification = ({
  handleClick,
  actionId,
  onClose,
}: GenericTransactionNotificationProps) => {
  const actions = useAppSelector(selectWalletActionsSorted)
  const action = useMemo(
    () => actions.find(a => a.id === actionId && a.type === 'GenericTransaction'),
    [actions, actionId],
  )
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

  if (!action) return null
  if (!isGenericTransactionAction(action)) return null

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
              <AssetIconWithBadge assetId={action.transactionMetadata.assetId} size='md'>
                <ActionStatusIcon status={action.status} />
              </AssetIconWithBadge>
              <Box ml={2}>
                <Box fontSize='sm' letterSpacing='0.02em'>
                  {action.transactionMetadata.message}
                </Box>
              </Box>
            </HStack>
          </Flex>
        </Stack>
      </Box>
    </Box>
  )
}
