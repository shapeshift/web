import { ArrowBackIcon, CheckIcon, CopyIcon, ExternalLinkIcon, ViewIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Circle,
  Flex,
  HStack,
  IconButton,
  LightMode,
  Link,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Skeleton,
  SkeletonText,
  Tag,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { useHistory } from 'react-router-dom'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Card } from 'components/Card/Card'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { QRCode } from 'components/QRCode/QRCode'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { ensReverseLookup } from 'lib/address/ens'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ReceiveRoutes } from './ReceiveCommon'

type ReceivePropsType = {
  asset: Asset
} & RouteComponentProps

export const ReceiveInfo = ({ asset }: ReceivePropsType) => {
  const { state } = useWallet()
  const [receiveAddress, setReceiveAddress] = useState<string>('')
  const [ensReceiveAddress, setEnsReceiveAddress] = useState<string>('')
  const [verified, setVerified] = useState<boolean | null>(null)
  const [accountId, setAccountId] = useState<AccountId | null>(null)
  const chainAdapterManager = getChainAdapterManager()
  const history = useHistory()
  const { chainId, name, symbol } = asset
  const { wallet } = state
  const chainAdapter = chainAdapterManager.get(chainId)

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )
  const accountType = accountMetadata?.accountType
  const bip44Params = accountMetadata?.bip44Params

  useEffect(() => {
    ;(async () => {
      if (!(wallet && chainAdapter)) return
      if (!bip44Params) return
      // if (chainAdapter.isAccountTypeRequired() && !accountType) return
      const { chainNamespace } = fromChainId(asset.chainId)
      if (CHAIN_NAMESPACE.Utxo === chainNamespace && !accountType) return
      const selectedAccountAddress = await chainAdapter.getAddress({
        wallet,
        accountType,
        bip44Params,
      })
      setReceiveAddress(selectedAccountAddress)
      if (asset.chainId === KnownChainIds.EthereumMainnet) {
        const reverseSelectedAccountAddressLookup = await ensReverseLookup(selectedAccountAddress)
        !reverseSelectedAccountAddressLookup.error &&
          setEnsReceiveAddress(reverseSelectedAccountAddressLookup.name)
      }
    })()
  }, [
    setReceiveAddress,
    setEnsReceiveAddress,
    accountType,
    asset,
    wallet,
    chainAdapter,
    bip44Params,
  ])

  const handleVerify = async () => {
    if (!(wallet && chainAdapter && receiveAddress)) return
    const { chainNamespace } = fromChainId(asset.chainId)
    if (CHAIN_NAMESPACE.Utxo === chainNamespace && !accountType) return
    const deviceAddress = await chainAdapter.getAddress({
      wallet,
      showOnDevice: true,
      accountType,
      bip44Params,
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
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label={translate('common.back')}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={() => history.push(ReceiveRoutes.Select)}
      />
      <ModalHeader textAlign='center'>
        {translate('modals.receive.receiveAsset', { asset: name })}
      </ModalHeader>
      <ModalCloseButton />
      {wallet && chainAdapter ? (
        <>
          <ModalBody alignItems='center' justifyContent='center' textAlign='center'>
            <Box>
              <SkeletonText
                noOfLines={2}
                display='flex'
                flexDir='column'
                alignItems='center'
                isLoaded={!!receiveAddress}
              >
                <Text
                  translation={[
                    'modals.receive.onlySend',
                    { asset: name, symbol: symbol.toUpperCase() },
                  ]}
                  color='gray.500'
                  textAlign='center'
                />
              </SkeletonText>
            </Box>
            <Flex justifyContent='center'>
              {ensReceiveAddress && (
                <Tag bg={bg} borderRadius='full' color='gray.500' mt={8} pl={4} pr={4}>
                  {ensReceiveAddress}
                </Tag>
              )}
            </Flex>
            <Card
              variant='unstyled'
              borderRadius='xl'
              display='inline-block'
              p={0}
              mx='auto'
              textAlign='center'
              mt={8}
              bg='white'
              boxShadow='lg'
            >
              <Card.Body display='inline-block' textAlign='center' p={6}>
                <LightMode>
                  <AccountDropdown
                    assetId={asset.assetId}
                    onChange={setAccountId}
                    buttonProps={{ variant: 'solid', width: 'full' }}
                  />
                  <Skeleton isLoaded={!!receiveAddress} mb={2}>
                    <QRCode text={receiveAddress} data-test='receive-qr-code' />
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
                      <MiddleEllipsis value={receiveAddress} data-test='receive-address-label' />
                    </Flex>
                  </Skeleton>
                </LightMode>
              </Card.Body>
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
              {!(wallet.getVendor() === 'Native') ? (
                <Button
                  color={verified ? 'green.500' : verified === false ? 'red.500' : 'gray.500'}
                  flexDir='column'
                  role='group'
                  variant='link'
                  isDisabled={!receiveAddress}
                  _hover={{ textDecoration: 'none', color: hoverColor }}
                  onClick={handleVerify}
                >
                  <Circle
                    bg={bg}
                    mb={2}
                    size='40px'
                    _groupHover={{ bg: 'blue.500', color: 'white' }}
                  >
                    {verified ? <CheckIcon /> : <ViewIcon />}
                  </Circle>
                  <Text
                    translation={`modals.receive.${
                      verified ? 'verified' : verified === false ? 'notVerified' : 'verify'
                    }`}
                  />
                </Button>
              ) : undefined}
              <Button
                as={Link}
                href={`${asset?.explorerAddressLink}${receiveAddress}`}
                isExternal
                padding={2}
                color='gray.500'
                flexDir='column'
                role='group'
                isDisabled={!receiveAddress}
                variant='link'
                _hover={{ textDecoration: 'none', color: hoverColor }}
              >
                <Circle bg={bg} mb={2} size='40px' _groupHover={{ bg: 'blue.500', color: 'white' }}>
                  <ExternalLinkIcon />
                </Circle>
                <Text translation='modals.receive.blockExplorer' />
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
