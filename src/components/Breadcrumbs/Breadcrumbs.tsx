import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { BreadcrumbsRoute, Options } from 'react-router-breadcrumbs-hoc'
import withBreadcrumbs from 'react-router-breadcrumbs-hoc'
import type { RouteComponentProps } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { AccountLabel } from 'components/AssetHeader/AccountLabel'
import { Text } from 'components/Text/Text'
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
      params: { chainId, assetSubId, assetId: assetIdParam },
    },
  } = props

  const assetId = assetIdParam ? decodeURIComponent(assetIdParam) : `${chainId}/${assetSubId}`
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  return <>{asset?.name}</>
}

const routes: BreadcrumbsRoute[] = [
  {
    path: '/accounts/:accountId',
    breadcrumb: GetAccountName,
    routes: [
      { path: '/accounts/:accountId/transactions' },
      { path: '/accounts/:accountId/:assetId', breadcrumb: GetAssetName },
    ],
  },
  {
    path: '/trade',
    breadcrumb: 'Trade',
    routes: [{ path: '/trade/:chainId/:assetSubId', breadcrumb: GetAssetName }],
  },
  { path: '/assets/:chainId/:assetSubId(.+)', breadcrumb: GetAssetName },
  { path: '*', breadcrumb: GetTranslatedPathPart },
]

const options: Options = {
  excludePaths: [
    '/assets/:chainId',
    '/trade/:chainId',
    '/assets/:chainId/ibc:gamm',
    '/assets/:chainId/ibc:gamm/pool',
  ],
}

export const Breadcrumbs = withBreadcrumbs(
  routes,
  options,
)(({ breadcrumbs }: { breadcrumbs: any[] }) => {
  return (
    <Breadcrumb fontWeight='medium' fontSize='sm' color='gray.500'>
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
