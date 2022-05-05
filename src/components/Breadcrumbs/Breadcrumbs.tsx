import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react'
import withBreadcrumbs, { BreadcrumbsRoute } from 'react-router-breadcrumbs-hoc'
import { Link } from 'react-router-dom'
import { AccountLabel } from 'components/AssetHeader/AccountLabel'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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
  { path: '/accounts/:accountId', breadcrumb: GetAccountName },
  { path: '/accounts/:accountId/:assetId', breadcrumb: GetAssetName },
  { path: '/assets/:chainId/:assetSubId', breadcrumb: GetAssetName },
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
