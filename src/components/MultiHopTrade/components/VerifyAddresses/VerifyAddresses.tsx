import {
  Box,
  Button,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Text as CText,
} from '@chakra-ui/react'
import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { checkApprovalNeeded } from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import { getReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectBuyAsset,
  selectPortfolioAccountMetadataByAccountId,
  selectSellAsset,
} from 'state/slices/selectors'
import { selectFirstHop } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

export const VerifyAddresses = () => {
  const wallet = useWallet().state.wallet
  const history = useHistory()

  const [sellAddress, setSellAddress] = useState<string | undefined>()
  const [buyAddress, setBuyAddress] = useState<string | undefined>()
  const [isSellVerifying, setIsSellVerifying] = useState(false)
  const [isBuyVerifying, setIsBuyVerifying] = useState(false)

  const [sellVerified, setSellVerified] = useState(false)
  const [buyVerified, setBuyVerified] = useState(false)

  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)
  const tradeQuoteStep = useAppSelector(selectFirstHop)

  const { sellAssetAccountId, buyAssetAccountId } = useAccountIds()

  const sellAccountFilter = useMemo(
    () => ({ accountId: sellAssetAccountId ?? '' }),
    [sellAssetAccountId],
  )
  const sellAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, sellAccountFilter),
  )
  const buyAccountFilter = useMemo(
    () => ({ accountId: buyAssetAccountId ?? '' }),
    [buyAssetAccountId],
  )
  const buyAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, buyAccountFilter),
  )

  const handleContinue = useCallback(async () => {
    if (!tradeQuoteStep) throw Error('missing tradeQuoteStep')
    if (!wallet) throw Error('missing wallet')

    const isApprovalNeeded = await checkApprovalNeeded(tradeQuoteStep, wallet)
    if (isApprovalNeeded) {
      history.push({ pathname: TradeRoutePaths.Approval })
      return
    }

    history.push({ pathname: TradeRoutePaths.Confirm })
  }, [history, tradeQuoteStep, wallet])

  const fetchAddresses = useCallback(async () => {
    if (
      !wallet ||
      !sellAssetAccountId ||
      !buyAssetAccountId ||
      !sellAccountMetadata ||
      !buyAccountMetadata
    )
      return

    const deviceId = await wallet.getDeviceID()

    const fetchedSellAddress = await getReceiveAddress({
      asset: sellAsset,
      wallet,
      deviceId,
      accountMetadata: sellAccountMetadata,
      pubKey: fromAccountId(sellAssetAccountId).account,
    })
    const fetchedBuyAddress = await getReceiveAddress({
      asset: buyAsset,
      wallet,
      deviceId,
      accountMetadata: buyAccountMetadata,
      pubKey: fromAccountId(buyAssetAccountId).account,
    })

    setSellAddress(fetchedSellAddress)
    setBuyAddress(fetchedBuyAddress)
  }, [
    wallet,
    sellAssetAccountId,
    buyAssetAccountId,
    sellAccountMetadata,
    buyAccountMetadata,
    sellAsset,
    buyAsset,
  ])

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  const handleVerify = useCallback(
    async (type: 'sell' | 'buy') => {
      if (type === 'sell') {
        setIsSellVerifying(true)
      } else if (type === 'buy') {
        setIsBuyVerifying(true)
      }

      try {
        const asset = type === 'sell' ? sellAsset : buyAsset
        const accountMetadata = type === 'sell' ? sellAccountMetadata : buyAccountMetadata
        const _address = type === 'sell' ? sellAddress : buyAddress

        if (!asset || !accountMetadata || !_address || !wallet) return

        const { chainId } = asset
        const adapter = getChainAdapterManager().get(chainId)

        if (!adapter) return

        const { bip44Params } = accountMetadata

        const { chainNamespace } = fromChainId(asset.chainId)
        if (CHAIN_NAMESPACE.Utxo === chainNamespace && !accountMetadata.accountType) return

        const deviceAddress = await adapter.getAddress({
          wallet,
          showOnDevice: true,
          accountType: accountMetadata.accountType,
          accountNumber: bip44Params.accountNumber,
        })

        if (deviceAddress && deviceAddress.toLowerCase() === _address.toLowerCase()) {
          if (type === 'sell') {
            setSellVerified(true)
          } else if (type === 'buy') {
            setBuyVerified(true)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (type === 'sell') {
          setIsSellVerifying(false)
        } else if (type === 'buy') {
          setIsBuyVerifying(false)
        }
      }
    },
    [sellAsset, buyAsset, sellAccountMetadata, buyAccountMetadata, sellAddress, buyAddress, wallet],
  )

  return (
    <SlideTransition>
      <Box>
        <CardHeader>
          <CText fontSize='xl' fontWeight='bold' mb={4}>
            Verify Addresses
          </CText>
        </CardHeader>
        <CardBody>
          <Row my={3}>
            <Row.Label fontWeight='medium'>
              <CText>Sell Address:</CText>
            </Row.Label>
            <Row.Value flex={1} mr={4} fontWeight='light' wordBreak='break-all'>
              {sellAddress || 'Fetching...'}
            </Row.Value>
            <Button
              colorScheme={sellVerified ? 'green' : 'blue'}
              onClick={() => handleVerify('sell')}
              isDisabled={sellVerified}
              isLoading={isSellVerifying}
            >
              {sellVerified ? 'Verified' : 'Verify'}
            </Button>
          </Row>

          <Row my={3}>
            <Row.Label fontWeight='medium'>
              <CText>Buy Address:</CText>
            </Row.Label>
            <Row.Value flex={1} mr={4} fontWeight='light' wordBreak='break-all'>
              {buyAddress || 'Fetching...'}
            </Row.Value>
            <Button
              colorScheme={buyVerified ? 'green' : 'blue'}
              onClick={() => handleVerify('buy')}
              isDisabled={buyVerified}
              isLoading={isBuyVerifying}
            >
              {buyVerified ? 'Verified' : 'Verify'}
            </Button>
          </Row>
        </CardBody>
        <CardFooter mt={4}>
          <Flex direction='column' alignItems='center' justifyContent='space-between' width='full'>
            <CText color='red.500' textAlign='center' mb={4}>
              Ensure your addresses are correct before proceeding.
            </CText>

            <Button
              onClick={handleContinue}
              size='lg'
              isDisabled={!(sellVerified && buyVerified)}
              width='full'
            >
              <Text translation='common.continue' />
            </Button>
          </Flex>
        </CardFooter>
      </Box>
    </SlideTransition>
  )
}
