import { skipToken } from '@reduxjs/toolkit/query'
import { getConfig } from 'config'
import { ethers } from 'ethers'
import type { TransactionParams } from 'plugins/walletConnectToDapps/v1/bridge/types'
import { useEffect, useMemo, useState } from 'react'
import { useGetContractAbiQuery } from 'state/apis/abi/abiApi'

export const useGetAbi = (
  transactionParams: TransactionParams,
): ethers.utils.Interface | undefined => {
  const [proxyContractImplementation, setProxyContractImplementation] = useState<
    string | undefined
  >()

  const { to: contractAddress, data } = transactionParams
  const provider = useMemo(
    () => new ethers.providers.JsonRpcBatchProvider(getConfig().REACT_APP_ETHEREUM_NODE_URL),
    [],
  )

  const { data: rootContractRawAbiData } = useGetContractAbiQuery(contractAddress)
  const rootContractInterface = useMemo(
    () => (rootContractRawAbiData ? new ethers.utils.Interface(rootContractRawAbiData) : undefined),
    [rootContractRawAbiData],
  )

  const contractWithProvider = useMemo(
    () =>
      rootContractInterface
        ? new ethers.Contract(contractAddress, rootContractInterface, provider)
        : undefined,
    [rootContractInterface, provider, contractAddress],
  )

  const sighash = data.substring(0, 10).toLowerCase()

  /*
  We check to see if there is a proxy method on the root interface. Currently, we only look for getFunctionImplementation.
  I expect there are more.
  TODO: add additional proxy methods.
   */
  const proxyFunctions = new Set(['getFunctionImplementation'])
  const isProxyContract = rootContractInterface
    ? Object.values(rootContractInterface.functions).some(f => proxyFunctions.has(f.name))
    : undefined

  useEffect(() => {
    ;(async () => {
      const implementation = isProxyContract
        ? /*
        We currently only handle the getFunctionImplementation method.
        TODO: add additional proxy methods, and handle them.
         */
          await contractWithProvider?.getFunctionImplementation(sighash)
        : undefined
      setProxyContractImplementation(implementation)
    })()
  }, [contractWithProvider, sighash, setProxyContractImplementation, provider, isProxyContract])

  const { data: contractImplementationRawAbiData } = useGetContractAbiQuery(
    proxyContractImplementation ?? skipToken,
  )

  const implementationContractInterface = useMemo(
    () =>
      contractImplementationRawAbiData
        ? new ethers.utils.Interface(contractImplementationRawAbiData)
        : undefined,
    [contractImplementationRawAbiData],
  )

  return isProxyContract ? implementationContractInterface : rootContractInterface
}
