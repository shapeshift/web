import { useInterval } from '@chakra-ui/hooks'
import axios from 'axios'
import { useMemo, useState } from 'react'
import { checkObjEquality } from 'lib/utils'

import { getConfig } from '../../config'

const APP_UPDATE_CHECK_INTERVAL = 1000 * 60

export const useHasAppUpdated = () => {
  const [hasUpdated, setHasUpdated] = useState(false)
  const [initialManifestMainJs, setManifestMainJs] = useState(null)
  // asset-manifest tells us the latest minified built files
  const url = '/asset-manifest.json'
  const storeMainManifestJs = async () => {
    // dummy query param bypasses browser cache
    const { data } = await axios.get(`${url}?${new Date().valueOf()}`)
    setManifestMainJs(data)
  }
  useMemo(storeMainManifestJs, [])
  useInterval(async () => {
    // we don't care about updates locally obv
    if (getConfig().isDevelopment) return

    let manifestMainJs
    try {
      const { data } = await axios.get(`${url}?${new Date().valueOf()}`)
      manifestMainJs = data
    } catch (e) {
      console.error(`useHasAppUpdated: error fetching asset-manifest.json`, e)
    }
    if (!manifestMainJs) {
      console.error(`useHasAppUpdated: can't find main.js in asset-manifest.json`)
      return
    }
    //deep equality check
    let areEquals = checkObjEquality(initialManifestMainJs, manifestMainJs)
    if (!areEquals) {
      console.info(
        `useHasAppUpdated: app updated, manifest: ${JSON.stringify(
          manifestMainJs
        )}, initial: ${JSON.stringify(initialManifestMainJs)}`
      )
      setHasUpdated(true)
    }
  }, APP_UPDATE_CHECK_INTERVAL)

  return hasUpdated
}
