import { GetStarted } from 'features/defi/components/GetStarted/GetStarted'
import {
  DefiAction,
  DefiParams
} from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { useParams } from 'react-router'

type CosmosSdkManagerProps = {
  assetId: string
}

// TODO: Add proper routing with MemoryRouter, this just handles the "Get Started" modal route for now
export const CosmosSdkManager = ({ assetId }: CosmosSdkManagerProps) => {
  const params = useParams<DefiParams>()

  if (params.action === DefiAction.GetStarted) return <GetStarted assetId={assetId} />
  return null
}
