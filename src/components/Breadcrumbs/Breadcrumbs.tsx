import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { BreadcrumbsRoute } from 'react-router-breadcrumbs-hoc'
import withBreadcrumbs from 'react-router-breadcrumbs-hoc'
import { Link } from 'react-router-dom'
import { AccountLabel } from 'components/AssetHeader/AccountLabel'
import { Text } from 'components/Text/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const GetTranslatedPathPart = (props: any) => {
  // a hack to gain the ability to translate the breadcrumbs
  // takes out the path part from the url
  // and uses navbar.[pathPart] for the translation
  const splittedPath = useMemo(() => props.match.params[0].split('/'), [props.match.params])
  // getting the last part from the url, since this works recursively
  const pathPart = splittedPath[splittedPath.length - 1]
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

const GetAssetName = (props: any) => {
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
  { path: '/assets/:chainId/:assetSubId', breadcrumb: GetAssetName },
  { path: '*', breadcrumb: GetTranslatedPathPart },
]

const options = {
  excludePaths: ['/assets/:chainId'],
}

export const Breadcrumbs = withBreadcrumbs(
  routes,
  options,
)(({ breadcrumbs }: { breadcrumbs: any }) => {
  return (
    <Breadcrumb fontWeight='medium' fontSize='sm' color='gray.500'>
      {breadcrumbs.map(({ breadcrumb, match }: { breadcrumb: any; match: any }) => {
        return (
          <BreadcrumbItem key={match.url}>
            <BreadcrumbLink as={Link} to={match.url}>
              {breadcrumb}
            </BreadcrumbLink>
          </BreadcrumbItem>
        )
      })}
    </Breadcrumb>
  )
})
