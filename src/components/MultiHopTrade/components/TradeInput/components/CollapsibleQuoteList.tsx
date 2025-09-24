import type { CardProps } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'

import type { QuotesComponentProps } from '../../QuoteList/QuoteList'
import { QuoteList } from '../../QuoteList/QuoteList'
import { HorizontalCollapse } from './HorizontalCollapse'

export type CollapsibleQuoteListProps = {
  isOpen: boolean
  width: string | number
  height: string | number
  ml: CardProps['ml']
  QuotesComponent?: React.FC<QuotesComponentProps>
}

export const CollapsibleQuoteList: React.FC<CollapsibleQuoteListProps> = ({
  isOpen,
  width,
  height,
  ml,
  QuotesComponent,
}) => {
  const borderColor = useColorModeValue('border.base', 'transparent') // Patch styling: border to remedy box shadow cut off in light mode

  const cardProps: CardProps = useMemo(
    () => ({
      ml,
      height,
      borderWidth: '1px',
      borderColor,
    }),
    [ml, height, borderColor],
  )

  return (
    <HorizontalCollapse isOpen={isOpen} width={width} height={height}>
      <QuoteList cardProps={cardProps} QuotesComponent={QuotesComponent} />
    </HorizontalCollapse>
  )
}
