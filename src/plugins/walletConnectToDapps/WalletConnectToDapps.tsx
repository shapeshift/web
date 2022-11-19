import { Alert, AlertIcon, Container, Stack } from '@chakra-ui/react'
import type { FC } from 'react'
import { getConfig } from 'config'
import { DappRegistryGrid } from './components/DappRegistryGrid'
import { ExplorationBanner } from './components/ExplorationBanner'

// @ts-ignore
import Client from '@pioneer-platform/pioneer-client'
import {useEffect, useState} from "react";

export const WalletConnectToDapps: FC = () => {
  const [motd, setSetMotd] = useState('')

  //get MOTD
  let updateMotd = async function(){
    try{
      let spec = getConfig().REACT_APP_DAPP_URL
      let config = { queryKey:'key:public', spec }
      let Api = new Client(spec,config)
      let api = await Api.init()
      let info = await api.instance.Globals()
      console.log("info: ",info.data)
      setSetMotd(info.data.motd)
    }catch(e){
      console.error(e)
    }
  }

  useEffect(() => {
    updateMotd()
  }, []);

  return (
    <Container p={4} maxW='container.lg'>
      <Stack spacing={10}>
        <Alert status='info'>
          <AlertIcon />
          {motd}
        </Alert>
        <ExplorationBanner />
        <DappRegistryGrid />
      </Stack>
    </Container>
  )
}
