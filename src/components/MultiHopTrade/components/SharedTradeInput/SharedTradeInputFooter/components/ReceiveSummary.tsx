import { Stack } from '@chakra-ui/react'
import type { FC, JSX } from 'react'
import { memo } from 'react'

import type { RowProps } from '@/components/Row/Row'

type ReceiveSummaryProps = {
  children?: JSX.Element | null
} & RowProps

export const ReceiveSummary: FC<ReceiveSummaryProps> = memo(({ children }) => {
  return (
    <>
      <Stack spacing={4} py={4} px={6} fontSize='sm'>
        {children}
      </Stack>
    </>
  )
})
