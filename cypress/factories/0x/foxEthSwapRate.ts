import { sources } from './sources'

export const makeFoxEthSwapRateResponse = () => {
  return {
    chainId: 1,
    price: '0.000112727104913542',
    estimatedPriceImpact: '0.6018',
    value: '0',
    gasPrice: '82000000000',
    gas: '136000',
    estimatedGas: '136000',
    protocolFee: '0',
    minimumProtocolFee: '0',
    buyTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    buyAmount: '349738595290781',
    sellTokenAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    sellAmount: '3102524415569938400',
    sources,
    allowanceTarget: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    sellTokenToEthRate: '8817.59565111642499705',
    buyTokenToEthRate: '1',
  }
}
