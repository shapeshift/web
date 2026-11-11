import type { aptos } from '@shapeshiftoss/chain-adapters'

type GetAptosNetworkFeeCryptoBaseUnitArgs = {
  adapter: aptos.ChainAdapter
  from: string
  payload: string
}

export const getAptosNetworkFeeCryptoBaseUnit = async ({
  adapter,
  from,
  payload,
}: GetAptosNetworkFeeCryptoBaseUnitArgs) => {
  const { fast } = await adapter.getFeeData({
    to: '',
    value: '0',
    chainSpecific: { from, payload },
  })

  return { networkFeeCryptoBaseUnit: fast.txFee, feeData: fast }
}
