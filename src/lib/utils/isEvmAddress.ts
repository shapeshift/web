import { isAddress } from 'viem'

export const isEvmAddress = (address: string) => isAddress(address, { strict: false })
