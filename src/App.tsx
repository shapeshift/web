import { Alert, AlertDescription } from '@chakra-ui/alert'
import { Button } from '@chakra-ui/button'
import { ToastId, useToast } from '@chakra-ui/toast'
import { ipcRenderer } from 'electron'
import { pluginManager, registerPlugins } from 'plugins'
import { useEffect, useRef, useState } from 'react'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Routes } from 'Routes/Routes'
import { IconCircle } from 'components/IconCircle'
import { PairingProps } from 'components/Modals/Pair/Pair'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useHasAppUpdated } from 'hooks/useHasAppUpdated/useHasAppUpdated'

import { Route } from './Routes/helpers'

export const App = () => {
  const [pluginRoutes, setPluginRoutes] = useState<Route[]>([])
  const shouldUpdate = useHasAppUpdated()
  const toast = useToast()
  const toastIdRef = useRef<ToastId | null>(null)
  const updateId = 'update-app'
  const translate = useTranslate()
  const { pair } = useModal()

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
    ipcRenderer.on('@modal/pair', (event, data: PairingProps) => {
      pair.open(data)
    })
  }, [pair])

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
