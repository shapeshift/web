import { useInterval } from '@chakra-ui/hooks'
import axios from 'axios'
import isEqual from 'lodash/isEqual'
import { useState } from 'react'

import { getConfig } from '../../config'

const APP_UPDATE_CHECK_INTERVAL = 1000 * 60

export const useHasAppUpdated = () => {
  const [hasUpdated, setHasUpdated] = useState(false)
  const [assetManifest, setAssetManifest] = useState({})
  useInterval(async () => {
    // we don't care about updates locally obv
    if (getConfig().isDevelopment) return
    // this will break if we ever eject from create react app
    const scriptIdentifier = '/static/js/main.'
    // asset-manifest tells us the latest minified built files
    const url = '/asset-manifest.json'
    try {
      // dummy query param bypasses browser cache
      const { data } = await axios.get(`${url}?${new Date().valueOf()}`)
      if (!Object.keys(assetManifest).length) {
        setAssetManifest(data)
      }
      const manifestMainJs = data?.files?.['main.js']
      if (!manifestMainJs) {
        console.error(`useHasAppUpdated: can't find main.js in asset-manifest.json`)
        return
      }
      if (!manifestMainJs.includes(scriptIdentifier)) {
        console.error(
          `useHasAppUpdated: manifest main.js doesn't start with identifier ${scriptIdentifier}`,
          manifestMainJs
        )
        return
      }
      const scripts = document.getElementsByTagName('script')
      if (!scripts.length) {
        console.error(`useHasAppUpdated: can't find scripts in dom`)
        return
      }

      const hasManifestChanged = !isEqual(assetManifest, data)
      if (hasManifestChanged) {
        return setHasUpdated(true)
      }
    } catch (e) {
      console.error(`useHasAppUpdated: error fetching asset-manifest.json`, e)
    }
  }, APP_UPDATE_CHECK_INTERVAL)
  return hasUpdated
}
