import { EthereumTx } from '../../generated/ethereum'

export const getSigHash = (inputData: string | undefined): string | undefined => {
  if (!inputData) return
  const length = inputData.startsWith('0x') ? 10 : 8
  return inputData.slice(0, length)
}

export const txInteractsWithContract = (tx: EthereumTx, contract: string) => {
  return tx.to === contract
}
