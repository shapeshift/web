import { useEffect, useState } from 'react'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

import { getKeepKeyVersions, Versions } from '../utils'

export const useKeepKeyVersions = () => {
  const [versions, setVersions] = useState<Versions>()
  const {
    keepKeyWallet,
    state: { features },
  } = useKeepKey()

  useEffect(() => {
    ;(async () => {
      const versions = await getKeepKeyVersions(keepKeyWallet, features?.bootloaderHash)

      if (!versions) return

      setVersions(versions)
    })()
  }, [features?.bootloaderHash, keepKeyWallet])

  return versions
}
