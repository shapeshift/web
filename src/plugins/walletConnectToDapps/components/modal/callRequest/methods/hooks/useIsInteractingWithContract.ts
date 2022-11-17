import type { ChainId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'

export const useIsInteractingWithContract = ({
  ethChainId,
  address,
}: {
  ethChainId: ChainId
  address: string
}) => {
  const [isInteractingWithContract, setIsInteractingWithContract] = useState<boolean | null>(null)
  useEffect(() => {
    ;(async () => {
      const result = await getWeb3InstanceByChainId(ethChainId).eth.getCode(address)
      // this util function returns '0x' if the recipient address is not a contract address
      setIsInteractingWithContract(result !== '0x')
    })()
  }, [address, ethChainId])

  return { isInteractingWithContract }
}
