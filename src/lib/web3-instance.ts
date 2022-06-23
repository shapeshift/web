import Web3 from 'web3'
import { web3Provider } from 'lib/web3-provider'

export const web3Instance: Web3 = new Web3(web3Provider)
