import { sources } from './sources'

export const makeEthUsdcRateResponse = () => {
  return {
    chainId: 1,
    price: '0.000376837347525673',
    estimatedPriceImpact: '0',
    value: '380605721000930',
    gasPrice: '114000000000',
    gas: '136000',
    estimatedGas: '136000',
    protocolFee: '0',
    minimumProtocolFee: '0',
    buyTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    buyAmount: '1000000',
    sellTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    sellAmount: '376837347525673',
    sources,
    allowanceTarget: '0x0000000000000000000000000000000000000000',
    sellTokenToEthRate: '1',
    buyTokenToEthRate: '2653.65836',
  }
}
