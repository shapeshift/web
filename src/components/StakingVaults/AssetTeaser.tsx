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
import { CAIP19 } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const AssetTeaser = ({ assetId }: { assetId: CAIP19 }) => {
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const { description, icon, name } = asset || {}
  const { isLoading } = useGetAssetDescriptionQuery(assetId, { skip: !!description })
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
          <Button size='sm' isFullWidth as={Link} to={url}>
            <Text translation='common.viewAsset' />
          </Button>
        </PopoverFooter>
      </PopoverContent>
    </Portal>
  )
}
