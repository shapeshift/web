import type { GridProps, SimpleGridProps } from '@chakra-ui/react'
import { SimpleGrid } from '@chakra-ui/react'

export const opportunityRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '1fr repeat(2, 170px)',
}

const gridTemplateColumns = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '1fr repeat(2, 170px)',
}

const gridPaddingX = { base: 4, md: 6 }

const gridTop = { base: 'calc(71px + 107px)', md: '135px' }

export const OpportunityTableHeader: React.FC<SimpleGridProps> = props => {
  return (
    <SimpleGrid
      gridTemplateColumns={gridTemplateColumns}
      color='text.subtle'
      bg='background.surface.raised.base'
      top={gridTop}
      textTransform='uppercase'
      fontSize='xs'
      letterSpacing='0.02em'
      fontWeight='bold'
      borderBottomWidth={1}
      borderColor='border.base'
      columnGap={4}
      py={2}
      px={gridPaddingX}
      {...props}
    />
  )
}
