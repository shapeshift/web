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
  Stack
} from '@chakra-ui/react'
import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import {
  selectAssetByCAIP19,
  useGetAssetDescriptionQuery
} from 'state/slices/assetsSlice/assetsSlice'
import { useAppSelector } from 'state/store'

export const AssetTeaser = ({ assetId }: { assetId: CAIP19 }) => {
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const { description, icon, name } = asset || {}
  const { isLoading } = useGetAssetDescriptionQuery(assetId, { skip: !!description })
  const url = useMemo(() => {
    if (!assetId) return ''
    const { chain, tokenId } = caip19.fromCAIP19(assetId)
    let baseUrl = `/assets/${chain}`
    if (tokenId) baseUrl = baseUrl + `/${tokenId}`
    return baseUrl
  }, [assetId])
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
            View Asset
          </Button>
        </PopoverFooter>
      </PopoverContent>
    </Portal>
  )
}
