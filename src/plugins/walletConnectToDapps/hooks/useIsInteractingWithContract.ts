import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { getEthersProvider } from '@shapeshiftoss/contracts'
import { useEffect, useState } from 'react'

export const useIsInteractingWithContract = ({
  evmChainId,
  address,
}: {
  evmChainId: ChainId | undefined
  address: string | undefined
}): boolean | null => {
  const [isInteractingWithContract, setIsInteractingWithContract] = useState<boolean | null>(null)
  useEffect(() => {
    ;(async () => {
      const result =
        evmChainId && address
          ? await getEthersProvider(evmChainId as EvmChainId).getCode(address)
          : undefined
      // this util function returns '0x' if the recipient address is not a contract address
      setIsInteractingWithContract(result ? result !== '0x' : null)
    })()
  }, [address, evmChainId])

  return isInteractingWithContract
}
