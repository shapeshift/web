import { useInterval } from '@chakra-ui/hooks'
import axios from 'axios'
import isEqual from 'lodash/isEqual'
import { useMemo, useState } from 'react'

const APP_UPDATE_CHECK_INTERVAL = 1000 * 60

export const useHasAppUpdated = () => {
  const [hasUpdated, setHasUpdated] = useState(false)
  const [initialManifestMainJs, setManifestMainJs] = useState(null)
  const [initialEnvMainJs, setEnvMainJs] = useState(null)

  const fetchData = async (url: string) => {
    try {
      const { data } = await axios.get(url)
      return data
    } catch (e) {
      return console.error(`useHasAppUpdated: error fetching data from URL: ${url}`, e)
    }
  }

  // 'asset-manifest.json' keeps track of the latest minified built files.
  // interpolated with a dummy query param to bypass the browser cache.
  const assetManifestUrl = `/asset-manifest.json?${new Date().valueOf()}`
  const storeMainManifestJs = async () => {
    const manifestMainJs = await fetchData(assetManifestUrl)
    setManifestMainJs(manifestMainJs)
  }
  useMemo(storeMainManifestJs, [])

  // interpolated with a dummy query param to bypass the browser cache.
  const envUrl = `/env.json?${new Date().valueOf()}`
  const storeMainEnvJs = async () => {
    const envMainJs = await fetchData(envUrl)
    setEnvMainJs(envMainJs)
  }
  useMemo(storeMainEnvJs, [])

  useInterval(async () => {
    const [currentManifestJs, currentEnvJs] = await Promise.all([
      fetchData(assetManifestUrl),
      fetchData(envUrl),
    ])

    const isExactAssetManifest = isEqual(initialManifestMainJs, currentManifestJs)
    const isExactEnv = isEqual(initialEnvMainJs, currentEnvJs)

    const eitherhasChanged = !isExactAssetManifest || !isExactEnv
    eitherhasChanged ? setHasUpdated(true) : setHasUpdated(false)
  }, APP_UPDATE_CHECK_INTERVAL)

  return hasUpdated
}
