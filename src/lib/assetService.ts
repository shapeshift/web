import { AssetService } from '@shapeshiftoss/asset-service'

export let service: AssetService | undefined = undefined

export const getAssetService = async () => {
  if (!service) {
    service = new AssetService('')
  }
  if (!service.isInitialized) {
    await service.initialize()
  }
}
