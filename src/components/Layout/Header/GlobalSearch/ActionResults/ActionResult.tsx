import { ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, forwardRef } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { IconCircle } from 'components/IconCircle'
import { RawText } from 'components/Text'
import { firstFourLastFour } from 'state/slices/portfolioSlice/utils'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType } from 'state/slices/search-selectors'

import { ResultButton } from '../ResultButton'

type ActionResultProps = {
  assetId: AssetId
  index: number
  activeIndex?: number
  onClick: (arg: GlobalSearchResult) => void
  address: string
  vanityAddress: string
}

export const ActionResult = forwardRef<ActionResultProps, 'div'>(
  ({ assetId, address, vanityAddress, index, activeIndex, onClick }, ref) => {
    const selected = index === activeIndex

    return (
      <ResultButton
        ref={ref}
        aria-selected={selected ? true : undefined}
        onClick={() =>
          onClick({ type: GlobalSearchResultType.Send, id: assetId, address, vanityAddress })
        }
      >
        <Flex gap={2} flex={1} alignItems='center' justifyContent='flex-start' textAlign='left'>
          <IconCircle boxSize={8}>
            <ArrowUpIcon />
          </IconCircle>
          <RawText
            color='chakra-body-text'
            width='100%'
            textOverflow='ellipsis'
            overflow='hidden'
            whiteSpace='nowrap'
          >
            {`Send to ${vanityAddress || firstFourLastFour(address)}`}
          </RawText>
        </Flex>
      </ResultButton>
    )
  },
)
