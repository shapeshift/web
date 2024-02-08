import { Box } from '@chakra-ui/react'
import type { ComponentProps, FC } from 'react'
import { Suspense, useMemo } from 'react'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'

const suspenseSpinnerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  top: 0,
  width: '100%',
  height: '100vh',
}

export function makeSuspenseful<T extends FC<any>>(Component: T) {
  return (props: ComponentProps<T>) => {
    const suspenseSpinner = useMemo(
      () => (
        <Box style={suspenseSpinnerStyle}>
          <CircularProgress />
        </Box>
      ),
      [],
    )

    return (
      <Suspense fallback={suspenseSpinner}>
        <Component {...props} />
      </Suspense>
    )
  }
}
