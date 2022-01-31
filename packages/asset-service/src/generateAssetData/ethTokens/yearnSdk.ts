import { JsonRpcProvider } from '@ethersproject/providers'
import { Yearn } from '@yfi/sdk'

const network = 1 // 1 for mainnet
const provider = new JsonRpcProvider(process.env.REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL)
export const yearnSdk = new Yearn(network, { provider, disableAllowlist: true })
