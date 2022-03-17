import { Wrap } from '@chakra-ui/react'
import axios from 'axios'
import { useEffect, useState } from 'react'

import { WalletConnectAppTile } from './WalletConnectAppTile'

export type WalletConnectApp = {
  id: string
  name: string
  description: string
  homepage: string
  chains: Array<string>
  versions: Array<string>
  image_id: string
  image_url: {
    sm: string
    md: string
    lg: string
  }
  app: {
    browser: string
    ios: string
    android: string
    mac: string
    windows: string
    linux: string
  }
  mobile: {
    native: string
    universal: string
  }
  desktop: {
    native: string
    universal: string
  }
  metadata: {
    shortName: string
    colors: {
      primary: string
      secondary: string
    }
  }
}

export const AppsList = () => {
  const [apps, setApps] = useState<Array<WalletConnectApp>>([])

  useEffect(() => {
    axios.get('https://registry.walletconnect.com/api/v1/dapps').then(resp => {
      setApps(Object.values(resp.data.listings))
    })
  }, [])

  return <Wrap>{apps && apps.map(app => <WalletConnectAppTile app={app} />)}</Wrap>
}
