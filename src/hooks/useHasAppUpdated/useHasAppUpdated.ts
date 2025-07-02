import axios from 'axios'
import isEqual from 'lodash/isEqual'
import { useCallback, useEffect, useState } from 'react'

export const APP_UPDATE_CHECK_INTERVAL = 1000 * 60 // one minute

// Treat private IPs as local: 192.168.0.0/16, 10.0.0.0/16, 127.0.0.0/16, and 'localhost'
const localhostRegEx = /(?:192\.168|10\.0|127\.0)\.\d{1,3}\.\d{1,3}|localhost/

export type Metadata = {
  latestTag: string
  headShortCommitHash: string
}

type HasUpdatedResult = {
  hasUpdated: true
  initialMetadata: Metadata
  newMetadata: Metadata
}

type HasNotUpdatedResult = {
  hasUpdated: false
  initialMetadata?: Metadata
  newMetadata?: undefined
}

type MaybeUpdatedResult = HasUpdatedResult | HasNotUpdatedResult

export const useHasAppUpdated = (): MaybeUpdatedResult => {
  // 'metadata.json' keeps track of current commit hash and git tag
  const metadataUrl = `/metadata.json`
  const [initialMetadata, setInitialMetadata] = useState<Metadata | undefined>()
  const [newMetadata, setNewMetadata] = useState<Metadata | undefined>()

  const isLocalhost = localhostRegEx.test(window.location.hostname)

  const fetchData = useCallback(async (url: string): Promise<Metadata | undefined> => {
    try {
      // dummy query param to bypass the browser cache.
      const { data } = await axios.get(`${url}?${new Date().valueOf()}`)
      return data
    } catch (e) {
      console.error(e)
    }
  }, [])

  // store initial values once
  useEffect(() => {
    if (isLocalhost) return
    fetchData(metadataUrl).then(setInitialMetadata).catch()
  }, [fetchData, isLocalhost, metadataUrl])

  useEffect(() => {
    if (isLocalhost) return
    // don't erroneously compare if we failed to fetch the initial
    if (!initialMetadata) return

    const fn = async () => {
      const currentMetadata = await fetchData(metadataUrl)
      // don't erroneously compare if we failed to fetch on the interval
      if (!currentMetadata) return
      const isDifferentMetadata = !isEqual(initialMetadata, currentMetadata)
      setNewMetadata(isDifferentMetadata ? currentMetadata : undefined)
    }
    const interval = setInterval(fn, APP_UPDATE_CHECK_INTERVAL)
    fn() // run this once, makes testing easier

    // cleanup
    return () => clearTimeout(interval)
  }, [fetchData, initialMetadata, isLocalhost, metadataUrl])

  if (isLocalhost) return { hasUpdated: false } // never return true on localhost

  return newMetadata !== undefined && initialMetadata !== undefined
    ? { hasUpdated: true, newMetadata, initialMetadata }
    : { hasUpdated: false, initialMetadata }
}
