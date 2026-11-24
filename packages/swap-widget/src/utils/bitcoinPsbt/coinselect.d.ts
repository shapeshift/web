declare module 'coinselect' {
  type CoinSelectInput = { value: number }

  type CoinSelectOutput = { address?: string; script?: Uint8Array; value?: number }

  type CoinSelectResult<T> = {
    fee: number
    inputs?: T[]
    outputs?: CoinSelectOutput[]
  }

  function coinSelect<T extends CoinSelectInput>(
    utxos: T[],
    outputs: CoinSelectOutput[],
    feeRate: number,
  ): CoinSelectResult<T>

  export = coinSelect
}
