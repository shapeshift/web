import { Box, Button, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { FaEye, FaFlag, FaStar } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { DialogBackButton } from '../Modal/components/DialogBackButton'
import { DialogHeader } from '../Modal/components/DialogHeader'
import { DialogTitle } from '../Modal/components/DialogTitle'

const starIcon = <FaStar />
const eyeIcon = <FaEye />
const flagIcon = <FaFlag />

type MoreActionsDrawerProps = {
  assetId: AssetId
  isOpen: boolean
  onClose: () => void
}

export const MoreActionsDrawer: React.FC<MoreActionsDrawerProps> = ({
  assetId,
  isOpen,
  onClose,
}) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()

  const spamMarkedAssetIds = useAppSelector(preferences.selectors.selectSpamMarkedAssetIds)
  const isSpamMarked = spamMarkedAssetIds.includes(assetId)

  const handleFavoriteAsset = useCallback(() => {
    console.log('Favorite asset clicked:', assetId)
    dispatch(preferences.actions.toggleWatchedAssetId(assetId))
    onClose()
  }, [assetId, dispatch, onClose])

  const handleViewOnExplorer = useCallback(() => {
    console.log('View on explorer clicked:', assetId)
    onClose()
  }, [assetId, onClose])

  const handleToggleSpam = useCallback(() => {
    console.log('Toggle spam clicked:', assetId)
    dispatch(preferences.actions.toggleSpamMarkedAssetId(assetId))
    onClose()
  }, [assetId, dispatch, onClose])

  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto'>
      <DialogHeader padding={0}>
        <DialogHeader.Middle>
          <DialogTitle color='transparent'>More asset actions</DialogTitle>
        </DialogHeader.Middle>
      </DialogHeader>
      <DialogBody pb={4}>
        <Stack spacing={0}>
          <Button
            variant='ghost'
            colorScheme='blue'
            leftIcon={starIcon}
            onClick={handleFavoriteAsset}
            justifyContent='flex-start'
            size='lg'
            py={4}
          >
            {translate('common.favoriteAsset')}
          </Button>
          <Button
            variant='ghost'
            colorScheme='blue'
            leftIcon={eyeIcon}
            onClick={handleViewOnExplorer}
            justifyContent='flex-start'
            size='lg'
            py={4}
          >
            {translate('common.viewOnExplorer')}
          </Button>
          <Button
            variant='ghost'
            colorScheme={isSpamMarked ? 'blue' : 'red'}
            leftIcon={flagIcon}
            onClick={handleToggleSpam}
            justifyContent='flex-start'
            size='lg'
            py={4}
          >
            {isSpamMarked ? translate('common.reportAsNotSpam') : translate('common.reportAsSpam')}
          </Button>
        </Stack>
      </DialogBody>
    </Dialog>
  )
}
