import { matchPath } from 'react-router'

const FoxRoutePartToAssetId: Record<string, string> = {
  fox: 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
  foxy: 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
}

const FOX_PAGE_DEFAULT_ASSET = 'fox'

export const getFoxPageRouteAssetId = (pathname: string) => {
  const foxPageAssetIdPathMatch = matchPath<{ foxAsset?: string }>(pathname, {
    path: '/fox/:foxAsset?',
  })

  if (foxPageAssetIdPathMatch) {
    const foxAsset = foxPageAssetIdPathMatch?.params?.foxAsset ?? FOX_PAGE_DEFAULT_ASSET

    if (FoxRoutePartToAssetId[foxAsset]) {
      return FoxRoutePartToAssetId[foxAsset]
    }
  }
}
