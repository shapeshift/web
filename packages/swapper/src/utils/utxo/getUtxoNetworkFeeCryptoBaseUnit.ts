import type { UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import { bn } from '@shapeshiftoss/utils'

const DEFAULT_TX_VSIZE = 200
const OP_RETURN_OVERHEAD_VSIZE = 11

type GetUtxoNetworkFeeCryptoBaseUnitArgs = {
  adapter: UtxoChainAdapter
  pubkey: string | undefined
  to?: string
  value?: string
  opReturnData?: string
}

export const getUtxoNetworkFeeCryptoBaseUnit = async ({
  adapter,
  pubkey,
  to,
  value,
  opReturnData,
}: GetUtxoNetworkFeeCryptoBaseUnitArgs): Promise<{ networkFeeCryptoBaseUnit: string }> => {
  if (pubkey && to && value) {
    const { fast } = await adapter.getFeeData({
      to,
      value,
      chainSpecific: { pubkey, opReturnData },
      sendMax: false,
    })

    return { networkFeeCryptoBaseUnit: fast.txFee }
  }

  const { fast } = await adapter.httpProvider.getNetworkFees()

  if (!fast?.satsPerKiloByte) throw new Error('failed to get network fees')

  const satsPerByte = String(Math.max(1, Math.ceil(fast.satsPerKiloByte / 1000)))

  const opReturnVsize = opReturnData
    ? OP_RETURN_OVERHEAD_VSIZE + Buffer.byteLength(opReturnData, 'utf8')
    : 0

  return {
    networkFeeCryptoBaseUnit: bn(satsPerByte)
      .times(DEFAULT_TX_VSIZE + opReturnVsize)
      .toFixed(0),
  }
}
