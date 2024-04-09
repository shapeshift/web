import type { ButtonProps } from '@chakra-ui/react'
import { IconButton } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { FaRegStar, FaStar } from 'react-icons/fa'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectIsAssetWatched } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

const starEmpty = <FaRegStar />
const starFilled = <FaStar />

type WatchAssetButtonProps = {
  assetId: AssetId
  buttonProps?: ButtonProps
}

export const WatchAssetButton: React.FC<WatchAssetButtonProps> = ({ assetId, buttonProps }) => {
  const appDispatch = useAppDispatch()
  const isAssetWatched = useAppSelector(state => selectIsAssetWatched(state, assetId))
  const handleToggleWatchAsset = useCallback(() => {
    if (isAssetWatched) {
      appDispatch(preferences.actions.removeWatchedAsset(assetId))
    } else {
      appDispatch(preferences.actions.addWatchedAsset(assetId))
    }
  }, [appDispatch, assetId, isAssetWatched])
  return (
    <IconButton
      onClick={handleToggleWatchAsset}
      icon={isAssetWatched ? starFilled : starEmpty}
      aria-label='favorite asset'
      {...buttonProps}
    />
  )
}
