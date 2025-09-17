import {
  Box,
  Card,
  CardBody,
  Flex,
  HStack,
  IconButton,
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
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbCheck, TbCopy, TbExternalLink, TbZoomCheck } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import type { Address } from 'viem'

import { SupportedNetworks } from './SupportedNetworks'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { LogoQRCode } from '@/components/LogoQRCode/LogoQRCode'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderRight } from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { getReceiveAddress } from '@/components/MultiHopTrade/hooks/useReceiveAddress'
import { Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { firstFourLastFour } from '@/lib/utils'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { selectPortfolioAccountMetadataByAccountId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ReceivePropsType = {
  asset: Asset
  accountId?: AccountId
  onBack?: () => void
}

const accountDropdownButtonProps = { variant: 'ghost', mt: 4 }
const receiveAddressHover = { color: 'blue.500' }
const receiveAddressActive = { color: 'blue.800' }

const copyIcon = <TbCopy />
const externalLinkIcon = <TbExternalLink />

export const ReceiveInfo = ({ asset, accountId, onBack }: ReceivePropsType) => {
  const { state } = useWallet()
  const { isConnected } = state
  const [receiveAddress, setReceiveAddress] = useState<string | undefined>()
  const [isAddressLoading, setIsAddressLoading] = useState<boolean>(false)
  const [ensName, setEnsName] = useState<string | null>('')
  const [verified, setVerified] = useState<boolean | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<AccountId | null>(accountId ?? null)
  const chainAdapterManager = getChainAdapterManager()
  const navigate = useNavigate()
  const { chainId, name, symbol } = asset
  const { wallet } = state
  const chainAdapter = chainAdapterManager.get(chainId)

  const accountFilter = useMemo(() => ({ accountId: selectedAccountId ?? '' }), [selectedAccountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )
  const accountType = accountMetadata?.accountType
  const bip44Params = accountMetadata?.bip44Params
  const walletType = useAppSelector(selectWalletType)

  useEffect(() => {
    ;(async () => {
      if (!accountMetadata) return
      setIsAddressLoading(true)
      const selectedAccountAddress = await getReceiveAddress({
        asset,
        wallet,
        // @ts-expect-error - TODO(gomes): fixme, do we have this without a `wallet` instance defined?
        deviceId: await wallet?.getDeviceID(),
        accountMetadata,
        pubKey:
          walletType === KeyManager.Ledger && selectedAccountId
            ? fromAccountId(selectedAccountId as AccountId).account
            : undefined,
      })
      setReceiveAddress(selectedAccountAddress)
      setIsAddressLoading(false)
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
    navigate,
    walletType,
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
    })

    setVerified(
      Boolean(deviceAddress) && deviceAddress.toLowerCase() === receiveAddress.toLowerCase(),
    )
  }, [accountType, asset.chainId, bip44Params, chainAdapter, receiveAddress, wallet])

  const translate = useTranslate()
  const toast = useToast()

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
      const description = firstFourLastFour(receiveAddress)
      toast({ description, title, status, ...toastPayload })
    } catch (e) {
      const title = translate('modals.receive.copyFailed', translatePayload)
      const status = 'error'
      const description = translate('modals.receive.copyFailedDescription')
      toast({ description, title, status })
    }
  }, [receiveAddress, symbol, toast, translate])

  const onlySendTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.receive.onlySend', { symbol: symbol.toUpperCase() }],
    [symbol],
  )

  const verifyIcon = useMemo(() => (verified ? <TbCheck /> : <TbZoomCheck />), [verified])

  return (
    <>
      <DialogHeader>
        {onBack && (
          <DialogHeader.Left>
            <DialogBackButton onClick={onBack} />
          </DialogHeader.Left>
        )}
        <DialogHeader.Middle>
          <DialogTitle>{translate('modals.receive.receiveAsset', { asset: name })}</DialogTitle>
        </DialogHeader.Middle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <>
        <DialogBody alignItems='center' justifyContent='center' textAlign='center' py={4}>
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
            showLabel={false}
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
            mb={4}
            display='inline-block'
            p={0}
            mx='auto'
            textAlign='center'
            bg='white'
            boxShadow='lg'
          >
            <CardBody display='inline-block' textAlign='center' p={6}>
              <LightMode>
                <Skeleton isLoaded={!!receiveAddress && !isAddressLoading} mb={2}>
                  <LogoQRCode text={receiveAddress} asset={asset} data-test='receive-qr-code' />
                </Skeleton>
                <Skeleton isLoaded={!!receiveAddress && !isAddressLoading}>
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
          <SupportedNetworks asset={asset} />
        </DialogBody>
        <DialogFooter flexDir='column' py={4}>
          <HStack spacing={20}>
            <Flex direction='column' align='center' gap={2}>
              <IconButton
                icon={copyIcon}
                aria-label={translate('modals.receive.copy')}
                onClick={handleCopyClick}
                isDisabled={!receiveAddress}
                size='lg'
                borderRadius='full'
                color='text.base'
              />
              <Text
                fontSize='sm'
                color='text.subtle'
                fontWeight='medium'
                translation='modals.receive.copy'
              />
            </Flex>
            {!(wallet?.getVendor() === 'Native') && (
              <Flex direction='column' align='center' gap={2}>
                <IconButton
                  icon={verifyIcon}
                  aria-label={translate(
                    `modals.receive.${
                      verified ? 'verified' : verified === false ? 'notVerified' : 'verify'
                    }`,
                  )}
                  onClick={handleVerify}
                  isDisabled={!receiveAddress || !isConnected}
                  size='lg'
                  borderRadius='full'
                  color={verified ? 'green.500' : verified === false ? 'red.500' : 'text.base'}
                />
                <Text
                  fontSize='sm'
                  color='text.subtle'
                  fontWeight='medium'
                  translation={`modals.receive.${
                    verified ? 'verified' : verified === false ? 'notVerified' : 'verify'
                  }`}
                />
              </Flex>
            )}
            <Flex direction='column' align='center' gap={2}>
              <IconButton
                as={Link}
                icon={externalLinkIcon}
                aria-label={translate('modals.receive.blockExplorer')}
                href={
                  asset?.explorerAddressLink && receiveAddress
                    ? `${asset.explorerAddressLink}${receiveAddress}`
                    : undefined
                }
                isExternal
                isDisabled={!receiveAddress || !asset?.explorerAddressLink}
                size='lg'
                borderRadius='full'
                color='text.base'
              />
              <Text
                fontSize='sm'
                color='text.subtle'
                fontWeight='medium'
                translation='modals.receive.blockExplorer'
              />
            </Flex>
          </HStack>
        </DialogFooter>
      </>
    </>
  )
}
