import { Alert, AlertIcon, AlertTitle } from '@chakra-ui/alert'
import { Button } from '@chakra-ui/button'
import { CloseButton } from '@chakra-ui/close-button'
import { ToastId, useToast } from '@chakra-ui/toast'
import { useEffect, useRef } from 'react'
import { Routes } from 'Routes/Routes'
import { useHasAppUpdated } from 'hooks/useHasAppUpdated/useHasAppUpdated'

export const App = () => {
  const shouldUpdate = useHasAppUpdated()
  const toast = useToast()
  const toastIdRef = useRef<ToastId | null>(null)

  useEffect(() => {
    if (shouldUpdate) {
      const toastId = toast({
        render: () => {
          return (
            <Alert status='info' variant='solid' borderRadius='lg'>
              <AlertIcon />
              <AlertTitle>A new version of the app is available</AlertTitle>
              <Button
                variant='ghost'
                colorScheme='white'
                size='sm'
                onClick={() => window.location.reload()}
              >
                Refresh App
              </Button>
              <CloseButton onClick={() => toastIdRef.current && toast.close(toastIdRef.current)} />
            </Alert>
          )
        },
        duration: null,
        isClosable: true,
        position: 'bottom'
      })
      if (!toastId) return
      toastIdRef.current = toastId
    }
  }, [shouldUpdate, toast])
  return <Routes />
}
