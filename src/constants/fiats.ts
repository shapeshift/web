import { FiatTypeEnum } from './FiatTypeEnum'

export type FiatTypeEnumWithoutCryptos = Exclude<
  FiatTypeEnum,
  | FiatTypeEnum.DOGE
  | FiatTypeEnum.BTC
  | FiatTypeEnum.USDT
  | FiatTypeEnum.ETH
  | FiatTypeEnum.LTC
  | FiatTypeEnum.BNB
  | FiatTypeEnum.ZEC
  | FiatTypeEnum.XAG
  | FiatTypeEnum.XAU
  | FiatTypeEnum.XPT
  | FiatTypeEnum.XDR
>

export const FIATS = Object.values(FiatTypeEnum).filter(
  fiat =>
    ![
      FiatTypeEnum.DOGE,
      FiatTypeEnum.BTC,
      FiatTypeEnum.USDT,
      FiatTypeEnum.ETH,
      FiatTypeEnum.LTC,
      FiatTypeEnum.BNB,
      FiatTypeEnum.ZEC,
      FiatTypeEnum.XAG,
      FiatTypeEnum.XAU,
      FiatTypeEnum.XPT,
      FiatTypeEnum.XDR,
    ].includes(fiat),
) as FiatTypeEnumWithoutCryptos[]
