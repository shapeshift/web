import { Alert, AlertIcon, Container, Stack } from '@chakra-ui/react'
import type { FC } from 'react'
import { getConfig } from 'config'
import { DappRegistryGrid } from './components/DappRegistryGrid'
import { ExplorationBanner } from './components/ExplorationBanner'
import { WalletActions } from 'context/WalletProvider/actions'

// @ts-ignore
import Client from '@pioneer-platform/pioneer-client'
import {useEffect, useState} from "react";
import {RegistryItem} from "./types";
import {useWallet} from "../../hooks/useWallet/useWallet";
import {useHistory} from "react-router";

export const WalletConnectToDapps: FC = () => {
  const [motd, setSetMotd] = useState('')
  const [spotlight, setSpotlight] = useState({
    name:"...",
    homepage:"",
    image:"...",
    description:"..."
  })
  const { dispatch } = useWallet()
  const history = useHistory()

  //get MOTD
  let updateMotd = async function(){
    try{
      let spec = getConfig().REACT_APP_DAPP_URL
      let config = { queryKey:'key:public', spec }
      let Api = new Client(spec,config)
      let api = await Api.init()
      let info = await api.Globals()
      console.log("info: ",info.data)
      setSetMotd(info.data.motd)

      let spotlight = await api.GetSpotlight()
      console.log("spotlight: ",spotlight.data)
      setSpotlight(spotlight.data)
    }catch(e){
      console.error(e)
    }
  }

  useEffect(() => {
    updateMotd()
  }, []);

  const openDapp = (app: RegistryItem) => {
    dispatch({ type: WalletActions.SET_BROWSER_URL, payload: app.homepage })
    history.push('/browser')
  }

  return (
    <Container p={4} maxW='container.lg'>
      <Stack spacing={10}>
        <Alert status='info'>
          <AlertIcon />
          {motd}
        </Alert>
        <ExplorationBanner
            spotlight={spotlight}
            size={100}
            openDapp={openDapp}
        />
        <DappRegistryGrid />
      </Stack>
    </Container>
  )
}
