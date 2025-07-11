import type { CardProps } from '@chakra-ui/react'
import { useMemo } from 'react'

import { QuoteList } from '../../QuoteList/QuoteList'
import { HorizontalCollapse } from './HorizontalCollapse'

export type CollapsibleQuoteListProps = {
  isOpen: boolean
  width: string | number
  height: string | number
  ml: CardProps['ml']
}

export const CollapsibleQuoteList: React.FC<CollapsibleQuoteListProps> = ({
  isOpen,
  width,
  height,
  ml,
}) => {
  const cardProps: CardProps = useMemo(
    () => ({
      ml,
      height,
    }),
    [ml, height],
  )

  return (
    <HorizontalCollapse isOpen={isOpen} width={width} height={height}>
      <QuoteList cardProps={cardProps} />
    </HorizontalCollapse>
  )
}
