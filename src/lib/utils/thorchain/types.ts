// non-exhaustive, we only use this to get the current blockheight and time
export type ThorchainBlock = {
  header: {
    height: number
    time: string
  }
}

export type ThorchainMimir = Record<string, unknown>
