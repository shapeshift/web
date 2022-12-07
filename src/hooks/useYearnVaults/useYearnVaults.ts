import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import type { SerializableOpportunity } from 'features/defi/providers/yearn/components/YearnManager/Deposit/DepositCommon'
import { useCallback, useEffect, useState } from 'react'

type UseYearnVaults = () => SerializableOpportunity[]

export const useYearnVaults: UseYearnVaults = () => {
  const [vaults, setVaults] = useState<SerializableOpportunity[]>([])
  const { yearn } = useYearn()

  const getVaults = useCallback(async () => {
    if (!yearn) return
    const _vaults = await yearn.findAll()
    setVaults(_vaults)
  }, [yearn])

  useEffect(() => {
    getVaults()
  }, [getVaults])

  return vaults
}
