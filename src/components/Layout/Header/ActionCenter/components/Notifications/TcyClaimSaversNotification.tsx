import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { tcyAssetId } from '@shapeshiftoss/caip'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { ActionStatusTag } from '../ActionStatusTag'
import { NotificationWrapper } from './NotificationWrapper'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { Text } from '@/components/Text/Text'
import { ActionStatus } from '@/state/slices/actionSlice/types'

type TCYClaimSaversNotificationProps = {
  handleClick: () => void
} & RenderProps

export const TcyClaimSaversNotification = ({
  handleClick,
  onClose,
}: TCYClaimSaversNotificationProps) => {
  return (
    <NotificationWrapper handleClick={handleClick} onClose={onClose}>
      <Stack spacing={3}>
        <Flex alignItems='center' justifyContent='space-between' pe={6}>
          <HStack spacing={2}>
            <AssetIconWithBadge assetId={tcyAssetId} size='md'>
              <ActionStatusIcon status={ActionStatus.ClaimAvailable} />
            </AssetIconWithBadge>

            <Stack spacing={1}>
              <Text fontSize='sm' translation={'TCY.claimNow'} />
              <Box flexGrow={0}>
                <ActionStatusTag status={ActionStatus.ClaimAvailable} />
              </Box>
            </Stack>
          </HStack>
        </Flex>
      </Stack>
    </NotificationWrapper>
  )
}
