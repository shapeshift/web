import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { BreadcrumbsRoute, Options } from 'react-router-breadcrumbs-hoc'
import withBreadcrumbs from 'react-router-breadcrumbs-hoc'
import type { RouteComponentProps } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { AccountLabel } from 'components/AssetHeader/AccountLabel'
import { Text } from 'components/Text/Text'
import { assetIdPaths } from 'hooks/useRouteAssetId/useRouteAssetId'
import type { PartialRecord } from 'lib/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const GetTranslatedPathPart = ({ match }: { match: RouteComponentProps['match'] }) => {
  // a hack to gain the ability to translate the breadcrumbs
  // takes out the path part from the url
  // and uses navbar.[pathPart] for the translation
  const pathFragments = useMemo(() => match.url.split('/'), [match.url])
  // getting the last part from the url, since this works recursively
  const pathPart = pathFragments[pathFragments.length - 1]
  // translates `/` to home
  return <Text translation={`navBar.${pathPart ? pathPart : 'home'}`} />
}

const GetAccountName = (props: any) => {
  const {
    match: {
      params: { accountId },
    },
  } = props

  return <AccountLabel accountId={accountId} />
}

const GetAssetName = (props: {
  match: {
    params: PartialRecord<string, string>
  }
}) => {
  const {
    match: {
      params: { chainId, assetSubId, assetId: assetIdParam, poolId, nftId },
    },
  } = props

  const assetId: string = (() => {
    if (assetIdParam) return decodeURIComponent(assetIdParam)

    // add pool segment and poolId attribute for osmosis lp assets
    if (poolId) return `${chainId}/${assetSubId}/pool/${poolId}`

    // add nft segment and nftId attribute for nft assets
    if (nftId) return `${chainId}/${assetSubId}/${nftId}`

    return `${chainId}/${assetSubId}`
  })()

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  return <>{asset?.name}</>
}

const routes: BreadcrumbsRoute[] = [
  {
    path: '/dashboard/accounts/:accountId',
    breadcrumb: GetAccountName,
    routes: [
      { path: '/dashboard/accounts/:accountId/transactions' },
      { path: '/dashboard/accounts/:accountId/:assetId', breadcrumb: GetAssetName },
    ],
  },
  {
    path: '/trade',
    breadcrumb: 'Trade',
    routes: assetIdPaths.map(assetIdPath => ({
      path: `/trade${assetIdPath}`,
      breadcrumb: GetAssetName,
    })),
  },
  ...assetIdPaths.map(assetIdPath => ({ path: `/assets${assetIdPath}`, breadcrumb: GetAssetName })),
  { path: '*', breadcrumb: GetTranslatedPathPart },
]

const options: Options = {
  excludePaths: [
    '/assets/:chainId',
    '/trade/:chainId',
    // If it's an Osmosis IBC asset we need to ignore the segments 3 and 4 (ibc:gamm and pool)
    '/assets/:chainId/ibc\\:gamm',
    '/assets/:chainId/ibc\\:gamm/pool',
    '/trade/:chainId/ibc\\:gamm',
    '/trade/:chainId/ibc\\:gamm/pool',
    // Making /assets/<nftAssetId>/transactions happy
    '/assets/:chainId/:assetSubId',
  ],
}

export const Breadcrumbs = withBreadcrumbs(
  routes,
  options,
)(({ breadcrumbs }: { breadcrumbs: any[] }) => {
  return (
    <Breadcrumb fontWeight='medium' fontSize='sm' color='text.subtle'>
      {breadcrumbs.map(
        ({ breadcrumb, match }: { breadcrumb: ReactNode; match: { url: string } }) => {
          return (
            <BreadcrumbItem key={match.url}>
              <BreadcrumbLink as={Link} to={match.url}>
                {breadcrumb}
              </BreadcrumbLink>
            </BreadcrumbItem>
          )
        },
      )}
    </Breadcrumb>
  )
})
