import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { useCallback, useEffect, useState } from 'react'
import { SupportedYearnVault, transfromYearnOpportunities } from 'lib/transformYearnOpportunities'

type UseYearnVaults = () => SupportedYearnVault[]

export const useYearnVaults: UseYearnVaults = () => {
  const [vaults, setVaults] = useState<SupportedYearnVault[]>([])
  const { yearn } = useYearn()

  const getVaults = useCallback(async () => {
    if (!yearn) return
    const _vaults = await transfromYearnOpportunities(yearn)
    setVaults(_vaults)
  }, [yearn])

  useEffect(() => {
    getVaults()
  }, [getVaults])

  return vaults
}
