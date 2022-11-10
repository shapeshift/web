import axios from 'axios'
import isEqual from 'lodash/isEqual'
import { useCallback, useEffect, useState } from 'react'
import { useInterval } from 'hooks/useInterval/useInterval'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ namespace: ['useHasAppUpdated'] })

export const APP_UPDATE_CHECK_INTERVAL = 1000 * 60

// Treat private IPs as local: 192.168.0.0/16, 10.0.0.0/16, 127.0.0.0/16, and 'localhost'
const localhostRegEx = /(?:192\.168|10\.0|127\.0)\.\d{1,3}\.\d{1,3}|localhost/

// 'asset-manifest.json' keeps track of the latest minified built files
const assetManifestUrl = `./asset-manifest.json`

export const useHasAppUpdated = () => {
  const [hasUpdated, setHasUpdated] = useState(false)
  const [initialManifestMainJs, setInitialManifestMainJs] = useState<unknown>()
  const [initialEnvMainJs, setInitialEnvMainJs] = useState<unknown>()

  const isLocalhost = localhostRegEx.test(window.location.hostname)
  moduleLogger.trace({ isLocalhost }, 'isLocalhost?')

  const fetchData = useCallback(async (url: string): Promise<unknown> => {
    try {
      // dummy query param to bypass the browser cache.
      const { data } = await axios.get(`${url}?${new Date().valueOf()}`)
      return data
    } catch (e) {
      moduleLogger.error(e, `useHasAppUpdated: error fetching data from URL: ${url}`)
      return null
    }
  }, [])

  const storeMainManifestJs = useCallback(async () => {
    const manifestMainJs = await fetchData(assetManifestUrl)
    manifestMainJs && setInitialManifestMainJs(manifestMainJs)
  }, [fetchData])

  // 'asset-manifest.json' keeps track of the current environment variables
  const envUrl = `./env.json`
  const storeMainEnvJs = useCallback(async () => {
    const envMainJs = await fetchData(envUrl)
    envMainJs && setInitialEnvMainJs(envMainJs)
  }, [envUrl, fetchData])

  // store initial values once
  useEffect(() => {
    if (isLocalhost) return
    storeMainManifestJs()
    storeMainEnvJs()
  }, [isLocalhost, storeMainEnvJs, storeMainManifestJs])

  useInterval(
    async () => {
      if (isLocalhost) return
      const [currentManifestJs, currentEnvJs] = await Promise.all([
        fetchData(assetManifestUrl),
        fetchData(envUrl),
      ])
      if (currentEnvJs && currentManifestJs) {
        const isExactAssetManifest = isEqual(initialManifestMainJs, currentManifestJs)
        const isExactEnv = isEqual(initialEnvMainJs, currentEnvJs)

        const eitherHasChanged = !isExactAssetManifest || !isExactEnv
        setHasUpdated(eitherHasChanged)
      }
    },
    // Don't implement the interval check for local development
    isLocalhost ? null : APP_UPDATE_CHECK_INTERVAL,
  )

  if (isLocalhost) return false // never return true on localhost
  return hasUpdated
}
