import { SimpleGrid } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useParams } from 'react-router'
import { Display } from 'components/Display'

import type { MarketsCategories } from '../constants'

export const MarketGrid: React.FC<PropsWithChildren> = ({ children }) => {
  const params: { category?: MarketsCategories } = useParams()
  const isCategoryRoute = params.category

  if (isCategoryRoute) {
    return (
      <SimpleGrid gridTemplateColumns='repeat(auto-fill, minmax(300px, 1fr))' gap={4}>
        {children}
      </SimpleGrid>
    )
  }
  return (
    <Display>
      <Display.Desktop>
        <SimpleGrid gridTemplateColumns='repeat(auto-fill, minmax(300px, 1fr))' gap={4}>
          {children}
        </SimpleGrid>
      </Display.Desktop>
      <Display.Mobile>
        <SimpleGrid
          gridAutoColumns='minmax(330px, 1fr)'
          gridAutoFlow='column'
          overflowY='auto'
          scrollBehavior='smooth'
          scrollSnapAlign='start'
          gap={4}
          mx={-4}
          px={4}
        >
          {children}
        </SimpleGrid>
      </Display.Mobile>
    </Display>
  )
}
