import { getSupportedVaults, SupportedYearnVault } from '@shapeshiftoss/investor-yearn'
import { useCallback, useEffect, useState } from 'react'

type UseYearnVaults = () => SupportedYearnVault[]

export const useYearnVaults: UseYearnVaults = () => {
  const [vaults, setVaults] = useState<SupportedYearnVault[]>([])

  const getVaults = useCallback(async () => {
    const _vaults = await getSupportedVaults()
    setVaults(_vaults)
  }, [])

  useEffect(() => {
    getVaults()
  }, [getVaults])

  return vaults
}
