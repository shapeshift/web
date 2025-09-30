import { Box, Button, Divider, Link, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'
import { isToken } from '@shapeshiftoss/utils'
import { useCallback, useMemo, useState } from 'react'
import { TbExternalLink, TbFlag, TbStar, TbStarFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { Display } from '../Display'
import { DialogHeader } from '../Modal/components/DialogHeader'
import { QuickBuy } from './QuickBuy'
import { QuickBuyEdit } from './QuickBuyEdit'

import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isNativeHDWallet } from '@/lib/utils'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const starIcon = <TbStar />
const fullStarIcon = <TbStarFilled />
const linkIcon = <TbExternalLink />
const flagIcon = <TbFlag />

export type AssetActionsDrawerProps = {
  assetId: AssetId
}

export const AssetActionsDrawer: React.FC<AssetActionsDrawerProps> = ({ assetId }) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const { close: onClose, isOpen } = useModal('assetActionsDrawer')
  const [isEditingQuickBuy, setIsEditingQuickBuy] = useState(false)

  const {
    state: { isConnected, wallet },
  } = useWallet()

  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const spamMarkedAssetIds = useAppSelector(preferences.selectors.selectSpamMarkedAssetIds)
  const watchlistAssetIds = useAppSelector(preferences.selectors.selectWatchedAssetIds)
  const featureFlags = useAppSelector(preferences.selectors.selectFeatureFlags)

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

    // This is currently borked upstream and we're not yet sure if that's an intermittent issue
    // or if deprecated and docs are stale, no reason to fire an XHR that will be guaranteed to fail
    // if (!isSpamMarked) await moralisReportSpam(assetId)
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

  const handleEditAmounts = useCallback(() => {
    setIsEditingQuickBuy(true)
  }, [])

  const handleCancelEditAmounts = useCallback(() => {
    setIsEditingQuickBuy(false)
  }, [])

  return (
    <Display.Mobile>
      <Dialog isOpen={isOpen} onClose={onClose} height='auto'>
        <DialogHeader padding={0} /> {/* For grab handle */}
        <DialogBody
          pt={8}
          px={0}
          pb='calc(env(safe-area-inset-bottom) + var(--safe-area-inset-bottom) + 32px)'
        >
          {isEditingQuickBuy && featureFlags.QuickBuy && (
            <QuickBuyEdit onCancel={handleCancelEditAmounts} onSave={handleCancelEditAmounts} />
          )}
          {!isEditingQuickBuy && (
            <Stack spacing={0}>
              {isConnected &&
                wallet &&
                isNativeHDWallet(wallet) &&
                !isNft(assetId) &&
                featureFlags.QuickBuy && (
                  <>
                    <Box px={6}>
                      <QuickBuy assetId={assetId} onEditAmounts={handleEditAmounts} />
                    </Box>
                    <Divider pt={6} />
                  </>
                )}
              <Button
                variant='ghost'
                px={6}
                leftIcon={isWatchlistMarked ? fullStarIcon : starIcon}
                onClick={handleWatchAsset}
                justifyContent='flex-start'
                width='full'
                height={14}
                size='lg'
                fontSize='md'
              >
                {isWatchlistMarked ? translate('watchlist.remove') : translate('watchlist.add')}
              </Button>
              {explorerHref !== undefined && (
                <Link href={explorerHref} isExternal>
                  <Button
                    variant='ghost'
                    px={6}
                    height={14}
                    width='full'
                    leftIcon={linkIcon}
                    onClick={onClose}
                    justifyContent='flex-start'
                    size='lg'
                    fontSize='md'
                  >
                    {translate('common.viewOnExplorer')}
                  </Button>
                </Link>
              )}
              <Button
                variant='ghost'
                px={6}
                width='full'
                height={14}
                color='red.400'
                leftIcon={flagIcon}
                onClick={handleToggleSpam}
                justifyContent='flex-start'
                size='lg'
                fontSize='md'
              >
                {isSpamMarked ? translate('assets.showAsset') : translate('assets.hideAsset')}
              </Button>
            </Stack>
          )}
        </DialogBody>
      </Dialog>
    </Display.Mobile>
  )
}
