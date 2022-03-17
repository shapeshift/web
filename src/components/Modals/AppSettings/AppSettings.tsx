import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Switch
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useCallback, useEffect, useState } from 'react'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

export type AppSettings = {
  shouldAutoLunch: boolean
  shouldAutoStartBridge: boolean
  shouldMinimizeToTray: boolean
  bridgeApiPort: number
}

export const AppSettingsModal = () => {
  const { appSettings } = useModal()
  const { close, isOpen } = appSettings

  const [settings, setSettings] = useState<AppSettings>({
    shouldAutoLunch: true,
    shouldAutoStartBridge: true,
    shouldMinimizeToTray: true,
    bridgeApiPort: 1646
  })

  useEffect(() => {
    ipcRenderer.send('@app/settings')
    ipcRenderer.on('@app/settings', (event, data) => {
      setSettings(data)
    })
  }, [])

  const saveSettings = useCallback(() => {
    ipcRenderer.send('@app/update-settings', settings)
    close()
  }, [settings])

  if (!settings) return <Spinner />

  return (
    <SlideTransition>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          ipcRenderer.send('unlockWindow', {})
          close()
        }}
        isCentered
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        <ModalOverlay />
        <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
          <ModalCloseButton ml='auto' borderRadius='full' position='static' />
          <ModalHeader>
            <Text translation={'modals.appSettings.header'} />
          </ModalHeader>
          <ModalBody>
            <Stack spacing={4} mb={4}>
              <Row>
                <Text translation={'modals.appSettings.autoLaunch'} />
                <Switch
                  isChecked={settings.shouldAutoLunch}
                  onChange={() => {
                    setSettings(currentSettings => {
                      return {
                        ...currentSettings,
                        shouldAutoLunch: !currentSettings.shouldAutoLunch
                      }
                    })
                  }}
                />
              </Row>
              <Row>
                <Text translation={'modals.appSettings.autoStartBridge'} />
                <Switch
                  isChecked={settings.shouldAutoStartBridge}
                  onChange={() => {
                    setSettings(currentSettings => {
                      return {
                        ...currentSettings,
                        shouldAutoStartBridge: !currentSettings.shouldAutoStartBridge
                      }
                    })
                  }}
                />
              </Row>
              <Row>
                <Text translation={'modals.appSettings.minimizeToTray'} />
                <Switch
                  isChecked={settings.shouldMinimizeToTray}
                  onChange={() => {
                    setSettings(currentSettings => {
                      return {
                        ...currentSettings,
                        shouldMinimizeToTray: !currentSettings.shouldMinimizeToTray
                      }
                    })
                  }}
                />
              </Row>
              <Row>
                <Text translation={'modals.appSettings.bridgeApiPort'} />
                <Input
                  value={settings.bridgeApiPort}
                  size='sm'
                  width='25%'
                  rounded='lg'
                  disabled
                  onChange={e => {
                    setSettings(currentSettings => {
                      return {
                        ...currentSettings,
                        bridgeApiPort: Number(e.target.value)
                      }
                    })
                  }}
                />
              </Row>
              <Button onClick={saveSettings} colorScheme='blue'>
                <Text translation={'modals.appSettings.saveSettings'} />
              </Button>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </SlideTransition>
  )
}
