import { JsonRpcProvider } from '@ethersproject/providers'
import { Yearn } from '@yfi/sdk'

const network = 1 // 1 for mainnet
const provider = new JsonRpcProvider(process.env.REACT_APP_ETHEREUM_NODE_URL)
export const yearnSdk = new Yearn(network, { provider })
