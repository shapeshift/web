import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { matchPath, useHistory, useLocation } from 'react-router'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { resolveYat, validateYat } from 'lib/address/yat'

/**
 * see https://github.com/shapeshift/web/issues/4604
 * this route is used to handle when a user successfully purchases a yat
 *
 * https://a.y.at/emoji_id/%F0%9F%A6%8A%F0%9F%9A%80%F0%9F%8C%88 for example
 * which is 🦊🚀🌈 without URL encoding
 *
 * yat refers to them as "eid"s, i.e. emoji id's
 *
 * the app (including mobile app) will redirect to /yat/eid
 * full example url http://localhost:3000/#/yat/%F0%9F%A6%8A%F0%9F%9A%80%F0%9F%8C%88
 */
export const Yat: React.FC = () => {
  // nulls here are the "loading" state
  const [eid, setEid] = useState<string | null>(null)
  const [maybeYatEthAddress, setMaybeYatEthAddress] = useState<string | null>(null)
  const [maybeYatUsdcAddress, setMaybeYatUsdcAddress] = useState<string | null>(null)
  const history = useHistory()
  const { pathname } = useLocation()

  useEffect(() => {
    const eidMatch = matchPath<{ eid?: string }>(pathname, {
      path: '/yat/:eid',
    })

    const maybeEid = eidMatch?.params?.eid || ''

    // no eid on the route, e.g. just /yat, send them back home
    if (!maybeEid) history.replace('/dashboard')

    setEid(maybeEid)
  }, [history, pathname])

  /**
   * this logic is here in the modal rather than the context
   * so it's not spamming yat api on every render cycle
   */
  useEffect(() => {
    if (!eid) return
    type YatResolution = {
      assetId: AssetId
      setter: React.Dispatch<React.SetStateAction<string | null>>
    }

    /**
     * unlike ENS names, yat's can be associated with multiple addresses by asset
     * namely, eth address and the usdc address
     */
    const resolutionPaths: YatResolution[] = [
      {
        assetId: ethAssetId,
        setter: setMaybeYatEthAddress,
      },
      {
        assetId: usdcAssetId,
        setter: setMaybeYatUsdcAddress,
      },
    ]

    ;(async () => {
      const isValidYat = await validateYat({ maybeAddress: eid })
      // wrong yat send them home
      if (!isValidYat) return history.replace('/dashboard')

      resolutionPaths.forEach(async ({ assetId, setter }) => {
        /**
         * resolveYat can return empty string (nothing resolved/attached), or an address.
         * we set the returned value regardless, empty string becomes the "loaded" state
         */
        setter(await resolveYat({ assetId, maybeAddress: eid }))
      })
    })()
  }, [eid, history])

  return (
    <>
      <div>yat emojis: {eid}</div>
      <div>
        yat usdc address:{' '}
        <pre>
          {maybeYatUsdcAddress === null
            ? 'loading'
            : maybeYatUsdcAddress === ''
            ? 'no usdc addy'
            : maybeYatUsdcAddress}
        </pre>
      </div>
      <div>
        yat eth address:{' '}
        {maybeYatEthAddress === null
          ? 'loading'
          : maybeYatEthAddress === ''
          ? 'no eth addy'
          : maybeYatEthAddress}
      </div>
    </>
  )
}
