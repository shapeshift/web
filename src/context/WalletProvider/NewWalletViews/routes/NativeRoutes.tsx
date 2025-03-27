import { Route, Routes } from 'react-router-dom'

import { EnterPassword } from '../../NativeWallet/components/EnterPassword'
import { NativeCreate } from '../../NativeWallet/components/NativeCreate'
import { NativeImportKeystore } from '../../NativeWallet/components/NativeImportKeystore'
import { NativeImportSeed } from '../../NativeWallet/components/NativeImportSeed'
import { NativeImportSelect } from '../../NativeWallet/components/NativeImportSelect'
import { NativePassword } from '../../NativeWallet/components/NativePassword'
import { NativeSuccess } from '../../NativeWallet/components/NativeSuccess'
import { NativeTestPhrase } from '../../NativeWallet/components/NativeTestPhrase'
import type { NativeSetupProps } from '../../NativeWallet/types'
import { NativeDelete } from '../wallets/native/NativeDelete'
import { NativeRename } from '../wallets/native/NativeRename'
import { NativeStart } from '../wallets/native/NativeStart'

import { NativeWalletRoutes } from '@/context/WalletProvider/types'

export const NativeRoutes = () => (
  <Routes>
    <Route path={NativeWalletRoutes.Connect} element={<NativeStart />} />
    <Route path={NativeWalletRoutes.ImportKeystore} element={<NativeImportKeystore />} />
    <Route path={NativeWalletRoutes.ImportSeed} element={<NativeImportSeed />} />
    <Route path={NativeWalletRoutes.ImportSelect} element={<NativeImportSelect />} />
    <Route path={NativeWalletRoutes.Create} element={<NativeCreate />} />
    <Route path={NativeWalletRoutes.Password} element={<NativePassword />} />
    <Route path={NativeWalletRoutes.Rename} element={<NativeRename />} />
    <Route path={NativeWalletRoutes.Delete} element={<NativeDelete />} />
    <Route path={NativeWalletRoutes.EnterPassword} element={<EnterPassword />} />
    <Route path={NativeWalletRoutes.Success} element={<NativeSuccess />} />
    <Route path={NativeWalletRoutes.CreateTest} element={<NativeTestPhrase />} />
  </Routes>
)
