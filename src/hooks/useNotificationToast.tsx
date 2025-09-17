import type { UseToastOptions } from '@chakra-ui/react'
import { useMediaQuery, useToast } from '@chakra-ui/react'
import { useMemo } from 'react'

import { breakpoints } from '@/theme/theme'

type NotificationToastOptions = Omit<UseToastOptions, 'position'>

export const useNotificationToast = (options: NotificationToastOptions) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const position = useMemo(() => {
    return isLargerThanMd ? 'bottom-right' : 'bottom'
  }, [isLargerThanMd])

  return useToast({
    position,
    ...options,
  })
}
