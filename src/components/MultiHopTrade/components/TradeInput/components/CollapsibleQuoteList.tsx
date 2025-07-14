import type { CardProps } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/react'
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
  // Patch styling: border to remedy box shadow cut off in light mode
  const isDarkMode = useColorModeValue(false, true)
  const borderStyle = useMemo(
    () =>
      isDarkMode
        ? {}
        : { borderColor: 'border.base', borderWidth: '1px', borderBottomWidth: '2px' },
    [isDarkMode],
  )

  const cardProps: CardProps = useMemo(
    () => ({
      ml,
      height,
      ...borderStyle,
    }),
    [ml, height, borderStyle],
  )

  return (
    <HorizontalCollapse isOpen={isOpen} width={width} height={height}>
      <QuoteList cardProps={cardProps} isLoading={isLoading} />
    </HorizontalCollapse>
  )
}
