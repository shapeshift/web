import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/types'
import type { Address } from 'viem'
import { useBytecode } from 'wagmi'

export const useIsInteractingWithContract = ({
  evmChainId,
  address,
}: {
  evmChainId: ChainId | undefined
  address: string | undefined
}): boolean | null => {
  const { data: bytecode } = useBytecode({
    address: address as Address,
    // @ts-ignore we can't narrow this proper
    chainId: fromChainId(evmChainId as EvmChainId).chainReference,
    enabled: evmChainId && address,
  })

  return bytecode !== undefined ? true : null
}
