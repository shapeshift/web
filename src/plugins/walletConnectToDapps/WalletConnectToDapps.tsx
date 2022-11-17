import { Alert, AlertIcon, Container, Stack } from '@chakra-ui/react'
import type { FC } from 'react'

import { DappRegistryGrid } from './components/DappRegistryGrid'
import { ExplorationBanner } from './components/ExplorationBanner'

// @ts-ignore
import Client from '@pioneer-platform/pioneer-client'
import {useEffect} from "react";

export const WalletConnectToDapps: FC = () => {

  //get MOTD
  let updateMotd = async function(){
    try{
      let spec = "http://127.0.0.1:9001/spec/swagger.json"
      let config = { queryKey:'key:public', spec }
      let Api = new Client(spec,config)
      let api = await Api.init()
      let info = await api.Instance.Globals()
      console.log("info: ",info)
    }catch(e){
      console.error(e)
    }
  }

  useEffect(() => {
    updateMotd()
  })

  return (
    <Container p={4} maxW='container.lg'>
      <Stack spacing={10}>
        <Alert status='info'>
          <AlertIcon />
          Hello World
        </Alert>
        <ExplorationBanner />
        <DappRegistryGrid />
      </Stack>
    </Container>
  )
}
