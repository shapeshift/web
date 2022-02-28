import {
  Box,
  HStack,
  Popover,
  PopoverTrigger,
  SkeletonCircle,
  SkeletonText,
  Stack
} from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { debounce } from 'lodash'
import { version } from 'process'
import { useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetTeaser } from './AssetTeaser'

type AssetCellProps = {
  assetId: CAIP19
  provider: string
  showTeaser?: boolean
}
export const AssetCell = ({ assetId, provider, showTeaser }: AssetCellProps) => {
  const [showPopover, setShowPopover] = useState(false)
  const debouncedHandleMouseEnter = debounce(() => setShowPopover(true), 100)
  const handleOnMouseLeave = debouncedHandleMouseEnter.cancel
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  if (!asset) return null

  return (
    <HStack width='full'>
      {showTeaser && (
        <Popover isOpen={showPopover} onClose={() => setShowPopover(false)}>
          <PopoverTrigger>
            <Box onMouseEnter={debouncedHandleMouseEnter} onMouseLeave={handleOnMouseLeave}>
              <FaInfoCircle />
            </Box>
          </PopoverTrigger>
          {showPopover && <AssetTeaser assetId={assetId} />}
        </Popover>
      )}
      <SkeletonCircle isLoaded={!!asset}>
        <AssetIcon src={asset.icon} boxSize='8' />
      </SkeletonCircle>
      <SkeletonText noOfLines={2} isLoaded={!!asset} flex={1}>
        <Stack spacing={0} flex={1}>
          <HStack>
            <Box
              position='relative'
              overflow='hidden'
              height='20px'
              title={`${asset.name} (${version})`}
              _after={{
                content: 'attr(title)',
                overflow: 'hidden',
                height: 0,
                display: 'block'
              }}
            >
              <RawText
                fontWeight='bold'
                as='span'
                position='absolute'
                lineHeight='shorter'
                isTruncated
                display='block'
                maxWidth='100%'
              >{`${asset.name} (${version})`}</RawText>
            </Box>
          </HStack>
          <RawText fontSize='sm' color='gray.500' lineHeight='shorter'>
            {provider}
          </RawText>
        </Stack>
      </SkeletonText>
    </HStack>
  )
}
