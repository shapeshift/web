import type { UseToastOptions } from '@chakra-ui/react'
import { useMediaQuery, useToast } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'

import { StandardToast } from '@/components/Toast/StandardToast'
import { breakpoints } from '@/theme/theme'

type NotificationToastOptions = Omit<UseToastOptions, 'position'> & {
  desktopPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top' | 'bottom'
}

export type StandardToastOptions = {
  icon?: ReactNode
  title: string | ReactNode
  description?: string | ReactNode
  onClick?: () => void
  status?: 'success' | 'error' | 'warning' | 'info'
}

type ToastCallOptions = UseToastOptions | StandardToastOptions

const isStandardToastOptions = (options: ToastCallOptions): options is StandardToastOptions => {
  return 'title' in options && typeof options.title !== 'undefined'
}

export const useNotificationToast = (options?: NotificationToastOptions) => {
  const { desktopPosition = 'bottom-right', ...toastOptions } = options ?? {}
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const position = useMemo(() => {
    return isLargerThanMd ? desktopPosition : 'top'
  }, [isLargerThanMd, desktopPosition])

  const finalToastOptions = useMemo(
    () =>
      ({
        position,
        ...toastOptions,
      }) as const,
    [position, toastOptions],
  )

  const toast = useToast(finalToastOptions)

  const enhancedToast = useCallback(
    (callOptions: ToastCallOptions) => {
      if (isStandardToastOptions(callOptions)) {
        const { icon, title, description, onClick, status } = callOptions
        return toast({
          render: ({ onClose }) => (
            <StandardToast
              icon={icon}
              title={title}
              description={description}
              onClick={onClick}
              onClose={onClose}
              status={status}
            />
          ),
        })
      }

      return toast(callOptions)
    },
    [toast],
  )

  return Object.assign(enhancedToast, toast)
}
