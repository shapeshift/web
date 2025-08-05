import { Button, Link, Stack, VisuallyHidden } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'
import { isToken } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
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

  const isSpamMarked = useMemo(
    () => spamMarkedAssetIds.includes(assetId),
    [assetId, spamMarkedAssetIds],
  )
  const isWatchlistMarked = useMemo(
    () => watchlistAssetIds.includes(assetId),
    [assetId, watchlistAssetIds],
  )

  const handleWatchAsset = useCallback(() => {
    dispatch(preferences.actions.toggleWatchedAssetId(assetId))
    onClose()
  }, [assetId, dispatch, onClose])

  const handleToggleSpam = useCallback(() => {
    dispatch(preferences.actions.toggleSpamMarkedAssetId(assetId))
    onClose()
  }, [assetId, dispatch, onClose])

  const explorerHref = useMemo(() => {
    if (!asset) return
    const { assetReference } = fromAssetId(asset.assetId)

    if (isNft(asset.assetId)) {
      const [token] = assetReference.split('/')
      return `${asset.explorer}/token/${token}?a=${asset.id}`
    }

    if (isToken(asset.assetId)) return `${asset?.explorerAddressLink}${assetReference}`

    return asset.explorer
  }, [asset])

  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto'>
      <DialogHeader padding={0} /> {/* For grab handle */}
      <DialogBody py={4} px={0}>
        <Stack spacing={0}>
          <Button
            variant='ghost'
            px={6}
            leftIcon={isWatchlistMarked ? fullStarIcon : starIcon}
            onClick={handleWatchAsset}
            justifyContent='flex-start'
            height={14}
            size='lg'
            fontSize='md'
          >
            {isWatchlistMarked
              ? translate('assets.unfavoriteAsset')
              : translate('assets.favoriteAsset')}
          </Button>
          <Link href={explorerHref} isExternal>
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
            {isSpamMarked
              ? translate('assets.spam.reportAsNotSpam')
              : translate('assets.spam.reportAsSpam')}
          </Button>
        </Stack>
      </DialogBody>
    </Dialog>
  )
}
