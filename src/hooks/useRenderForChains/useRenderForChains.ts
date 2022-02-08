import { caip2 } from '@shapeshiftoss/caip'
import { ChainTypes } from '@shapeshiftoss/types'
import { useAsset } from 'pages/Assets/Asset'

export const useRenderForChains = (supportedChains: ChainTypes[], renderComponent: Function) => {
  const { asset } = useAsset()
  const { chain } = caip2.fromCAIP2(asset.caip2)

  return supportedChains.includes(chain) ? renderComponent() : null
}
