import { Button, Link, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'
import { isToken } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { TbExternalLink, TbFlag, TbStar, TbStarFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { DialogHeader } from '../Modal/components/DialogHeader'
import { DialogTitle } from '../Modal/components/DialogTitle'

import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const starIcon = <TbStar />
const fullStarIcon = <TbStarFilled />
const linkIcon = <TbExternalLink />
const flagIcon = <TbFlag />

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

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const spamMarkedAssetIds = useAppSelector(preferences.selectors.selectSpamMarkedAssetIds)
  const watchlistAssetIds = useAppSelector(preferences.selectors.selectWatchedAssetIds)

  const isSpamMarked = spamMarkedAssetIds.includes(assetId)
  const isWatchlistMarked = watchlistAssetIds.includes(assetId)

  const handleFavoriteAsset = useCallback(() => {
    dispatch(preferences.actions.toggleWatchedAssetId(assetId))
    onClose()
  }, [assetId, dispatch, onClose])

  const href = (() => {
    if (!asset) return
    const { assetReference } = fromAssetId(asset.assetId)

    if (isNft(asset.assetId)) {
      const [token] = assetReference.split('/')
      return `${asset.explorer}/token/${token}?a=${asset.id}`
    }

    if (isToken(asset.assetId)) return `${asset?.explorerAddressLink}${assetReference}`

    return asset.explorer
  })()

  const handleToggleSpam = useCallback(() => {
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
      <DialogBody pb={4} pl={0} pr={0}>
        <Stack spacing={0}>
          <Button
            variant='ghost'
            px={6}
            leftIcon={isWatchlistMarked ? fullStarIcon : starIcon}
            onClick={handleFavoriteAsset}
            justifyContent='flex-start'
            height={14}
            size='lg'
            fontSize='md'
          >
            {isWatchlistMarked
              ? translate('common.unfavoriteAsset')
              : translate('common.favoriteAsset')}
          </Button>
          <Link href={href} isExternal>
            <Button
              variant='ghost'
              px={6}
              height={14}
              leftIcon={linkIcon}
              onClick={onClose}
              justifyContent='flex-start'
              size='lg'
              fontSize='md'
            >
              {translate('common.viewOnExplorer')}
            </Button>
          </Link>
          <Button
            variant='ghost'
            px={6}
            height={14}
            color='red.400'
            leftIcon={flagIcon}
            onClick={handleToggleSpam}
            justifyContent='flex-start'
            size='lg'
            fontSize='md'
          >
            {isSpamMarked ? translate('common.reportAsNotSpam') : translate('common.reportAsSpam')}
          </Button>
        </Stack>
      </DialogBody>
    </Dialog>
  )
}
