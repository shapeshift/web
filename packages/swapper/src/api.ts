export enum SwapperType {
  Zrx = '0x',
  Thorchain = 'Thorchain'
}

export interface Swapper {
  /** Returns the swapper type */
  getType(): SwapperType
}
