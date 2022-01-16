import { AssetService } from '@shapeshiftoss/asset-service'
import { expose } from 'workers'

import type { WorkerType } from './assetsSlice'

// eslint-disable-next-line import/no-default-export
export default expose<WorkerType>({
  create: async (...args: ConstructorParameters<typeof AssetService>): Promise<AssetService> => {
    return new AssetService(...args)
  }
})
