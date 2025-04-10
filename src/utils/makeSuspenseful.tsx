import type { BoxProps } from '@chakra-ui/react'
import { Box } from '@chakra-ui/react'
import type { ComponentProps, FC } from 'react'
import { Suspense, useMemo } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'

const defaultSpinnerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  top: 0,
  width: '100%',
  height: '100vh',
}

const SuspenseSpinner = ({ spinnerStyle }: { spinnerStyle: BoxProps }) => {
  const boxSpinnerStyle = useMemo(
    () => ({ ...defaultSpinnerStyle, ...spinnerStyle }),
    [spinnerStyle],
  )

  return (
    <Box sx={boxSpinnerStyle}>
      <CircularProgress />
    </Box>
  )
}

// eslint you're drunk, this is a module-scope element with a module-scope const dependancy
// eslint-disable-next-line react-memo/require-usememo
export const defaultSuspenseFallback = <SuspenseSpinner spinnerStyle={defaultSpinnerStyle} />

export function makeSuspenseful<T extends FC<any>>(Component: T, spinnerStyle: BoxProps = {}) {
  return (props: ComponentProps<T>) => {
    const suspenseSpinner = useMemo(() => <SuspenseSpinner spinnerStyle={spinnerStyle} />, [])

    return (
      <Suspense fallback={suspenseSpinner}>
        <Component {...props} />
      </Suspense>
    )
  }
}
