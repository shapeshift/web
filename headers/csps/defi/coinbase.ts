import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    // https://github.com/shapeshift/web/blob/70111acd6236759675cf81ddcd196c31472989a6/src/components/Modals/FiatRamps/utils.ts#L13
    process.env.REACT_APP_COINBASE_SUPPORTED_COINS!,
  ],
}
