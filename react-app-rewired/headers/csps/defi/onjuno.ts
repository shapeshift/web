import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // https://github.com/shapeshift/web/blob/d076ba9764180cd8e6f18f28b5fd23e92796d559/src/components/Modals/FiatRamps/fiatRampProviders/coinbase-pay.ts#L41
    process.env.REACT_APP_ONJUNOPAY_BASE_API_URL!,
  ],
  'img-src': [
    // https://github.com/shapeshift/web/blob/70111acd6236759675cf81ddcd196c31472989a6/src/components/Modals/FiatRamps/utils.ts#L13
    process.env.REACT_APP_ONJUNOPAY_ASSET_LOGO_URL!,
  ],
}
