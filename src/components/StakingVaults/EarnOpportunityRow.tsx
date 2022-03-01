import { Box, HStack } from '@chakra-ui/layout'
import {
  Popover,
  PopoverTrigger,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stack,
  Td,
  Tr,
  useMediaQuery
} from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { CAIP19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-yearn'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { debounce } from 'lodash'
import { useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { AssetTeaser } from './AssetTeaser'

type EarnOpportunityRowProps = {
  isLoaded?: boolean
  index: number
  showTeaser?: boolean
  assetId: CAIP19
  icon?: string
  onClick: () => void
} & EarnOpportunityType

export const EarnOpportunityRow = ({
  type,
  provider,
  tvl,
  version,
  index,
  showTeaser,
  assetId,
  apy,
  fiatAmount,
  onClick
}: EarnOpportunityRowProps) => {
  const [isLargerThanMd, isLargerThanLg] = useMediaQuery([
    `(min-width: ${breakpoints['md']})`,
    `(min-width: ${breakpoints['lg']})`
  ])
  const [showPopover, setShowPopover] = useState(false)

  const debouncedHandleMouseEnter = debounce(() => setShowPopover(true), 100)
  const handleOnMouseLeave = debouncedHandleMouseEnter.cancel
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const handleClick = () => {
    if (showPopover) return
    onClick()
  }

  return (
    <Tr onClick={handleClick} tabIndex={index}>
      {isLargerThanMd && (
        <Td>
          <Skeleton isLoaded={!!index}>
            <RawText color='gray.500'>{index}</RawText>
          </Skeleton>
        </Td>
      )}

      <Td>
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
                  width='full'
                  title={`${metadata.displayName} (${version})`}
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
      </Td>
      <Td display={{ base: 'none', lg: 'table-cell' }}>
        <Skeleton isLoaded={!!type}>
          <Tag textTransform='capitalize'>{type}</Tag>
        </Skeleton>
      </Td>
      {isLargerThanMd && (
        <Td>
          <Skeleton isLoaded={!!apy}>
            <Tag colorScheme='green'>
              <Amount.Percent value={apy ? apy : '0'} />
            </Tag>
          </Skeleton>
        </Td>
      )}

      {isLargerThanLg && (
        <Td borderRightRadius='lg'>
          <Skeleton isLoaded={!!tvl}>
            <Amount.Fiat value={tvl} />
          </Skeleton>
        </Td>
      )}
      <Td textAlign='right'>
        <Skeleton isLoaded={!!fiatAmount}>
          {fiatAmount && bnOrZero(fiatAmount).gt(0) ? (
            <Stack>
              <Amount.Fiat value={fiatAmount} color='green.500' />
            </Stack>
          ) : (
            <RawText>-</RawText>
          )}
        </Skeleton>
      </Td>
    </Tr>
  )
}
