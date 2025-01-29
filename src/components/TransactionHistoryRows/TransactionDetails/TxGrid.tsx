import { SimpleGrid } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'

type TxGridProps = { compactMode?: boolean } & PropsWithChildren

export const TxGrid: React.FC<TxGridProps> = ({ compactMode, children }) => {
  const gridSpacing = useMemo(() => ({ base: 4, lg: compactMode ? 4 : 6 }), [compactMode])
  const gridPaddingY = useMemo(() => ({ base: 0, lg: compactMode ? 0 : 6 }), [compactMode])

  return (
    <SimpleGrid spacing={gridSpacing} py={gridPaddingY} minChildWidth='200px' flex={1} width='full'>
      {children}
    </SimpleGrid>
  )
}
