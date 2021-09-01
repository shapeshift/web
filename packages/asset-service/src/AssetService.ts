// TODO
export class AssetService {
  constructor(assetFileUrl: string) {
    console.log('asset service constructor', assetFileUrl)
  }

  /**
   * gets specified assets or ALL assets if undefined
   */
  getAssets(assetIdentifiers: [string]) {
    console.log('getAssets', assetIdentifiers)
  }
}
