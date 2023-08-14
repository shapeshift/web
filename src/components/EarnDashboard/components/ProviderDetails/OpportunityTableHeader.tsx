import type { GridProps, SimpleGridProps } from '@chakra-ui/react'
import { SimpleGrid } from '@chakra-ui/react'

export const opportunityRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '1fr repeat(2, 170px)',
}

export const OpportunityTableHeader: React.FC<SimpleGridProps> = props => {
  return (
    <SimpleGrid
      gridTemplateColumns={{
        base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
        md: '1fr repeat(2, 170px)',
      }}
      color='text.subtle'
      bg='background.surface.raised.base'
      zIndex='docked'
      position='sticky'
      top={{ base: 'calc(71px + 107px)', md: '135px' }}
      textTransform='uppercase'
      fontSize='xs'
      letterSpacing='0.02em'
      fontWeight='bold'
      borderBottomWidth={1}
      borderColor='border.base'
      columnGap={4}
      py={2}
      px={{ base: 4, md: 6 }}
      {...props}
    />
  )
}
