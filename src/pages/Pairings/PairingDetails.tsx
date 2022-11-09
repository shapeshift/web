import { Badge, Box, Button, Code, Heading, Image, Stack, StackDivider } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { ipcRenderer } from 'electron'
import { useEffect, useState } from 'react'
import { FaClipboard } from 'react-icons/fa'
import { useParams } from 'react-router'
import { Card } from 'components/Card/Card'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'

import type { PairedAppProps } from './Pairings'

export interface BridgeLog {
  serviceKey: string
  body?: Object
  route: string
  method: string
  time: number
}

export const PairingDetails = () => {
  const params: any = useParams()
  const [logs, setLogs] = useState<BridgeLog[]>([])
  const [app, setApp] = useState<PairedAppProps>()

  useEffect(() => {
    if (!params || !params.serviceKey) return
    const serviceKey: string = params.serviceKey

    ipcRenderer.send('@bridge/service-details', serviceKey)
  }, [params])

  useEffect(() => {
    ipcRenderer.on('@bridge/service-details', (_event, data: any) => {
      setApp(data.app)
      setLogs(data.logs)
    })
  }, [])

  const copy = async (data: string) => {
    await navigator.clipboard.writeText(data)
  }

  return (
    <Main
      titleComponent={
        <Stack pb={4} direction='row'>
          <Image src={app?.serviceImageUrl} borderRadius='full' height='50' width='50' />
          <Heading>{app?.serviceName}</Heading>
        </Stack>
      }
    >
      <Stack direction={{ base: 'column', md: 'row' }} spacing={6}>
        <Card flex={1}>
          <Card.Header>
            <Stack pb={4}>
              <Heading>
                <Text translation={'pairingDetails.header'} />
              </Heading>
              <Text
                translation={['pairingDetails.body', { name: app?.serviceName }]}
                color='gray.500'
              />
            </Stack>
          </Card.Header>
          <Card.Body>
            <Stack divider={<StackDivider />}>
              {logs &&
                logs.map((log, idx) => (
                  <Box display='flex' flexDirection='row' alignItems='center' gap='10px' key={idx}>
                    <Badge
                      fontSize='inherit'
                      colorScheme={log.method.toLowerCase() === 'post' ? 'green' : 'blue'}
                    >
                      {log.method}
                    </Badge>
                    <Box>
                      <Code>{log.route}</Code>
                    </Box>
                    <Box>
                      <RawText>{dayjs(log.time).format('DD/MM/YYYY - HH:mm')}</RawText>
                    </Box>
                    <Box>
                      <Button
                        colorScheme='grey'
                        onClick={() => copy(JSON.stringify(log.body))}
                        leftIcon={<FaClipboard />}
                      >
                        Copy request body
                      </Button>
                    </Box>
                  </Box>
                ))}
              {(!logs || logs.length === 0) && <Text translation={'pairingDetails.noRequests'} />}
            </Stack>
          </Card.Body>
        </Card>
      </Stack>
    </Main>
  )
}
