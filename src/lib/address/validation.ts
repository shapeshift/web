import type { ValidateAddressArgs, ValidateAddressByChainId, ValidateAddressReturn } from './types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const validateAddress: ValidateAddressByChainId = async ({
  chainId,
  maybeAddress,
}: ValidateAddressArgs): Promise<ValidateAddressReturn> => {
  try {
    const adapter = getChainAdapterManager().get(chainId)
    if (!adapter) return false
    return (await adapter.validateAddress(maybeAddress)).valid
  } catch (e) {
    return false
  }
}
