import { Asset } from '@shapeshiftoss/types'
import { ReceiveModal } from 'features/components/Modals/Receive/Receive'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

// TODO: update routes to be chain specific and pass proper routes into ReceiveModal for MemoryRouter.
// enum ReceiveRoutes {
//   Info = '/cosmos/receive/info',
//   Select = '/cosmos/receive/select'
// }
// const entries = [ReceiveRoutes.Info, ReceiveRoutes.Select]

type ReceivePropsType = {
  asset?: Asset
  accountId?: AccountSpecifier
}

export const CosmosReceiveModal = ({ asset, accountId }: ReceivePropsType) => {
  return <ReceiveModal asset={asset} accountId={accountId} />
}
