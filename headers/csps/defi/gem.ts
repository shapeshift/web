import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // https://github.com/shapeshift/web/blob/a565ca96133525cfe5ca6354c6c7c86019f171a7/src/components/Modals/FiatRamps/fiatRampProviders/gem.ts#L101
    'https://onramp.gem.co',
    // https://github.com/shapeshift/web/blob/70111acd6236759675cf81ddcd196c31472989a6/src/components/Modals/FiatRamps/utils.ts#L40
    process.env.REACT_APP_GEM_COINIFY_SUPPORTED_COINS!,
    // https://github.com/shapeshift/web/blob/70111acd6236759675cf81ddcd196c31472989a6/src/components/Modals/FiatRamps/utils.ts#L50
    process.env.REACT_APP_GEM_WYRE_SUPPORTED_COINS!,
    // https://github.com/shapeshift/web/blob/70111acd6236759675cf81ddcd196c31472989a6/src/components/Modals/FiatRamps/utils.ts#L13
    process.env.REACT_APP_GEM_ASSET_LOGO!,
  ],
  'img-src': [
    // https://github.com/shapeshift/web/blob/70111acd6236759675cf81ddcd196c31472989a6/src/components/Modals/FiatRamps/utils.ts#L13
    process.env.REACT_APP_GEM_ASSET_LOGO!,
  ],
}
