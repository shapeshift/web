import { ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, forwardRef } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
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
  searchQuery: string
}

export const ActionResult = forwardRef<ActionResultProps, 'div'>(
  ({ assetId, searchQuery, index, activeIndex, onClick }, ref) => {
    const selected = index === activeIndex
    return (
      <ResultButton
        ref={ref}
        aria-selected={selected ? true : undefined}
        onClick={() => onClick({ type: GlobalSearchResultType.Send, id: assetId })}
      >
        <Flex gap={2} flex={1}>
          <ArrowUpIcon />
          <Flex flexDir='column' alignItems='flex-start' textAlign='left'>
            <RawText
              color='chakra-body-text'
              width='100%'
              textOverflow='ellipsis'
              overflow='hidden'
              whiteSpace='nowrap'
            >
              {`Send to ${firstFourLastFour(searchQuery)}`}
            </RawText>
          </Flex>
        </Flex>
      </ResultButton>
    )
  },
)
