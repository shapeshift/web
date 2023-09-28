import { skipToken } from '@reduxjs/toolkit/query'
import { getConfig } from 'config'
import { ethers } from 'ethers'
import type { TransactionParams } from 'plugins/walletConnectToDapps/types'
import { useEffect, useMemo, useState } from 'react'
import { useGetContractAbiQuery } from 'state/apis/abi/abiApi'

/*
  If the root contract is a proxy and you need its implementation contract ABI, we currently
  look for 1 of 2 methods on the root contract to detect it's a proxy:
  1) the ZeroEx (Exchange Proxy) Spec: `getFunctionImplementation(sighash: string)` (a public getter)
  2) the EIP-1967 way: `_implementation()` (onlyAdmin)
  TODO: add additional proxy methods, if any, and handle them
*/
enum PROXY_CONTRACT_METHOD_NAME {
  ZeroEx = 'getFunctionImplementation',
  EIP1967 = 'implementation',
}
const EIP1967_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

export const useGetAbi = (
  transactionParams: TransactionParams,
): ethers.utils.Interface | undefined => {
  const [proxyContractImplementation, setProxyContractImplementation] = useState<string | null>(
    null,
  )

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

  const rootContractWithProvider = useMemo(
    () =>
      rootContractInterface
        ? new ethers.Contract(contractAddress, rootContractInterface, provider)
        : undefined,
    [rootContractInterface, provider, contractAddress],
  )

  const sighash = data.substring(0, 10).toLowerCase()

  // check for proxy methods on the root interface
  let proxyFunctionNameIfExists: string | undefined
  if (rootContractInterface) {
    const rootFunctions = Object.values(rootContractInterface.functions)
    proxyFunctionNameIfExists = Object.values(PROXY_CONTRACT_METHOD_NAME).find(x =>
      rootFunctions.find(y => y.name === x),
    )
  }

  useEffect(() => {
    ;(async () => {
      let implementationAddress: string | null
      try {
        switch (proxyFunctionNameIfExists) {
          case PROXY_CONTRACT_METHOD_NAME.ZeroEx:
            console.debug('proxyFunctionName is "getFunctionImplementation"')
            implementationAddress =
              await rootContractWithProvider?.getFunctionImplementation(sighash)
            break
          case PROXY_CONTRACT_METHOD_NAME.EIP1967:
            console.debug('proxyFunctionName is "implementation"')
            const paddedImplementationAddress = await provider.getStorageAt(
              contractAddress,
              EIP1967_IMPLEMENTATION_SLOT,
            )
            // Remove the first 26 chars (64 hex digits)
            implementationAddress = ethers.utils.getAddress(
              paddedImplementationAddress.substring(26),
            )
            break
          default:
            implementationAddress = null
        }
        setProxyContractImplementation(implementationAddress)
      } catch (e) {
        console.error('Error getting implementation contract', e)
        // any non-proxy contract could coincidentally contain a method with a proxy-like name
        // so in this case, fallback to using the root contract
        setProxyContractImplementation(null)
      }
    })()
  }, [
    rootContractInterface,
    rootContractWithProvider,
    sighash,
    provider,
    proxyFunctionNameIfExists,
    contractAddress,
  ])

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

  return proxyContractImplementation ? implementationContractInterface : rootContractInterface
}
