export const BTC_SEGWIT_NATIVE_BIP44 = {
  purpose: 84,
  coinType: 0,
  accountNumber: 0
}

export enum FiatRampAction {
  Buy = 'buy',
  Sell = 'sell'
}

export enum GemManagerAction {
  SET_BTC_ADDRESS,
  SET_ETH_ADDRESS,
  SET_ENS_NAME,
  SET_SUPPORTS_ADDRESS_VERIFYING,
  SET_COINIFY_ASSETS,
  SET_WYRE_ASSETS,
  SET_FIAT_RAMP_ACTION,
  SET_CHAIN_ADAPTER,
  SET_BUY_LIST,
  SET_SELL_LIST,
  FETCH_STARTED,
  FETCH_COMPLETED
}
