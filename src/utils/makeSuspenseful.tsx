import type { BoxProps } from '@chakra-ui/react'
import { Box } from '@chakra-ui/react'
import type { ComponentProps, FC } from 'react'
import { Suspense, useMemo } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { createErrorBoundary } from '@/components/ErrorBoundary/createErrorBoundary'
import { ErrorPageContent } from '@/components/ErrorPage/ErrorPageContent'

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

// eslint you're drunk, this is a module-scope element with a module-scope const dependency
// eslint-disable-next-line react-memo/require-usememo
export const defaultSuspenseFallback = <SuspenseSpinner spinnerStyle={defaultSpinnerStyle} />

// Create PageErrorBoundary using the ErrorPageContent (without Layout wrapper)
const PageErrorBoundary = createErrorBoundary({
  errorBoundaryName: 'page',
  FallbackComponent: ErrorPageContent,
})

export function makeSuspenseful<T extends FC<any>>(
  Component: T,
  spinnerStyle: BoxProps = {},
  withErrorBoundary = false,
) {
  return (props: ComponentProps<T>) => {
    const suspenseSpinner = useMemo(() => <SuspenseSpinner spinnerStyle={spinnerStyle} />, [])

    return withErrorBoundary ? (
      <PageErrorBoundary>
        <Suspense fallback={suspenseSpinner}>
          <Component {...props} />
        </Suspense>
      </PageErrorBoundary>
    ) : (
      <Suspense fallback={suspenseSpinner}>
        <Component {...props} />
      </Suspense>
    )
  }
}
