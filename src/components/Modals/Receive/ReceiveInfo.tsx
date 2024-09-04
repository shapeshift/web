import { CheckIcon, CopyIcon, ExternalLinkIcon, ViewIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Card,
  CardBody,
  Circle,
  Flex,
  HStack,
  LightMode,
  Link,
  Skeleton,
  SkeletonText,
  Tag,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import { viemEthMainnetClient } from '@shapeshiftoss/contracts'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import type { Address } from 'viem'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { DialogBackButton } from 'components/Modal/components/DialogBackButton'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import { DialogHeader } from 'components/Modal/components/DialogHeader'
import { DialogTitle } from 'components/Modal/components/DialogTitle'
import { getReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { QRCode } from 'components/QRCode/QRCode'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ReceiveRoutes } from './ReceiveCommon'

type ReceivePropsType = {
  asset: Asset
  accountId?: AccountId
}

const accountDropdownButtonProps = { variant: 'solid', width: 'full', mt: 4 }
const receiveAddressHover = { color: 'blue.500' }
const receiveAddressActive = { color: 'blue.800' }
const circleGroupHover = { bg: 'background.button.secondary.hover', color: 'white' }

export const ReceiveInfo = ({ asset, accountId }: ReceivePropsType) => {
  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: false })
  const { state } = useWallet()
  const [receiveAddress, setReceiveAddress] = useState<string | undefined>()
  const [ensName, setEnsName] = useState<string | null>('')
  const [verified, setVerified] = useState<boolean | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<AccountId | null>(accountId ?? null)
  const chainAdapterManager = getChainAdapterManager()
  const history = useHistory()
  const { chainId, name, symbol } = asset
  const { wallet } = state
  const chainAdapter = chainAdapterManager.get(chainId)

  const accountFilter = useMemo(() => ({ accountId: selectedAccountId ?? '' }), [selectedAccountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )
  const accountType = accountMetadata?.accountType
  const bip44Params = accountMetadata?.bip44Params
  useEffect(() => {
    ;(async () => {
      if (!accountMetadata) return
      if (!wallet) return
      const selectedAccountAddress = await getReceiveAddress({
        asset,
        wallet,
        deviceId: await wallet.getDeviceID(),
        accountMetadata,
        pubKey:
          isLedger(wallet) && selectedAccountId
            ? fromAccountId(selectedAccountId as AccountId).account
            : undefined,
      })
      setReceiveAddress(selectedAccountAddress)
    })()
  }, [
    setReceiveAddress,
    setEnsName,
    accountType,
    asset,
    wallet,
    chainAdapter,
    bip44Params,
    accountMetadata,
    selectedAccountId,
  ])

  useEffect(() => {
    if (asset.chainId !== KnownChainIds.EthereumMainnet || !receiveAddress) return
    viemEthMainnetClient.getEnsName({ address: receiveAddress as Address }).then(setEnsName)
  }, [asset.chainId, receiveAddress])

  const handleVerify = useCallback(async () => {
    if (!(wallet && chainAdapter && receiveAddress && bip44Params)) return
    const { chainNamespace } = fromChainId(asset.chainId)
    if (CHAIN_NAMESPACE.Utxo === chainNamespace && !accountType) return
    const { accountNumber } = bip44Params
    const deviceAddress = await chainAdapter.getAddress({
      wallet,
      showOnDevice: true,
      accountType,
      accountNumber,
      checkLedgerAppOpenIfLedgerConnected,
    })

    setVerified(
      Boolean(deviceAddress) && deviceAddress.toLowerCase() === receiveAddress.toLowerCase(),
    )
  }, [
    accountType,
    asset.chainId,
    bip44Params,
    chainAdapter,
    checkLedgerAppOpenIfLedgerConnected,
    receiveAddress,
    wallet,
  ])

  const translate = useTranslate()
  const toast = useToast()

  const hoverColor = useColorModeValue('gray.900', 'white')
  const bg = useColorModeValue('gray.100', 'gray.700')

  const handleCopyClick = useCallback(async () => {
    if (!receiveAddress) return
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
  }, [receiveAddress, symbol, toast, translate])

  const onBackClick = useCallback(() => history.push(ReceiveRoutes.Select), [history])
  const onlySendTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.receive.onlySend', { asset: name, symbol: symbol.toUpperCase() }],
    [name, symbol],
  )
  const buttonHover = useMemo(() => ({ textDecoration: 'none', color: hoverColor }), [hoverColor])

  return (
    <>
      <DialogHeader>
        <DialogHeader.Left>
          <DialogBackButton onClick={onBackClick} />
        </DialogHeader.Left>
        <DialogHeader.Middle>
          <DialogTitle>{translate('modals.receive.receiveAsset', { asset: name })}</DialogTitle>
        </DialogHeader.Middle>
      </DialogHeader>
      {wallet && chainAdapter ? (
        <>
          <DialogBody alignItems='center' justifyContent='center' textAlign='center'>
            <Box>
              <SkeletonText
                noOfLines={3}
                display='flex'
                flexDir='column'
                alignItems='center'
                skeletonHeight='16px'
                spacing='2'
                isLoaded={!!receiveAddress}
              >
                <Text translation={onlySendTranslation} color='text.subtle' textAlign='center' />
              </SkeletonText>
            </Box>
            <AccountDropdown
              assetId={asset.assetId}
              defaultAccountId={selectedAccountId || undefined}
              onChange={setSelectedAccountId}
              buttonProps={accountDropdownButtonProps}
            />
            <Flex justifyContent='center'>
              {ensName && (
                <Tag bg={bg} borderRadius='full' color='text.subtle' mt={8} pl={4} pr={4}>
                  {ensName}
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
              <CardBody display='inline-block' textAlign='center' p={6}>
                <LightMode>
                  <Skeleton isLoaded={!!receiveAddress} mb={2}>
                    <QRCode text={receiveAddress} data-test='receive-qr-code' />
                  </Skeleton>
                  <Skeleton isLoaded={!!receiveAddress}>
                    <Flex
                      color='text.subtle'
                      alignItems='center'
                      justifyContent='center'
                      fontSize='sm'
                      onClick={handleCopyClick}
                      _hover={receiveAddressHover}
                      _active={receiveAddressActive}
                      cursor='pointer'
                    >
                      <MiddleEllipsis
                        value={receiveAddress ?? ''}
                        data-test='receive-address-label'
                      />
                    </Flex>
                  </Skeleton>
                </LightMode>
              </CardBody>
            </Card>
          </DialogBody>
          <DialogFooter flexDir='column' mt='auto'>
            <HStack pb={6} spacing={8}>
              <Button
                onClick={handleCopyClick}
                padding={2}
                color='text.subtle'
                flexDir='column'
                role='group'
                isDisabled={!receiveAddress}
                variant='link'
                _hover={buttonHover}
              >
                <Circle
                  bg='background.button.secondary.base'
                  mb={2}
                  size='40px'
                  _groupHover={circleGroupHover}
                >
                  <CopyIcon />
                </Circle>
                <Text translation='modals.receive.copy' />
              </Button>
              {!(wallet.getVendor() === 'Native') ? (
                <Button
                  color={verified ? 'green.500' : verified === false ? 'red.500' : 'text.subtle'}
                  flexDir='column'
                  role='group'
                  variant='link'
                  isDisabled={!receiveAddress}
                  _hover={buttonHover}
                  onClick={handleVerify}
                >
                  <Circle
                    bg='background.button.secondary.base'
                    mb={2}
                    size='40px'
                    _groupHover={circleGroupHover}
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
                color='text.subtle'
                flexDir='column'
                role='group'
                isDisabled={!receiveAddress}
                variant='link'
                _hover={buttonHover}
              >
                <Circle
                  bg='background.button.secondary.base'
                  mb={2}
                  size='40px'
                  _groupHover={circleGroupHover}
                >
                  <ExternalLinkIcon />
                </Circle>
                <Text translation='modals.receive.blockExplorer' />
              </Button>
            </HStack>
          </DialogFooter>
        </>
      ) : (
        <DialogBody alignItems='center' justifyContent='center'>
          <Text translation='modals.receive.unsupportedAsset' />
        </DialogBody>
      )}
    </>
  )
}
