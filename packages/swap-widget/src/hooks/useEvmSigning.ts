import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { useMemo } from 'react'
import type { EIP1193Provider, WalletClient } from 'viem'
import { createWalletClient, custom, getAddress, isAddress } from 'viem'

export type UseEvmSigningResult = {
  walletClient: WalletClient | undefined
  address: `0x${string}` | undefined
  isConnected: boolean
}

export const useEvmSigning = (): UseEvmSigningResult => {
  const { walletProvider } = useAppKitProvider<EIP1193Provider>('eip155')
  const { address, isConnected } = useAppKitAccount({ namespace: 'eip155' })

  const checksummedAddress = useMemo<`0x${string}` | undefined>(() => {
    if (!address || !isAddress(address)) return undefined
    return getAddress(address)
  }, [address])

  const walletClient = useMemo(() => {
    if (!walletProvider || !checksummedAddress) return undefined
    return createWalletClient({
      account: checksummedAddress,
      transport: custom(walletProvider),
    })
  }, [walletProvider, checksummedAddress])

  return {
    walletClient,
    address: checksummedAddress,
    isConnected: !!(isConnected && checksummedAddress),
  }
}
