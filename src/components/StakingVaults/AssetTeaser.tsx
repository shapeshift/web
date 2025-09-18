import {
  Button,
  HStack,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  Portal,
  SkeletonText,
  Stack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'

import { AssetIcon } from '@/components/AssetIcon'
import { RawText, Text } from '@/components/Text'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from '@/hooks/useModal/useModal'
import { useGetAssetDescriptionQuery } from '@/state/slices/assetsSlice/assetsSlice'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from '@/state/store'

export const AssetTeaser = ({ assetId }: { assetId: AssetId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { description, icon, name } = asset || {}
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)
  const { navigate } = useBrowserRouter()
  const walletDrawer = useModal('walletDrawer')
  const { isLoading } = useGetAssetDescriptionQuery(
    { assetId, selectedLocale },
    { skip: !!description },
  )

  const handleViewAsset = useCallback(() => {
    if (assetId) {
      if (walletDrawer.isOpen) {
        walletDrawer.close()
      }
      navigate(`/assets/${assetId}`)
    }
  }, [assetId, navigate, walletDrawer])
  return (
    <Portal>
      <PopoverContent>
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader fontWeight='bold' border={0}>
          <HStack>
            <AssetIcon src={icon} />
            <RawText>{name}</RawText>
          </HStack>
        </PopoverHeader>
        <PopoverBody>
          <Stack>
            <SkeletonText noOfLines={4} isLoaded={!isLoading}>
              <RawText noOfLines={4} fontWeight='normal'>
                {description && description}
              </RawText>
            </SkeletonText>
          </Stack>
        </PopoverBody>
        <PopoverFooter border={0}>
          <Button size='sm' width='full' onClick={handleViewAsset}>
            <Text translation='common.viewAsset' />
          </Button>
        </PopoverFooter>
      </PopoverContent>
    </Portal>
  )
}
