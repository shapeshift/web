import { Button, Card, CardHeader, Center, Heading } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { Summary } from 'features/defi/components/Summary'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, useHistory, useLocation } from 'react-router'
import { NavLink } from 'react-router-dom'
import { YatIcon } from 'components/Icons/YatIcon'
import { usdcAssetId } from 'components/Modals/FiatRamps/config'
import { Row } from 'components/Row/Row'
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
  const translate = useTranslate()
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
    <Center height='calc(100vh - 76px)' px={6}>
      <Card overflow='hidden' bg='transparent'>
        <CardHeader textAlign='center' pb={8}>
          <YatIcon boxSize={16} color='green.200' />
          <Heading as='h1'>{translate('features.yat.yatConnected')}</Heading>
        </CardHeader>
        <Summary>
          <Row variant='gutter' alignItems='center'>
            <Row.Label>{translate('features.yat.linkedYat')}</Row.Label>
            <Row.Value fontSize='2xl'>{eid}</Row.Value>
          </Row>
          <Row variant='vert-gutter'>
            <Row.Label>{translate('features.yat.usdcAddress')}</Row.Label>
            <Row.Value wordBreak='break-all'>
              {maybeYatUsdcAddress === null
                ? 'loading'
                : maybeYatUsdcAddress === ''
                ? 'no usdc addy'
                : maybeYatUsdcAddress}
            </Row.Value>
          </Row>
          <Row variant='vert-gutter'>
            <Row.Label>{translate('features.yat.ethAddress')}</Row.Label>
            <Row.Value wordBreak='break-all'>
              {maybeYatEthAddress === null
                ? 'loading'
                : maybeYatEthAddress === ''
                ? 'no eth addy'
                : maybeYatEthAddress}
            </Row.Value>
          </Row>
        </Summary>
        <Button as={NavLink} to='/dashboard' colorScheme='blue' size='lg' mt={6}>
          {translate('common.viewMyWallet')}
        </Button>
      </Card>
    </Center>
  )
}
