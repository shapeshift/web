import { Box } from '@chakra-ui/react'
import type { ComponentProps, FC } from 'react'
import { Suspense } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'

const suspenseSpinnerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  top: 0,
  width: '100%',
  height: '100vh',
}

export const suspenseFallback = (
  // eslint you're drunk, this is a module-scope node consuming a module-scope constant
  // eslint-disable-next-line react-memo/require-usememo
  <Box sx={suspenseSpinnerStyle}>
    <CircularProgress />
  </Box>
)

export function makeSuspenseful<T extends FC<any>>(Component: T) {
  return (props: ComponentProps<T>) => {
    return (
      <Suspense fallback={suspenseFallback}>
        <Component {...props} />
      </Suspense>
    )
  }
}
