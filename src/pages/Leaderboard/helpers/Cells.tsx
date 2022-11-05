import {
  Box,
  HStack,
  SkeletonCircle,
  SkeletonText,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import { AssetIcon } from 'components/AssetSearchKK/AssetIcon'
import { RawText } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

type AssetCellProps = {
  geckoId: string
  subText?: string
  postFix?: string
  showTeaser?: boolean
  opportunityName?: string
}

const buildRowTitle = (asset: Asset, postFix?: string, showAssetSymbol?: boolean): string => {
  if (showAssetSymbol && postFix) {
    return `${asset.symbol} ${postFix}`
  }

  if (showAssetSymbol) {
    return asset.symbol
  }

  if (postFix) {
    return `${asset.name} ${postFix}`
  }

  return asset.name
}

export const AssetCell = ({ geckoId, subText, postFix }: AssetCellProps) => {
  const linkColor = useColorModeValue('black', 'white')

  const { getKeepkeyAssets } = useKeepKey()
  const assets = getKeepkeyAssets()

  const asset = assets.find(asset => asset.geckoId === geckoId)

  if (!asset) return null

  const rowTitle = buildRowTitle(asset, postFix, true)

  return (
    <HStack width='full' data-test='defi-earn-asset-row'>
      <HStack flex={1}>
        <SkeletonCircle isLoaded={!!asset} mr={2}>
          <AssetIcon asset={asset} boxSize='8' />
        </SkeletonCircle>
        <SkeletonText noOfLines={2} isLoaded={!!asset} flex={1}>
          <Stack spacing={0} flex={1}>
            <HStack>
              <Box
                position='relative'
                overflow='hidden'
                height='20px'
                width='full'
                title={rowTitle}
                data-test={`account-row-asset-name-${asset.symbol}`}
                _after={{
                  content: 'attr(title)',
                  overflow: 'hidden',
                  height: 0,
                  display: 'block',
                }}
              >
                <RawText
                  fontWeight='medium'
                  as='span'
                  position='absolute'
                  lineHeight='shorter'
                  noOfLines={1}
                  display='block'
                  maxWidth='100%'
                  color={linkColor}
                >
                  {rowTitle}
                </RawText>
              </Box>
            </HStack>
            {subText && (
              <RawText fontSize='sm' color='gray.500' lineHeight='shorter'>
                {subText}
              </RawText>
            )}
          </Stack>
        </SkeletonText>
      </HStack>
    </HStack>
  )
}
