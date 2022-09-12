import { SimpleGrid } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

type TxGridProps = { compactMode?: boolean } & PropsWithChildren

export const TxGrid: React.FC<TxGridProps> = ({ compactMode, children }) => {
  return (
    <SimpleGrid
      spacing={{ base: 4, lg: compactMode ? 4 : 6 }}
      py={{ base: 0, lg: compactMode ? 0 : 6 }}
      minChildWidth='200px'
      flex={1}
      width='full'
    >
      {children}
    </SimpleGrid>
  )
}
