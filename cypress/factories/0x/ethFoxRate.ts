import { sources } from './sources'

export const makeEthFoxRateResponse = () => {
  return {
    chainId: 1,
    price: '7673.938572450642711714',
    estimatedPriceImpact: '2.1999',
    value: '89000000000000000000',
    gasPrice: '216000000000',
    gas: '136000',
    estimatedGas: '136000',
    protocolFee: '0',
    minimumProtocolFee: '0',
    buyTokenAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    buyAmount: '682980532948107201342557',
    sellTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    sellAmount: '89000000000000000000',
    sources,
    allowanceTarget: '0x0000000000000000000000000000000000000000',
    sellTokenToEthRate: '1',
    buyTokenToEthRate: '7846.55087491411914402',
  }
}
