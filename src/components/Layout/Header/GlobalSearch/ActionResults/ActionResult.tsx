import { ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, forwardRef } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'

import { ResultButton } from '../ResultButton'

import { IconCircle } from '@/components/IconCircle'
import { RawText } from '@/components/Text'
import { firstFourLastFour } from '@/lib/utils'
import type { GlobalSearchResult } from '@/state/slices/search-selectors'
import { GlobalSearchResultType } from '@/state/slices/search-selectors'

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

    const handleSendSearchResultTypeClick = useCallback(() => {
      onClick({ type: GlobalSearchResultType.Send, id: assetId, address, vanityAddress })
    }, [address, assetId, onClick, vanityAddress])

    return (
      <ResultButton
        ref={ref}
        aria-selected={selected ? true : undefined}
        onClick={handleSendSearchResultTypeClick}
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
