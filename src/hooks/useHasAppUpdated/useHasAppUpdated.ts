import { useInterval } from '@chakra-ui/hooks'
import axios from 'axios'
import isEqual from 'lodash/isEqual'
import { useMemo, useState } from 'react'

export const APP_UPDATE_CHECK_INTERVAL = 1000 * 60

export const useHasAppUpdated = () => {
  const [hasUpdated, setHasUpdated] = useState(false)
  const [initialManifestMainJs, setManifestMainJs] = useState(null)
  const [initialEnv, setEnv] = useState(null)
  // asset-manifest tells us the latest minified built files
  const url = '/asset-manifest.json'
  const envUrl = '/env.json'
  const storeInitialAsset = () => {
    // dummy query param bypasses browser cache
    Promise.all<any>([
      axios.get(`${url}?${new Date().valueOf()}`).then(({ data }) => {
        setManifestMainJs(data)
      }),
      axios.get(`${envUrl}?${new Date().valueOf()}`).then(({ data }) => {
        setEnv(data)
      })
    ])
  }
  useMemo(storeInitialAsset, [])
  useInterval(async () => {
    // we don't care about updates locally obv
    // if (window.location.hostname === 'localhost') return

    let manifestMainJs, env
    try {
      const { data } = await axios.get(`${url}?${new Date().valueOf()}`)
      manifestMainJs = data
    } catch (e) {
      console.error(`useHasAppUpdated: error fetching asset-manifest.json`, e)
    }
    try {
      const { data } = await axios.get(`${envUrl}?${new Date().valueOf()}`)
      env = data
    } catch (e) {
      console.error(`useHasAppUpdated: error fetching env.json`, e)
    }
    if (!manifestMainJs) {
      console.error(`useHasAppUpdated: can't find main.js in asset-manifest.json`)
      return
    }
    if (!env) {
      console.error(`useHasAppUpdated: can't find env in env.json`)
      return
    }
    //deep equality check
    let isSameAssetManifest = isEqual(initialManifestMainJs, manifestMainJs)
    let isSameEnv = isEqual(initialEnv, env)
    if (!isSameAssetManifest) {
      console.info(
        `useHasAppUpdated: app updated, manifest: ${JSON.stringify(
          manifestMainJs
        )}, initial: ${JSON.stringify(initialManifestMainJs)}`
      )
      setHasUpdated(true)
    } else if (!isSameEnv) {
      console.info(
        `useHasAppUpdated: app updated due to changing env, env: ${JSON.stringify(
          manifestMainJs
        )}, initial: ${JSON.stringify(initialManifestMainJs)}`
      )
      setHasUpdated(true)
    }
  }, APP_UPDATE_CHECK_INTERVAL)

  return hasUpdated
}
