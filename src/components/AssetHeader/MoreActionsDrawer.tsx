import { Box, Button, Portal, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { FaEye, FaFlag, FaStar } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { SlideTransition } from '@/components/SlideTransition'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const starIcon = <FaStar />
const eyeIcon = <FaEye />
const flagIcon = <FaFlag />

type MoreActionsDrawerProps = {
  assetId: AssetId
  onClose: () => void
}

export const MoreActionsDrawer: React.FC<MoreActionsDrawerProps> = ({ assetId, onClose }) => {
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
    <Portal>
      <Box
        position='fixed'
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg='blackAlpha.600'
        zIndex={1400}
        onClick={onClose}
      >
        <Box
          position='fixed'
          bottom={0}
          left={0}
          right={0}
          bg='gray.900'
          borderTopRadius='lg'
          onClick={e => e.stopPropagation()}
        >
          <SlideTransition>
            <DialogBody>
              <Stack spacing={0} pb={4}>
                <Button
                  variant='ghost'
                  colorScheme='blue'
                  leftIcon={starIcon}
                  onClick={handleFavoriteAsset}
                  justifyContent='flex-start'
                >
                  {translate('common.favoriteAsset')}
                </Button>
                <Button
                  variant='ghost'
                  colorScheme='blue'
                  leftIcon={eyeIcon}
                  onClick={handleViewOnExplorer}
                  justifyContent='flex-start'
                >
                  {translate('common.viewOnExplorer')}
                </Button>
                <Button
                  variant='ghost'
                  colorScheme={isSpamMarked ? 'blue' : 'red'}
                  leftIcon={flagIcon}
                  onClick={handleToggleSpam}
                  justifyContent='flex-start'
                >
                  {isSpamMarked
                    ? translate('common.reportAsNotSpam')
                    : translate('common.reportAsSpam')}
                </Button>
              </Stack>
            </DialogBody>
            <DialogFooter />
          </SlideTransition>
        </Box>
      </Box>
    </Portal>
  )
}
