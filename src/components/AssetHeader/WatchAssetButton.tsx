import { IconButton } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { FaRegStar, FaStar } from 'react-icons/fa'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectIsAssetIdWatched } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

const starEmpty = <FaRegStar />
const starFilled = <FaStar />

type WatchAssetButtonProps = {
  assetId: AssetId
}

export const WatchAssetButton: React.FC<WatchAssetButtonProps> = ({ assetId }) => {
  const appDispatch = useAppDispatch()
  const isAssetIdWatched = useAppSelector(state => selectIsAssetIdWatched(state, assetId))
  const handleToggleWatchAsset = useCallback(() => {
    if (isAssetIdWatched) {
      appDispatch(preferences.actions.removeWatchedAssetId(assetId))
    } else {
      appDispatch(preferences.actions.addWatchedAssetId(assetId))
    }
  }, [appDispatch, assetId, isAssetIdWatched])
  return (
    <IconButton
      onClick={handleToggleWatchAsset}
      icon={isAssetIdWatched ? starFilled : starEmpty}
      aria-label='favorite asset'
      isRound
      variant='ghost'
      fontSize='2xl'
    />
  )
}
