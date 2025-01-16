import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Button, Divider, Flex, ModalBody, ModalHeader, Stack } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router'
import { Text } from 'components/Text'
import { NativeWalletRoutes } from 'context/WalletProvider/types'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

const directionProp: ResponsiveValue<Property.FlexDirection> = ['column', 'row']
const mlProp = [0, 1.5]
const arrowForwardIcon = <ArrowForwardIcon />

export const NativeStart = ({ history }: RouteComponentProps) => {
  const isShapeShiftMobileWalletEnabled = useFeatureFlag('ShapeShiftMobileWallet')
  const translate = useTranslate()

  const handleCreate = useCallback(() => history.push(NativeWalletRoutes.Create), [history])
  const handleImportClick = useCallback(
    () => history.push(NativeWalletRoutes.ImportSelect),
    [history],
  )
  const handleLogin = useCallback(() => history.push(NativeWalletRoutes.LegacyLogin), [history])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.start.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='text.subtle' translation={'walletProvider.shapeShift.start.body'} />
        <Stack mt={6} spacing={4}>
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
            onClick={handleImportClick}
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
