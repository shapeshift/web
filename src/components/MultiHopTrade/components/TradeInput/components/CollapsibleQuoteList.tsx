import type { CardProps } from '@chakra-ui/react'

import { QuoteList } from '../../QuoteList/QuoteList'
import { HorizontalCollapse } from './HorizontalCollapse'

export type CollapsibleQuoteListProps = {
  isOpen: boolean
  width: string | number
  height: string | number
  isLoading: boolean
} & CardProps

export const CollapsibleQuoteList = ({
  isOpen,
  width,
  height,
  isLoading,
  ml,
}: CollapsibleQuoteListProps) => {
  return (
    <HorizontalCollapse isOpen={isOpen} width={width} height={height}>
      <QuoteList ml={ml} isLoading={isLoading} height={height} />
    </HorizontalCollapse>
  )
}
