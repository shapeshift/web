import type Web3 from 'web3'
import { getWeb3Provider } from 'lib/web3-provider'

let maybeWeb3Instance: Web3 | null

export const getWeb3Instance = async (): Promise<Web3> => {
  const web3Provider = await getWeb3Provider()
  if (!maybeWeb3Instance) {
    const web3 = (await import('web3')).default
    maybeWeb3Instance = new web3(web3Provider)
    return maybeWeb3Instance!
  } else {
    return maybeWeb3Instance!
  }
}
