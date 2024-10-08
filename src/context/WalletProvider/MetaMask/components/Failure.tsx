import uniqBy from 'lodash/uniqBy'
import type { InterpolationOptions } from 'node-polyglot'
import { useMemo, useSyncExternalStore } from 'react'
import { FailureModal } from 'context/WalletProvider/components/FailureModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { mipdStore, staticMipdProviders } from 'lib/mipd'

export const MetaMaskFailure = () => {
  const {
    state: { modalType },
  } = useWallet()
  const detectedMipdProviders = useSyncExternalStore(mipdStore.subscribe, mipdStore.getProviders)
  const mipdProviders = useMemo(
    () => uniqBy(detectedMipdProviders.concat(staticMipdProviders), 'info.rdns'),
    [detectedMipdProviders],
  )
  const maybeMipdProvider = mipdProviders.find(provider => provider.info.rdns === modalType)

  const bodyText: [string, InterpolationOptions] = useMemo(
    () => [
      'walletProvider.mipd.failure.body',
      { name: maybeMipdProvider?.info.name ?? 'MetaMask' },
    ],
    [maybeMipdProvider?.info.name],
  )

  return <FailureModal headerText={'common.error'} bodyText={bodyText} />
}
