/** @type {Record<string, Array<string>>} */
module.exports = {
  'connect-src': [
    // @shapeshiftoss/market-service-v2.2.0: https://github.com/shapeshift/lib/blob/7f4bc4390cfbb6470abc630998c14f7701e0b1b9/packages/market-service/src/exchange-rates-host/exchange-rates-host.ts#L15
    'https://api.exchangerate.host/',
  ],
}
