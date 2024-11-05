import type { CardProps } from '@chakra-ui/react'
import { useMemo } from 'react'

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
  const cardProps: CardProps = useMemo(
    () => ({
      ml,
      height,
      width,
    }),
    [ml, height, width],
  )

  return (
    <HorizontalCollapse isOpen={isOpen} width={width} height={height}>
      <QuoteList cardProps={cardProps} isLoading={isLoading} />
    </HorizontalCollapse>
  )
}
