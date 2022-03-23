import { Alert, AlertDescription } from '@chakra-ui/alert'
import { Button } from '@chakra-ui/button'
import { ToastId, useToast } from '@chakra-ui/toast'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import { pluginManager, registerPlugins } from 'plugins'
import { useEffect, useRef, useState } from 'react'
import { FaSync } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Routes } from 'Routes/Routes'
import { IconCircle } from 'components/IconCircle'
import { useHasAppUpdated } from 'hooks/useHasAppUpdated/useHasAppUpdated'
import { selectFeatureFlags } from 'state/slices/selectors'

import { useChainAdapters } from './context/ChainAdaptersProvider/ChainAdaptersProvider'
import { partitionCompareWith } from './lib/utils'
import { Route } from './Routes/helpers'
import { useAppSelector } from './state/store'

export const App = () => {
  const [pluginRoutes, setPluginRoutes] = useState<Route[] | null>(null)
  const chainAdapterManager = useChainAdapters()
  const shouldUpdate = useHasAppUpdated()
  const toast = useToast()
  const toastIdRef = useRef<ToastId | null>(null)
  const updateId = 'update-app'
  const translate = useTranslate()
  const featureFlags = useAppSelector(selectFeatureFlags)

  useEffect(() => {
    registerPlugins()
      .then(() => {
        let routes: Route[] = []

        // keep track of what's currently registered
        const currentChainAdapters = chainAdapterManager.getSupportedChains()

        // newly registered will be default + what comes from plugins
        const newChainAdapters: { [k in ChainTypes]?: () => ChainAdapter<ChainTypes> } = {}

        // register providers from each plugin
        for (const [, plugin] of pluginManager.entries()) {
          // Ignore plugins that have their feature flag disabled
          // If no featureFlag is present, then we assume it's enabled
          if (!plugin.featureFlag || featureFlags[plugin.featureFlag]) {
            // routes providers
            if (plugin.routes) {
              routes = routes.concat(plugin.routes)
            }

            // chain adapters providers
            plugin.providers?.chainAdapters?.forEach(([chain, factory]) => {
              // track newly registered adapters by plugins
              newChainAdapters[chain] = factory
            })
          }
        }

        // unregister the difference between what we had, and now have after loading plugins
        partitionCompareWith<ChainTypes>(
          currentChainAdapters,
          Object.keys(newChainAdapters) as ChainTypes[],
          {
            add: chain => {
              const factory = newChainAdapters[chain]
              if (factory) chainAdapterManager.addChain(chain, factory)
            },
            remove: chain => {
              chainAdapterManager.byChain(chain).closeTxs()
              chainAdapterManager.removeChain(chain)
            }
          }
        )

        setPluginRoutes(routes)
      })
      .catch(e => {
        console.error('RegisterPlugins', e)
        setPluginRoutes([])
      })
  }, [setPluginRoutes, chainAdapterManager, featureFlags])

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

  if (!pluginRoutes) return null

  return <Routes additionalRoutes={pluginRoutes} />
}
