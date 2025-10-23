import { Box, Stack } from '@chakra-ui/react'
import type { RenderProps } from '@chakra-ui/react/dist/types/toast/toast.types'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { ActionIcon } from '../ActionIcon'
import { ActionStatusTag } from '../ActionStatusTag'

import { Text } from '@/components/Text/Text'
import { StandardToast } from '@/components/Toast/StandardToast'
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

  const icon = useMemo(() => {
    return <ActionIcon assetId={tcyAssetId} status={ActionStatus.ClaimAvailable} />
  }, [])

  const title = useMemo(() => {
    return (
      <Stack spacing={1}>
        <Text
          fontSize='sm'
          fontWeight='semibold'
          letterSpacing='0.02em'
          translation={'TCY.claimNow'}
        />
        <Box flexGrow={0}>
          <ActionStatusTag status={ActionStatus.ClaimAvailable} />
        </Box>
      </Stack>
    )
  }, [])

  if (!hasClaimable) {
    return null
  }

  return <StandardToast icon={icon} title={title} onClick={handleClick} onClose={onClose} />
}
