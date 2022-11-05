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
import type { AssetId } from '@keepkey/caip'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById, selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const AssetTeaser = ({ assetId }: { assetId: AssetId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { description, icon, name } = asset || {}
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const { isLoading } = useGetAssetDescriptionQuery(
    { assetId, selectedLocale },
    { skip: !!description },
  )
  const url = useMemo(() => (assetId ? `/assets/${assetId}` : ''), [assetId])
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
          <Button size='sm' width='full' as={Link} to={url}>
            <Text translation='common.viewAsset' />
          </Button>
        </PopoverFooter>
      </PopoverContent>
    </Portal>
  )
}
