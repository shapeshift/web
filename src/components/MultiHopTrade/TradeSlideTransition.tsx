import { useMediaQuery } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { SlideTransitionProps } from 'components/SlideTransition'
import { SlideTransition } from 'components/SlideTransition'
import { breakpoints } from 'theme/theme'

export const TradeSlideTransition = (props: SlideTransitionProps) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const style = useMemo(() => {
    return {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: isLargerThanMd ? 'auto' : 1400,
      minHeight: isLargerThanMd ? 'auto' : '100vh',
    }
  }, [isLargerThanMd])
  return <SlideTransition style={style} {...props} />
}
