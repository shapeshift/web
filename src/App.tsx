import { Alert, AlertDescription } from '@chakra-ui/alert'
import { Button } from '@chakra-ui/button'
import { ToastId, useToast } from '@chakra-ui/toast'
import { pluginManager, registerPlugins } from 'plugins'
import { useEffect, useRef, useState } from 'react'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Routes } from 'Routes/Routes'
import { IconCircle } from 'components/IconCircle'
import { useHasAppUpdated } from 'hooks/useHasAppUpdated/useHasAppUpdated'

import { Route } from './Routes/helpers'

export const App = () => {
  const [pluginRoutes, setPluginRoutes] = useState<Route[]>([])
  const shouldUpdate = useHasAppUpdated()
  const toast = useToast()
  const toastIdRef = useRef<ToastId | null>(null)
  const updateId = 'update-app'
  const translate = useTranslate()

  useEffect(() => {
    registerPlugins()
      .then(() => {
        setPluginRoutes(pluginManager.getRoutes())
      })
      .catch(e => {
        console.error('RegisterPlugins', e)
        setPluginRoutes([])
      })
  }, [setPluginRoutes])

  useEffect(() => {
    if (shouldUpdate && !toast.isActive(updateId)) {
      const toastId = toast({
        render: () => {
          return (
            <Alert status='info' variant='subtle' borderRadius='lg'>
              <IconCircle boxSize={8} color='blue.300'>
                <FaSync />
              </IconCircle>
              <AlertDescription ml={3}>{translate('updateToast.body')}</AlertDescription>
              <Button
                variant='solid'
                colorScheme='blue'
                size='sm'
                onClick={() => window.location.reload()}
                ml={4}
              >
                {translate('updateToast.cta')}
              </Button>
            </Alert>
          )
        },
        id: updateId,
        duration: null,
        isClosable: false,
        position: 'bottom-right'
      })
      if (!toastId) return
      toastIdRef.current = toastId
    }
  }, [shouldUpdate, toast, translate])

  return <Routes additionalRoutes={pluginRoutes} />
}
