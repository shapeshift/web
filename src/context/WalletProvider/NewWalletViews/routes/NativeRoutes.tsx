import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { EnterPassword } from '../../NativeWallet/components/EnterPassword'
import { NativeCreate } from '../../NativeWallet/components/NativeCreate'
import { NativeImportKeystore } from '../../NativeWallet/components/NativeImportKeystore'
import { NativeImportSeed } from '../../NativeWallet/components/NativeImportSeed'
import { NativeImportSelect } from '../../NativeWallet/components/NativeImportSelect'
import { NativePassword } from '../../NativeWallet/components/NativePassword'
import { NativeSkipConfirm } from '../../NativeWallet/components/NativeSkipConfirm'
import { NativeSuccess } from '../../NativeWallet/components/NativeSuccess'
import { NativeTestPhrase } from '../../NativeWallet/components/NativeTestPhrase'
import { NativeWordsError } from '../../NativeWallet/components/NativeWordsError'
import { NativeDelete } from '../wallets/native/NativeDelete'
import { NativeRename } from '../wallets/native/NativeRename'
import { NativeStart } from '../wallets/native/NativeStart'

import { NativeWalletRoutes } from '@/context/WalletProvider/types'

export const NativeRoutes = () => {
  const nativeStartElement = useMemo(() => <NativeStart />, [])
  const nativeImportKeystoreElement = useMemo(() => <NativeImportKeystore />, [])
  const nativeImportSeedElement = useMemo(() => <NativeImportSeed />, [])
  const nativeImportSelectElement = useMemo(() => <NativeImportSelect />, [])
  const nativeCreateElement = useMemo(() => <NativeCreate />, [])
  const nativePasswordElement = useMemo(() => <NativePassword />, [])
  const nativeRenameElement = useMemo(() => <NativeRename />, [])
  const nativeDeleteElement = useMemo(() => <NativeDelete />, [])
  const enterPasswordElement = useMemo(() => <EnterPassword />, [])
  const nativeSuccessElement = useMemo(() => <NativeSuccess />, [])
  const nativeTestPhraseElement = useMemo(() => <NativeTestPhrase />, [])
  const nativeWordsErrorElement = useMemo(() => <NativeWordsError />, [])
  const nativeSkipConfirmElement = useMemo(() => <NativeSkipConfirm />, [])

  return (
    <Routes>
      <Route path={NativeWalletRoutes.Connect} element={nativeStartElement} />
      <Route path={NativeWalletRoutes.ImportKeystore} element={nativeImportKeystoreElement} />
      <Route path={NativeWalletRoutes.ImportSeed} element={nativeImportSeedElement} />
      <Route path={NativeWalletRoutes.ImportSelect} element={nativeImportSelectElement} />
      <Route path={NativeWalletRoutes.Create} element={nativeCreateElement} />
      <Route path={NativeWalletRoutes.Password} element={nativePasswordElement} />
      <Route path={NativeWalletRoutes.Rename} element={nativeRenameElement} />
      <Route path={NativeWalletRoutes.Delete} element={nativeDeleteElement} />
      <Route path={NativeWalletRoutes.EnterPassword} element={enterPasswordElement} />
      <Route path={NativeWalletRoutes.Success} element={nativeSuccessElement} />
      <Route path={NativeWalletRoutes.CreateTest} element={nativeTestPhraseElement} />
      <Route path={NativeWalletRoutes.WordsError} element={nativeWordsErrorElement} />
      <Route path={NativeWalletRoutes.SkipConfirm} element={nativeSkipConfirmElement} />
    </Routes>
  )
}
