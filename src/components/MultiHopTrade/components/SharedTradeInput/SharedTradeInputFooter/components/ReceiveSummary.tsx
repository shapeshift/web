import { Stack } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import type { FC, JSX } from 'react'
import { memo } from 'react'

import type { RowProps } from '@/components/Row/Row'

type ReceiveSummaryProps = {
  isLoading?: boolean
  swapperName: SwapperName | undefined
  swapSource: SwapSource | undefined
  inputAmountUsd?: string
  affiliateBps?: string
  affiliateFeeAfterDiscountUserCurrency?: string
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
