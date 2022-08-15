type Utxo = {
  value: number
  script?: string
}

type Output = {
  address?: string
  value?: number
  script?: string
}

type CoinSelectResult<T> = {
  fee: number
  inputs?: Array<T>
  outputs?: Array<Output>
}

declare module 'coinselect' {
  declare function coinSelect<T = unknown>(
    utxos: Array<Utxo>,
    outputs: Array<Output>,
    feeRate: number,
  ): CoinSelectResult<Omit<T, 'value'> & { value: number }>

  export = coinSelect
}

declare module 'coinselect/split' {
  declare function split<T = unknown>(
    utxos: Array<Utxo>,
    outputs: Array<Output>,
    feeRate: number,
  ): CoinSelectResult<Omit<T, 'value'> & { value: number }>

  export = split
}
