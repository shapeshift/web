import { ArrowBackIcon, CheckIcon, CopyIcon, ViewIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Circle,
  Flex,
  HStack,
  IconButton,
  LightMode,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Skeleton,
  SkeletonText,
  useColorModeValue,
  useToast
} from '@chakra-ui/react'
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { Asset } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { QRCode } from 'components/QRCode/QRCode'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { ReduxState } from 'state/reducer'

import { ReceiveRoutes } from './Receive'

type ReceivePropsType = {
  asset: Asset
}

export const ReceiveInfo = ({ asset }: ReceivePropsType) => {
  const { chain, name, symbol } = asset
  const { state } = useWallet()
  const [receiveAddress, setReceiveAddress] = useState<string>('')
  const [verified, setVerified] = useState<boolean | null>(null)
  const chainAdapterManager = useChainAdapters()
  const history = useHistory()

  const { wallet } = state
  const chainAdapter = chainAdapterManager.byChain(chain)

  const currentAccountType = useSelector(
    (state: ReduxState) => state.preferences.accountTypes[asset.chain]
  )

  useEffect(() => {
    ;(async () => {
      if (!(wallet && chainAdapter)) return
      const accountParams = currentAccountType
        ? utxoAccountParams(asset, currentAccountType, 0)
        : {}
      setReceiveAddress(
        await chainAdapter.getAddress({
          wallet,
          accountType: currentAccountType,
          ...accountParams
        })
      )
    })()
  }, [setReceiveAddress, currentAccountType, asset, wallet, chainAdapter])

  const handleVerify = async () => {
    const accountParams = currentAccountType ? utxoAccountParams(asset, currentAccountType, 0) : {}

    if (!(wallet && chainAdapter && receiveAddress)) return
    const deviceAddress = await chainAdapter.getAddress({
      wallet,
      showOnDevice: true,
      accountType: currentAccountType,
      ...accountParams
    })

    setVerified(Boolean(deviceAddress) && deviceAddress === receiveAddress)
  }

  const translate = useTranslate()
  const toast = useToast()

  const hoverColor = useColorModeValue('gray.900', 'white')
  const bg = useColorModeValue('gray.100', 'gray.700')

  const copyHandler = async () => {
    const duration = 2500
    const isClosable = true
    const translatePayload = { symbol: symbol.toUpperCase() }
    const toastPayload = { duration, isClosable }
    try {
      await navigator.clipboard.writeText(receiveAddress)
      const title = translate('modals.receive.copied', translatePayload)
      const status = 'success'
      const description = receiveAddress
      toast({ description, title, status, ...toastPayload })
    } catch (e) {
      const title = translate('modals.receive.copyFailed', translatePayload)
      const status = 'error'
      const description = translate('modals.receive.copyFailedDescription')
      toast({ description, title, status })
    }
  }

  return (
    <>
      <ModalHeader
        textAlign='center'
        display='flex'
        justifyContent='space-between'
        alignItems='center'
      >
        <IconButton
          variant='ghost'
          icon={<ArrowBackIcon />}
          aria-label={translate('common.back')}
          fontSize='xl'
          size='sm'
          isRound
          onClick={() => history.push(ReceiveRoutes.Select)}
        />
        <Text
          textOverflow='ellipsis'
          whiteSpace='nowrap'
          overflow='hidden'
          maxWidth='70%'
          translation={['modals.receive.receiveAsset', { asset: name }]}
        />
        <ModalCloseButton position='static' />
      </ModalHeader>

      {wallet && chainAdapter ? (
        <>
          <ModalBody alignItems='center' justifyContent='center' textAlign='center'>
            <Box>
              <SkeletonText
                noOfLines={2}
                skeletonHeight='16px'
                display='flex'
                flexDir='column'
                alignItems='center'
                isLoaded={!!receiveAddress}
              >
                <Text
                  translation={[
                    'modals.receive.onlySend',
                    { asset: name, symbol: symbol.toUpperCase() }
                  ]}
                  color='gray.500'
                  textAlign='center'
                />
              </SkeletonText>
            </Box>
            <Card
              variant='unstyled'
              borderRadius='xl'
              display='inline-block'
              p={0}
              mx='auto'
              textAlign='center'
              mt={8}
              bg='white'
            >
              <LightMode>
                <Card.Body display='inline-block' textAlign='center' p={6}>
                  <Skeleton isLoaded={!!receiveAddress} mb={2}>
                    <QRCode text={receiveAddress} />
                  </Skeleton>
                  <Skeleton isLoaded={!!receiveAddress}>
                    <Flex
                      color='gray.500'
                      alignItems='center'
                      justifyContent='center'
                      fontSize='sm'
                      onClick={copyHandler}
                      _hover={{ color: 'blue.500' }}
                      _active={{ color: 'blue.800' }}
                      cursor='pointer'
                    >
                      <MiddleEllipsis maxWidth='250px'>{receiveAddress}</MiddleEllipsis>
                    </Flex>
                  </Skeleton>
                </Card.Body>
              </LightMode>
            </Card>
          </ModalBody>
          <ModalFooter flexDir='column'>
            <HStack pb={6} spacing={8}>
              <Button
                onClick={copyHandler}
                padding={2}
                color='gray.500'
                flexDir='column'
                role='group'
                isDisabled={!receiveAddress}
                variant='link'
                _hover={{ textDecoration: 'none', color: hoverColor }}
              >
                <Circle bg={bg} mb={2} size='40px' _groupHover={{ bg: 'blue.500', color: 'white' }}>
                  <CopyIcon />
                </Circle>
                <Text translation='modals.receive.copy' />
              </Button>
              <Button
                color={verified ? 'green.500' : verified === false ? 'red.500' : 'gray.500'}
                flexDir='column'
                role='group'
                variant='link'
                isDisabled={!receiveAddress}
                _hover={{ textDecoration: 'none', color: hoverColor }}
                onClick={handleVerify}
              >
                <Circle bg={bg} mb={2} size='40px' _groupHover={{ bg: 'blue.500', color: 'white' }}>
                  {verified ? <CheckIcon /> : <ViewIcon />}
                </Circle>
                <Text
                  translation={`modals.receive.${
                    verified ? 'verified' : verified === false ? 'notVerified' : 'verify'
                  }`}
                />
              </Button>
            </HStack>
          </ModalFooter>
        </>
      ) : (
        <ModalBody alignItems='center' justifyContent='center'>
          <Text translation='modals.receive.unsupportedAsset' />
        </ModalBody>
      )}
    </>
  )
}
