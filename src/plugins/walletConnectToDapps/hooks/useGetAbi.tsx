import { skipToken } from '@reduxjs/toolkit/query'
import { getEthersProvider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import { ethers, Fragment } from 'ethers'
import type { TransactionParams } from 'plugins/walletConnectToDapps/types'
import { useEffect, useMemo, useState } from 'react'
import { getAddress } from 'viem'
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

export const useGetAbi = (transactionParams: TransactionParams): ethers.Interface | undefined => {
  const [proxyContractImplementation, setProxyContractImplementation] = useState<string | null>(
    null,
  )

  const { to: contractAddress, data } = transactionParams
  const provider = useMemo(() => getEthersProvider(KnownChainIds.EthereumMainnet), [])

  const { data: rootContractRawAbiData } = useGetContractAbiQuery(contractAddress)
  const rootContractInterface = useMemo(
    () => (rootContractRawAbiData ? new ethers.Interface(rootContractRawAbiData) : undefined),
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

  useEffect(() => {
    // check for proxy methods on the root interface
    let proxyFunctionNameIfExists: string | undefined
    if (rootContractInterface) {
      const rootFunctions = rootContractInterface.fragments.filter(Fragment.isFunction)
      proxyFunctionNameIfExists = Object.values(PROXY_CONTRACT_METHOD_NAME).find(x =>
        rootFunctions.find(y => y.name === x),
      )
    }

    ;(async () => {
      let implementationAddress: string | null
      try {
        switch (proxyFunctionNameIfExists) {
          case PROXY_CONTRACT_METHOD_NAME.ZeroEx:
            implementationAddress =
              await rootContractWithProvider?.getFunctionImplementation(sighash)
            break
          case PROXY_CONTRACT_METHOD_NAME.EIP1967:
            const paddedImplementationAddress = await provider.getStorage(
              contractAddress,
              EIP1967_IMPLEMENTATION_SLOT,
            )
            // Remove the first 26 chars (64 hex digits)
            implementationAddress = getAddress(paddedImplementationAddress.substring(26))
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
  }, [rootContractInterface, rootContractWithProvider, sighash, provider, contractAddress])

  const { data: contractImplementationRawAbiData } = useGetContractAbiQuery(
    proxyContractImplementation ?? skipToken,
  )

  const implementationContractInterface = useMemo(
    () =>
      contractImplementationRawAbiData
        ? new ethers.Interface(contractImplementationRawAbiData)
        : undefined,
    [contractImplementationRawAbiData],
  )

  return proxyContractImplementation ? implementationContractInterface : rootContractInterface
}
