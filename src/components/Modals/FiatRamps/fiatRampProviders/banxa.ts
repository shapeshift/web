import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'

export const getCoins = async () => {
  // TODO(stackedQ): get the supported list from the lib repo
  const coins: FiatRampAsset[] = []
  return coins
}

export const createBanxaUrl = async (
  action: FiatRampAction,
  asset: string,
  address: string,
): Promise<string> => {
  const BANXA_URL = 'https://shapeshift.banxa.com?'
  let url = `${BANXA_URL}`
  url += `fiatType=USD&`
  url += `coinType=${asset}&`
  url += `walletAddress=${address}`
  /**
   * based on https://docs.banxa.com/docs/referral-method
   * if sellMode query parameter is not passed `buyMode` will be used
   */
  if (action === FiatRampAction.Sell) url += `&sellMode`
  return url
}
