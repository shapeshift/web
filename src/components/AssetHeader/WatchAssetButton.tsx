import type { IconButtonProps } from '@chakra-ui/react'
import { IconButton } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { FaRegStar, FaStar } from 'react-icons/fa'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectIsAssetIdWatched } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

const starEmpty = <FaRegStar />
const starFilled = <FaStar />

type WatchAssetButtonProps = Partial<IconButtonProps> & {
  assetId: AssetId
}

export const WatchAssetButton: React.FC<WatchAssetButtonProps> = ({ assetId, ...props }) => {
  const appDispatch = useAppDispatch()
  const isAssetIdWatched = useAppSelector(state => selectIsAssetIdWatched(state, assetId))
  const handleToggleWatchAsset: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    e => {
      e.stopPropagation()
      appDispatch(preferences.actions.toggleWatchedAssetId(assetId))
    },
    [appDispatch, assetId],
  )
  return (
    <IconButton
      onClick={handleToggleWatchAsset}
      icon={isAssetIdWatched ? starFilled : starEmpty}
      isRound
      size='sm'
      ml={2}
      aria-label='favorite asset'
      {...props}
    />
  )
}
