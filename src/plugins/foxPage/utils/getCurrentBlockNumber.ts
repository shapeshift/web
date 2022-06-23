import { ethersProvider } from '../utils'

const currentBlockNumber = (async () => ethersProvider?.getBlockNumber())()
export const getCurrentBlockNumber = () => currentBlockNumber
