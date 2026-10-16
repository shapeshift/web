import type { CreateUrlProps } from '../../types'

export type OnramperWalletAuth = NonNullable<CreateUrlProps['walletAuth']>

export class OnramperCheckoutError extends Error {
  constructor(public readonly translationKey: string) {
    super(translationKey)
  }
}
