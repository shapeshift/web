import { getConfig } from 'config'
import Web3 from 'web3'

const web3Provider = new Web3.providers.HttpProvider(getConfig().REACT_APP_ETH_NODE_URL)
export const web3Instance = new Web3(web3Provider)
