import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@chakra-ui/react'
import withBreadcrumbs, { BreadcrumbsRoute } from 'react-router-breadcrumbs-hoc'
import { Link } from 'react-router-dom'
import { AccountLabel } from 'components/AssetHeader/AccountLabel'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const GetAccountName = (props: any) => {
  const {
    match: {
      params: { accountId }
    }
  } = props
  const assetId = accountIdToFeeAssetId(accountId)
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  return <AccountLabel accountId={accountId} />
}

const GetAssetName = (props: any) => {
  const {
    match: {
      params: { assetId }
    }
  } = props
  const decodedAssetId = decodeURIComponent(assetId)
  const asset = useAppSelector(state => selectAssetByCAIP19(state, decodedAssetId))
  return <>{asset?.name}</>
}

const routes: BreadcrumbsRoute[] = [
  { path: '/accounts/:accountId', breadcrumb: GetAccountName },
  { path: '/accounts/:accountId/:assetId', breadcrumb: GetAssetName },
  { path: '/assets/:assetId', breadcrumb: GetAssetName }
]

export const Breadcrumbs = withBreadcrumbs(routes)(({ breadcrumbs }: { breadcrumbs: any }) => {
  return (
    <Breadcrumb fontWeight='medium' fontSize='sm' color='gray.500'>
      {breadcrumbs.map(({ breadcrumb, match }) => {
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
