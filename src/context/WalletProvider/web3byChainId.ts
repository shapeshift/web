import Web3 from 'web3'
export const web3ByChainId = (chainId: number) => {
  if (chainId === 1) {
    return new Web3(
      new Web3.providers.HttpProvider(
        `https://mainnet.infura.io/v3/fb05c87983c4431baafd4600fd33de7e`,
      ),
    )
  } else if (chainId === 5) {
    return new Web3(
      new Web3.providers.HttpProvider(
        `https://goerli.infura.io/v3/fb05c87983c4431baafd4600fd33de7e`,
      ),
    )
  } else if (chainId === 43114) {
    return new Web3(
      new Web3.providers.HttpProvider(
        `https://avalanche-mainnet.infura.io/v3/fb05c87983c4431baafd4600fd33de7e`,
      ),
    )
  } else if (chainId === 137) {
    return new Web3(new Web3.providers.HttpProvider(`https://rpc-mainnet.maticvigil.com`))
  } else {
    throw new Error('unsupported chain id')
  }
}
