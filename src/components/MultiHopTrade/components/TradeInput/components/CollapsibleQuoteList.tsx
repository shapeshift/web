import type { CardProps } from '@chakra-ui/react'

import { QuoteList } from '../../QuoteList/QuoteList'
import { HorizontalCollapse } from './HorizontalCollapse'

export type CollapsibleQuoteListProps = {
  isOpen: boolean
  width: string | number
  height: string | number
  isLoading: boolean
  ml: CardProps['ml']
}

export const CollapsibleQuoteList: React.FC<CollapsibleQuoteListProps> = ({
  isOpen,
  width,
  height,
  isLoading,
  ml,
}) => {
  return (
    <HorizontalCollapse isOpen={isOpen} width={width} height={height}>
      <QuoteList ml={ml} isLoading={isLoading} height={height} />
    </HorizontalCollapse>
  )
}
