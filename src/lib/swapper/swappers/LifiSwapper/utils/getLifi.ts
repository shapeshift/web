import LIFI from '@lifi/sdk'

// don't export me, access me through the getter
let _lifi: LIFI | null = null

export const getLifi = (): LIFI => {
  if (_lifi) return _lifi

  // instantiate if it doesn't already exist
  _lifi = new LIFI({
    disableVersionCheck: true, // prevent console fetching and notifying client about updates
  })

  return _lifi
}
