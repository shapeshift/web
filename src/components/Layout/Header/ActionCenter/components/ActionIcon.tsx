import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { ActionStatusIcon } from './ActionStatusIcon'

import { AssetIconWithBadge } from '@/components/AssetIconWithBadge'
import type { ActionStatus } from '@/state/slices/actionSlice/types'

type ActionIconProps = {
  assetId: AssetId
  secondaryAssetId?: AssetId
  status: ActionStatus
}

export const ActionIcon = ({ assetId, secondaryAssetId, status }: ActionIconProps) => {
  return useMemo(
    () => (
      <AssetIconWithBadge assetId={assetId} secondaryAssetId={secondaryAssetId} size='md'>
        <ActionStatusIcon status={status} />
      </AssetIconWithBadge>
    ),
    [assetId, secondaryAssetId, status],
  )
}
