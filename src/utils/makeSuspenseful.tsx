import type { BoxProps } from '@chakra-ui/react'
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

export function makeSuspenseful<T extends FC<any>>(Component: T, spinnerStyle: BoxProps = {}) {
  return (props: ComponentProps<T>) => {
    const boxSpinnerStyle = useMemo(() => ({ ...suspenseSpinnerStyle, ...spinnerStyle }), [])

    const suspenseSpinner = useMemo(
      () => (
        <Box sx={boxSpinnerStyle}>
          <CircularProgress />
        </Box>
      ),
      [boxSpinnerStyle],
    )

    return (
      <Suspense fallback={suspenseSpinner}>
        <Component {...props} />
      </Suspense>
    )
  }
}
