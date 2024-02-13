import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Button, Divider, Flex, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { getWalletCount } from '../mobileMessageHandlers'

const directionProp: ResponsiveValue<Property.FlexDirection> = ['column', 'row']
const mlProp = [0, 1.5]

const arrowForwardIcon = <ArrowForwardIcon />

export const MobileStart = ({ history }: RouteComponentProps) => {
  const isShapeShiftMobileWalletEnabled = useFeatureFlag('ShapeShiftMobileWallet')
  const [hasLocalWallet, setHasLocalWallet] = useState<boolean>(false)
  const translate = useTranslate()

  useEffect(() => {
    ;(async () => {
      try {
        const localWallets = await getWalletCount()
        setHasLocalWallet(localWallets > 0)
      } catch (e) {
        console.log(e)
        setHasLocalWallet(false)
      }
    })()
  }, [setHasLocalWallet])

  const handleLoad = useCallback(() => history.push('/mobile/load'), [history])
  const handleCreate = useCallback(() => history.push('/mobile/create'), [history])
  const handleImport = useCallback(() => history.push('/mobile/import'), [history])
  const handleLogin = useCallback(() => history.push('/mobile/legacy/login'), [history])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.start.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='text.subtle' translation={'walletProvider.shapeShift.start.body'} />
        <Stack mt={6} spacing={4}>
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            isDisabled={!hasLocalWallet}
            onClick={handleLoad}
            data-test='wallet-native-load-button'
          >
            <Text translation={'walletProvider.shapeShift.start.load'} />
          </Button>
          <Divider />
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            onClick={handleCreate}
            data-test='wallet-native-create-button'
          >
            <Text translation={'walletProvider.shapeShift.start.create'} />
          </Button>
          <Button
            w='full'
            h='auto'
            px={6}
            py={4}
            justifyContent='space-between'
            rightIcon={arrowForwardIcon}
            onClick={handleImport}
            data-test='wallet-native-import-button'
          >
            <Text translation={'walletProvider.shapeShift.start.import'} />
          </Button>
          {isShapeShiftMobileWalletEnabled && (
            <>
              <Divider mt={4} />
              <Flex
                direction={directionProp}
                mt={2}
                pt={4}
                justifyContent='center'
                alignItems='center'
              >
                <Text translation={'walletProvider.shapeShift.legacy.haveMobileWallet'} />
                <Button
                  variant='link'
                  ml={mlProp}
                  borderTopRadius='none'
                  colorScheme='blue'
                  onClick={handleLogin}
                >
                  {translate('common.login')}
                </Button>
              </Flex>
            </>
          )}
        </Stack>
      </ModalBody>
    </>
  )
}
