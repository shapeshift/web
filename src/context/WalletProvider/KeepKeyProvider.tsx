import { isKeepKey, KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { RadioOption } from 'components/Radio/Radio'
import { useWallet } from 'hooks/useWallet/useWallet'

export enum DeviceTimeout {
  TenMinutes = '600000',
  FifteenMinutes = '900000',
  TwentyMinutes = '1200000',
  ThirtyMinutes = '1800000',
  FortyFiveMinutes = '2700000',
  SixtyMinutes = '3600000'
}

export const timeoutOptions: RadioOption<DeviceTimeout>[] = [
  {
    value: DeviceTimeout.TenMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '10' }]
  },
  {
    value: DeviceTimeout.FifteenMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '15' }]
  },
  {
    value: DeviceTimeout.TwentyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '20' }]
  },
  {
    value: DeviceTimeout.ThirtyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '30' }]
  },
  {
    value: DeviceTimeout.FortyFiveMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '45' }]
  },
  {
    value: DeviceTimeout.SixtyMinutes,
    label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '60' }]
  }
]

export interface IKeepKeyContext {
  pinCaching: boolean | undefined
  passphrase: boolean | undefined
  keepKeyWallet: KeepKeyHDWallet | undefined
  deviceTimeout: RadioOption<DeviceTimeout> | undefined
}

const KeepKeyContext = createContext<IKeepKeyContext | null>(null)

export const KeepKeyProvider = ({ children }: { children: React.ReactNode }): JSX.Element => {
  const {
    state: { wallet }
  } = useWallet()
  const keepKeyWallet = useMemo(() => (wallet && isKeepKey(wallet) ? wallet : undefined), [wallet])
  const [pinCaching, setPinCaching] = useState<boolean>()
  const [passphrase, setPassphrase] = useState<boolean>()
  const [deviceTimeout, setDeviceTimeout] = useState<RadioOption<DeviceTimeout>>()

  useEffect(() => {
    if (!keepKeyWallet) return
    ;(async () => {
      setPassphrase(keepKeyWallet?.features?.passphraseProtection)
      setPinCaching(
        keepKeyWallet?.features?.policiesList.find(p => p.policyName === 'Pin Caching')?.enabled
      )
      setDeviceTimeout(
        Object.values(timeoutOptions).find(
          t => Number(t.value) === keepKeyWallet?.features?.autoLockDelayMs
        )
      )
    })()
  }, [keepKeyWallet])

  const value: IKeepKeyContext = useMemo(
    () => ({
      pinCaching,
      passphrase,
      keepKeyWallet,
      deviceTimeout
    }),
    [deviceTimeout, keepKeyWallet, passphrase, pinCaching]
  )

  return <KeepKeyContext.Provider value={value}>{children}</KeepKeyContext.Provider>
}

export const useKeepKey = (): IKeepKeyContext =>
  useContext(KeepKeyContext as React.Context<IKeepKeyContext>)
