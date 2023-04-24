import type { GridProps, SimpleGridProps } from '@chakra-ui/react'
import { SimpleGrid, useColorModeValue } from '@chakra-ui/react'

export const opportunityRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '1fr repeat(2, 170px)',
}

export const OpportunityTableHeader: React.FC<SimpleGridProps> = props => {
  const borderColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const bg = useColorModeValue('white', 'gray.785')
  return (
    <SimpleGrid
      gridTemplateColumns={{
        base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
        md: '1fr repeat(2, 170px)',
      }}
      color='gray.500'
      bg={bg}
      zIndex='docked'
      position='sticky'
      top={{ base: 'calc(71px + 107px)', md: '135px' }}
      textTransform='uppercase'
      fontSize='xs'
      letterSpacing='0.02em'
      fontWeight='bold'
      borderBottomWidth={1}
      borderColor={borderColor}
      columnGap={4}
      py={2}
      px={{ base: 4, md: 6 }}
      {...props}
    />
  )
}
