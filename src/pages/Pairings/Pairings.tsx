import { Box, Button, Heading, HStack, Stack, StackDivider, Image } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import { ipcRenderer } from 'electron'
import dayjs from 'dayjs'

export type PairedAppProps = {
  addedOn: number
  serviceName: string
  serviceImageUrl: string
  serviceKey: string
}

const PairingsHeader = () => {
  return (
    <Stack pb={4}>
      <Heading>Pairings</Heading>
    </Stack>
  )
}

export const Pairings = () => {
  const [apps, setApps] = useState<PairedAppProps[]>([])

  useEffect(() => {
    ipcRenderer.send('@bridge/paired-apps')
    ipcRenderer.on('@bridge/paired-apps', (_event, data: PairedAppProps[]) => {
      setApps(data)
    })
  }, [])

  const unpair = (app: PairedAppProps) => {
    ipcRenderer.send('@bridge/remove-service', app)
    ipcRenderer.send('@bridge/paired-apps')
  }

  const unpairAll = useCallback(() => {
    if (!apps) return
    apps.forEach(unpair)
  }, [apps])


  return (
    <Main titleComponent={<PairingsHeader />}>
      <Stack direction={{ base: 'column', md: 'row' }} spacing={6}>
        <Card flex={1}>
          <Card.Header>
            <Text translation={'pairedApps.body'} color='gray.500' />
          </Card.Header>
          <Card.Body>
            <Stack divider={<StackDivider />}>
              {apps &&
                apps.map(app => (
                  <Box display='flex' flexDirection='row' alignItems='center' gap='10px'>
                    <Image src={app.serviceImageUrl} borderRadius='full' height='10' width='10' />
                    <Box display='flex' flexDirection='row' flexGrow={1} alignItems='center'>
                      <p>{app.serviceName}</p>
                    </Box>
                    <Box>
                      <RawText color='gray.500' fontSize='xs'>
                        {dayjs(app.addedOn).format('DD/MM/YYYY - HH:mm')}
                      </RawText>
                    </Box>
                    <Box>
                      <Button
                        colorScheme='red'
                        onClick={() => {
                          unpair(app)
                        }}
                      >
                        <Text translation={'pairedApps.cta.unpair'} />
                      </Button>
                    </Box>
                  </Box>
                ))}
              {(!apps || apps.length === 0) && <Text translation={'pairedApps.noApps'} />}
            </Stack>
          </Card.Body>
          {(apps && apps.length !== 0) && <Card.Footer>
            <HStack my={4} width='full'>
              <Button onClick={unpairAll}>Unpair all apps</Button>
            </HStack>
          </Card.Footer>}
        </Card>
      </Stack>
    </Main>
  )
}
