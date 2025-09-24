import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  LightMode,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  SkeletonText,
  Tag,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import { viemEthMainnetClient } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { TbCheck, TbCopy, TbExternalLink, TbHash, TbZoomCheck } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import type { Address } from 'viem'

import { SupportedNetworks } from './SupportedNetworks'

import { AccountDropdown } from '@/components/AccountDropdown/AccountDropdown'
import { Amount } from '@/components/Amount/Amount'
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
import { generateReceiveQrAddress } from '@/lib/address/generateReceiveQrAddress'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { firstFourLastFour } from '@/lib/utils'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
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
const setAmountIcon = <TbHash />

const AmountModal = ({
  isOpen,
  onClose,
  symbol,
  amountInput,
  onAmountInputChange,
  onConfirm,
  onClear,
  receiveAmount,
}: {
  isOpen: boolean
  onClose: () => void
  symbol: string
  amountInput: string
  onAmountInputChange: () => (e: React.ChangeEvent<HTMLInputElement>) => void
  onConfirm: () => void
  onClear: () => void
  receiveAmount?: string
}) => {
  const translate = useTranslate()

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{translate('modals.receive.setAmount')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel>
              {translate('common.amount')} ({symbol.toUpperCase()})
            </FormLabel>
            <Input
              value={amountInput}
              onChange={onAmountInputChange()}
              placeholder='Enter amount'
              data-test='receive-amount-input'
              type='text'
              inputMode='decimal'
            />
            <Text
              fontSize='sm'
              color='text.subtle'
              mt={2}
              translation='modals.receive.amountNote'
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant='ghost' mr={3} onClick={onClose}>
            {translate('common.cancel')}
          </Button>
          {receiveAmount && (
            <Button variant='ghost' mr={3} onClick={onClear}>
              {translate('common.clear')}
            </Button>
          )}
          <Button colorScheme='blue' onClick={onConfirm}>
            {translate('common.confirm')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export const ReceiveInfo = ({ asset, accountId, onBack }: ReceivePropsType) => {
  const { state } = useWallet()
  const { isConnected } = state
  const [receiveAddress, setReceiveAddress] = useState<string | undefined>()
  const [isAddressLoading, setIsAddressLoading] = useState<boolean>(false)
  const [ensName, setEnsName] = useState<string | null>('')
  const [verified, setVerified] = useState<boolean | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<AccountId | null>(accountId ?? null)
  const [receiveAmount, setReceiveAmount] = useState<string | undefined>()
  const [amountInput, setAmountInput] = useState<string>('')
  const {
    isOpen: isAmountModalOpen,
    onOpen: onAmountModalOpen,
    onClose: onAmountModalClose,
  } = useDisclosure()
  const chainAdapterManager = getChainAdapterManager()
  const navigate = useNavigate()
  const { chainId, name, symbol } = asset
  const { wallet } = state
  const chainAdapter = chainAdapterManager.get(chainId)

  const accountFilter = useMemo(() => ({ accountId: selectedAccountId ?? '' }), [selectedAccountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )
  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, asset.assetId),
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

  const handleSetAmount = useCallback(() => {
    setAmountInput(receiveAmount ?? '')
    onAmountModalOpen()
  }, [receiveAmount, onAmountModalOpen])

  const handleAmountConfirm = useCallback(() => {
    setReceiveAmount(amountInput || undefined)
    onAmountModalClose()
  }, [amountInput, onAmountModalClose])

  const handleAmountInputChange = useCallback(
    () => (e: React.ChangeEvent<HTMLInputElement>) => setAmountInput(e.target.value),
    [],
  )

  const handleAmountClear = useCallback(() => {
    setReceiveAmount(undefined)
    setAmountInput('')
    onAmountModalClose()
  }, [onAmountModalClose])

  const onlySendTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.receive.onlySend', { symbol: symbol.toUpperCase() }],
    [symbol],
  )

  const verifyIcon = useMemo(() => (verified ? <TbCheck /> : <TbZoomCheck />), [verified])

  const amountUserCurrency = useMemo(
    () =>
      bnOrZero(receiveAmount)
        .times(bnOrZero(marketData?.price))
        .toString(),
    [receiveAmount, marketData?.price],
  )

  const receiveAmountRow = useMemo(() => {
    if (!receiveAmount) return null

    return (
      <Flex justifyContent='center' alignItems='center' textAlign='center' mb={4} gap={1}>
        <Amount.Crypto
          value={bnOrZero(receiveAmount).toString()}
          symbol={symbol.toUpperCase()}
          fontSize='md'
          fontWeight='bold'
        />
        {amountUserCurrency && bnOrZero(amountUserCurrency).gt(0) && (
          <Amount.Fiat
            prefix='(≈'
            suffix=')'
            value={amountUserCurrency}
            fontSize='sm'
            color='text.subtle'
            noSpace={true}
          />
        )}
      </Flex>
    )
  }, [receiveAmount, symbol, amountUserCurrency])

  const qrCodeText = useMemo(() => {
    const generatedText = generateReceiveQrAddress({
      receiveAddress: receiveAddress ?? '',
      asset,
      amountCryptoPrecision: receiveAmount,
    })
    console.log('Generated QR code text:', generatedText)
    return generatedText
  }, [receiveAddress, asset, receiveAmount])

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
      {receiveAddress ? (
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
                    <LogoQRCode text={qrCodeText} asset={asset} data-test='receive-qr-code' />
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

            {receiveAmountRow}

            <SupportedNetworks asset={asset} />
          </DialogBody>
          <DialogFooter flexDir='column' py={4}>
            <HStack spacing={8} justify='center'>
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
              <Flex direction='column' align='center' gap={2}>
                <IconButton
                  icon={setAmountIcon}
                  aria-label={translate('modals.receive.setAmount')}
                  onClick={handleSetAmount}
                  isDisabled={!receiveAddress}
                  size='lg'
                  borderRadius='full'
                  color='text.base'
                />
                <Text
                  fontSize='sm'
                  color='text.subtle'
                  fontWeight='medium'
                  translation='modals.receive.setAmount'
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
      ) : (
        <DialogBody alignItems='center' justifyContent='center'>
          <Text translation='modals.receive.unsupportedAsset' />
        </DialogBody>
      )}
      <AmountModal
        isOpen={isAmountModalOpen}
        onClose={onAmountModalClose}
        symbol={symbol}
        amountInput={amountInput}
        onAmountInputChange={handleAmountInputChange}
        onConfirm={handleAmountConfirm}
        onClear={handleAmountClear}
        receiveAmount={receiveAmount}
      />
    </>
  )
}

