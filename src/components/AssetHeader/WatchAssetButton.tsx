import type { BoxProps } from '@chakra-ui/react'
import { Box, Icon } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { FaRegStar, FaStar } from 'react-icons/fa'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectIsAssetIdWatched } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

type WatchAssetButtonProps = Partial<BoxProps> & {
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
    <Box
      as='span'
      display='inline-flex'
      justifyContent='center'
      alignItems='center'
      minWidth='auto'
      borderRadius='full'
      bg='var(--chakra-colors-background-button-secondary-base)'
      // eslint-disable-next-line react-memo/require-usememo
      _hover={{ bg: 'var(--chakra-colors-background-button-secondary-hover)' }}
      p={2}
      ml={2}
      aria-label='favorite asset'
      onClick={handleToggleWatchAsset}
      {...props}
    >
      <Icon as={isAssetIdWatched ? FaStar : FaRegStar} />
    </Box>
  )
}
