import { useInterval } from '@chakra-ui/hooks'
import axios from 'axios'
import { useState } from 'react'

import { getConfig } from '../../config'

const APP_UPDATE_CHECK_INTERVAL = 1000 * 60

export const useHasAppUpdated = () => {
  const [hasUpdated, setHasUpdated] = useState(false)
  useInterval(async () => {
    // we don't care about updates locally obv
    if (getConfig().isDevelopment) return
    // this will break if we ever eject from create react app
    const scriptIdentifier = '/static/js/main.'
    // asset-manifest tells us the latest minified built files
    const url = '/asset-manifest.json'
    let manifestMainJs
    try {
      // dummy query param bypasses browser cache
      const { data } = await axios.get(`${url}?${new Date().valueOf()}`)
      manifestMainJs = data?.files?.['main.js']
    } catch (e) {
      console.error(`useHasAppUpdated: error fetching asset-manifest.json`, e)
    }
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
    // can't map/filter/reduce on HTMLCollectionOf
    for (let i = 0; i < scripts.length; i++) {
      const { src: scriptMainJs } = scripts[i]
      if (!scriptMainJs) continue
      // this is the main entry point to the app bundle
      // create react app adds a hash to each build
      if (!scriptMainJs.includes(scriptIdentifier)) continue
      // if the asset-manifest.json main.js and current script main.js don't match we're out of date
      if (scriptMainJs !== manifestMainJs) {
        console.info(
          `useHasAppUpdated: app updated, manifest: ${manifestMainJs}, script: ${scriptMainJs}`
        )
        setHasUpdated(true)
      }
    }
  }, APP_UPDATE_CHECK_INTERVAL)
  return hasUpdated
}
