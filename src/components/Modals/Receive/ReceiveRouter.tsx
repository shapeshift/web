import type { Asset } from '@shapeshiftoss/asset-service'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { SelectAssetRoutes } from 'components/SelectAssets/SelectAssetCommon'
import { SelectAssetRouter } from 'components/SelectAssets/SelectAssetRouter'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

import { ReceiveRoutes } from './ReceiveCommon'
import { ReceiveInfo } from './ReceiveInfo'

type ReceiveRouterProps = {
  asset?: Asset
  accountId?: AccountSpecifier
}
export const ReceiveRouter = ({ asset, accountId }: ReceiveRouterProps) => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(asset)
  const [selectedAccount, setSelectedAccount] = useState<AccountSpecifier>()
  const location = useLocation()
  const history = useHistory()

  const handleAssetSelect = async (asset: Asset, accountId: AccountSpecifier) => {
    setSelectedAsset(asset)
    setSelectedAccount(accountId)
    history.push(ReceiveRoutes.Info)
  }

  useEffect(() => {
    if (!selectedAsset && !asset && !accountId) {
      history.push(ReceiveRoutes.Select)
    } else if (selectedAsset && asset && !accountId) {
      history.push(ReceiveRoutes.Select, {
        toRoute: SelectAssetRoutes.Account,
        assetId: asset.assetId,
      })
    } else if (asset && accountId) {
      setSelectedAccount(accountId)
      setSelectedAsset(asset)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route
          path={ReceiveRoutes.Info}
          component={(props: RouteComponentProps) =>
            selectedAccount && selectedAsset ? (
              <ReceiveInfo asset={selectedAsset} accountId={selectedAccount} {...props} />
            ) : null
          }
        />
        <Route
          path={ReceiveRoutes.Select}
          component={(props: RouteComponentProps) => (
            <SelectAssetRouter onClick={handleAssetSelect} {...props} />
          )}
        />
      </Switch>
    </AnimatePresence>
  )
}
