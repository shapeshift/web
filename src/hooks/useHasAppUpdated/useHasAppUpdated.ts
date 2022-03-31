import { useInterval } from '@chakra-ui/hooks'
import axios from 'axios'
import isEqual from 'lodash/isEqual'
import { useMemo, useState } from 'react'

export const APP_UPDATE_CHECK_INTERVAL = 1000 * 60

const fetchAsset = async (url: string) => {
  try {
    // dummy query param bypasses browser cache
    const { data } = await axios.get(`${url}?${new Date().valueOf()}`)
    return data
  } catch (e) {
    console.error(`useHasAppUpdated: error fetching ${url}`, e)
  }
}
export const useHasAppUpdated = () => {
  const [hasUpdated, setHasUpdated] = useState(false)
  const [initialManifestMainJs, setManifestMainJs] = useState(null)
  const [initialEnv, setEnv] = useState(null)
  // asset-manifest tells us the latest minified built files
  const assetManifestUrl = '/asset-manifest.json'
  const envUrl = '/env.json'

  const storeAndCompareAsset = async () => {
    // we don't care about updates locally obv
    if (window.location.hostname === 'localhost') return

    const manifestMainJs = await fetchAsset(assetManifestUrl)
    const env = await fetchAsset(envUrl)

    if (!manifestMainJs) {
      console.error(`useHasAppUpdated: can't find main.js in asset-manifest.json`)
    }
    if (!env) {
      console.error(`useHasAppUpdated: can't find env in env.json`)
    }

    let isSameAssetManifest = true,
      isSameEnv = true

    if (!initialManifestMainJs) {
      // first run
      if (manifestMainJs) setManifestMainJs(manifestMainJs)
    } else {
      // subsequent runs
      if (manifestMainJs && !isEqual(manifestMainJs, initialManifestMainJs)) {
        isSameAssetManifest = false
      }
    }

    if (!initialEnv) {
      // first run
      if (env) setEnv(env)
    } else {
      // subsequent runs
      if (env && !isEqual(env, initialEnv)) {
        isSameEnv = false
      }
    }

    if (!isSameAssetManifest || !isSameEnv) {
      console.info(
        !isSameAssetManifest
          ? `useHasAppUpdated: app updated, manifest: ${JSON.stringify(
              manifestMainJs
            )}, initial: ${JSON.stringify(initialManifestMainJs)}`
          : `useHasAppUpdated: app updated due to changing env, env: ${JSON.stringify(
              env
            )}, initial: ${JSON.stringify(initialEnv)}`
      )
      setHasUpdated(true)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(storeAndCompareAsset, [])
  useInterval(storeAndCompareAsset, APP_UPDATE_CHECK_INTERVAL)

  return hasUpdated
}
