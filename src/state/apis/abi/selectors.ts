import { ethers } from 'ethers'
import createCachedSelector from 're-reselect'
import type { ReduxState } from 'state/reducer'

import { abiApi } from './abiApi'

type SelectContractByAddressReturn = {
  contract?: ethers.utils.Interface
  isLoading: boolean
  error: unknown
}

export const selectContractByAddress = createCachedSelector(
  (state: ReduxState, address: string) => abiApi.endpoints.getContractAbi.select(address)(state),
  ({ data, isLoading, error }): SelectContractByAddressReturn => ({
    contract: data ? new ethers.utils.Interface(data) : undefined,
    isLoading,
    error,
  }),
)(address => address ?? 'address')
