import { getSupportedVaults, SupportedYearnVault } from 'features/defi/providers/yearn/api/vaults'
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
  })

  return vaults
}
