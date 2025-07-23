import { Box, Flex, HStack, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { ActionStatusIcon } from '../ActionStatusIcon'
import { ActionStatusTag } from '../ActionStatusTag'
import { NotificationWrapper } from './NotificationWrapper'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import { Text } from '@/components/Text/Text'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectTcyClaimActionsByWallet } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TCYClaimSaversNotificationProps = {
  handleClick: () => void
} & RenderProps

export const TcyClaimSaversNotification = ({
  handleClick,
  onClose,
}: TCYClaimSaversNotificationProps) => {
  const tcyClaimActions = useAppSelector(selectTcyClaimActionsByWallet)

  const hasClaimable = useMemo(
    () => tcyClaimActions.some(claim => claim.status === ActionStatus.ClaimAvailable),
    [tcyClaimActions],
  )

  if (!hasClaimable) {
    return null
  }

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
