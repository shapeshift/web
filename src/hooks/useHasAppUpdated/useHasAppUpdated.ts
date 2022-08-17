import axios from 'axios'
import isEqual from 'lodash/isEqual'
import { useCallback, useEffect, useState } from 'react'
import { useInterval } from 'hooks/useInterval/useInterval'

export const APP_UPDATE_CHECK_INTERVAL = 1000 * 60

export const useHasAppUpdated = () => {
  const [hasUpdated, setHasUpdated] = useState(false)
  const [initialManifestMainJs, setInitialManifestMainJs] = useState<unknown>()
  const [initialEnvMainJs, setInitialEnvMainJs] = useState<unknown>()

  const isLocalhost = window.location.hostname === 'localhost'

  const fetchData = useCallback(
    async (url: string): Promise<unknown> => {
      // don't ever try to fetch on localhost - we don't care
      if (isLocalhost) return {} // need to return dummy value
      try {
        // dummy query param to bypass the browser cache.
        const { data } = await axios.get(`${url}?${new Date().valueOf()}`)
        return data
      } catch (e) {
        console.error(`useHasAppUpdated: error fetching data from URL: ${url}`, e)
        return null
      }
    },
    [isLocalhost],
  )

  // 'asset-manifest.json' keeps track of the latest minified built files
  const assetManifestUrl = `/asset-manifest.json`
  const storeMainManifestJs = useCallback(async () => {
    const manifestMainJs = await fetchData(assetManifestUrl)
    manifestMainJs && setInitialManifestMainJs(manifestMainJs)
  }, [assetManifestUrl, fetchData])

  // 'asset-manifest.json' keeps track of the current environment variables
  const envUrl = `/env.json`
  const storeMainEnvJs = useCallback(async () => {
    const envMainJs = await fetchData(envUrl)
    envMainJs && setInitialEnvMainJs(envMainJs)
  }, [envUrl, fetchData])

  // store initial values once
  useEffect(() => {
    storeMainManifestJs()
    storeMainEnvJs()
  }, [storeMainEnvJs, storeMainManifestJs])

  useInterval(async () => {
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
  }, APP_UPDATE_CHECK_INTERVAL)

  if (isLocalhost) return false // never return true on localhost
  return hasUpdated
}
