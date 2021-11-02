import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Center, Flex, Link, Stack, Tag, useColorModeValue } from '@chakra-ui/react'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'
import { useSteps } from 'chakra-ui-steps'
import { useEffect, useState } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { VerticalStepper } from 'components/VerticalStepper/VerticalStepper'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { Approve } from 'context/EarnManagerProvider/components/Approve/Approve'
import { BroadcastTx } from 'context/EarnManagerProvider/components/BroadcastTx/BroadcastTx'
import { Confirm } from 'context/EarnManagerProvider/components/Confirm/Confirm'
import { Deposit, DepositValues } from 'context/EarnManagerProvider/components/Deposit/Deposit'
import { EarnActionsButtons } from 'context/EarnManagerProvider/context/EarnActions/EarnActionsProvider'
import { EarnQueryParams } from 'context/EarnManagerProvider/EarnManagerProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { useMarketData } from 'hooks/useMarketData/useMarketData'
import { useQuery } from 'hooks/useQuery/useQuery'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { YearnVaultApi } from '../../api/api'

const steps = [
  { hideNav: true, label: 'Deposit Amount' },
  { label: 'Approve USDC' },
  { label: 'Confirm Deposit' },
  { label: 'Broadcast' }
]

export const YearnDeposit = ({ api }: { api: YearnVaultApi }) => {
  const [apy, setApy] = useState('0')
  const [userAddress, setUserAddress] = useState<string | null>(null)
  const [, /* values */ setValues] = useState<DepositValues>({} as DepositValues)
  const { chain, contractAddress: vaultAddress, tokenId } = useQuery<EarnQueryParams>()

  // Asset info
  const asset = useFetchAsset({ chain, tokenId })
  const marketData = useMarketData({ chain, tokenId })

  // user info
  const chainAdapterManager = useChainAdapters()
  const { state: walletState } = useWallet()
  const { balances, loading } = useFlattenedBalances()

  // navigation
  const history = useHistory()
  const { activeStep, nextStep, setStep } = useSteps({ initialStep: 0 })

  // styles
  const stepperBg = useColorModeValue('gray.50', 'gray.850')
  const stepperBorder = useColorModeValue('gray.100', 'gray.750')

  useEffect(() => {
    ;(async () => {
      if (!walletState.wallet) return
      const chainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
      setUserAddress(await chainAdapter.getAddress({ wallet: walletState.wallet }))
    })()
  }, [chain, chainAdapterManager, walletState])

  useEffect(() => {
    ;(async () => {
      try {
        const apy = await api.apy({ vaultAddress })
        setApy(apy)
      } catch (error) {
        // TODO: handle client side errors
        console.error('error', error)
      }
    })()
  }, [api, vaultAddress])

  const handleContinue = async (formValues: DepositValues) => {
    setValues(formValues)
    if (!userAddress) return
    const _allowance = await api.allowance({
      tokenContractAddress: tokenId!,
      spenderAddress: vaultAddress,
      userAddress
    })
    const allowance = bnOrZero(_allowance).div(`1e+${asset.precision}`)
    allowance.gt(formValues.cryptoAmount) ? setStep(2) : nextStep()
  }

  const handleApprove = async () => {
    nextStep()
  }

  const handleConfirm = async () => {
    nextStep()
  }

  const handleViewPosition = () => {}

  const handleCancel = () => {
    history.goBack()
  }

  const balance = balances[tokenId ?? chain]?.balance

  const validateCryptoAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const hasValidBalance = crypto.gte(value)
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const crypto = bnOrZero(balance).div(`1e+${asset.precision}`)
    const fiat = crypto.times(marketData.price)
    const hasValidBalance = fiat.gte(value)
    return hasValidBalance || 'common.insufficientFunds'
  }

  const renderStep = (_step: number) => {
    switch (_step) {
      case 0:
        return (
          <Deposit
            asset={asset}
            apy={apy}
            cryptoAmountAvailable={cryptoAmountAvailable.toPrecision()}
            cryptoInputValidation={{
              required: true,
              validate: { validateCryptoAmount }
            }}
            fiatAmountAvailable={fiatAmountAvailable.toFixed(2)}
            fiatInputValidation={{
              required: true,
              validate: { validateFiatAmount }
            }}
            marketData={marketData}
            onCancel={handleCancel}
            onContinue={handleContinue}
            percentOptions={[0.25, 0.5, 0.75, 1]}
          />
        )
      case 1:
        return (
          <Approve
            asset={asset}
            cryptoEstimatedGasFee=''
            disableAction
            fiatEstimatedGasFee=''
            loading={false}
            loadingText='Approve on Wallet'
            onCancel={handleCancel}
            onConfirm={handleApprove}
            wallet={{} as HDWallet}
          />
        )
      case 2:
        return (
          <Confirm
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            prefooter={<Text color='gray.500' translation='modals.confirm.preFooter' />}
            assets={[
              {
                ...asset,
                color: '#FF0000',
                cryptoAmount: '100',
                fiatAmount: '100'
              },
              {
                ...asset,
                color: '#FFFFFF',
                cryptoAmount: '100',
                fiatAmount: '100'
              }
            ]}
          >
            <Stack spacing={6}>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.depositTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>Year Finance</Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedGas' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value='30.00' />
                    <Amount.Crypto color='gray.500' value='0.024' symbol='ETH' />
                  </Box>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.averageApr' />
                </Row.Label>
                <Row.Value>
                  <Tag colorScheme='green'>4%</Tag>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedReturns' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value='529.04' />
                    <Amount.Crypto color='gray.500' value='529.04' symbol='USDC' />
                  </Box>
                </Row.Value>
              </Row>
            </Stack>
          </Confirm>
        )
      case 3:
        return (
          <BroadcastTx
            onClose={handleCancel}
            onContinue={handleViewPosition}
            loading={true}
            statusText='modals.broadcast.header.pending'
            statusIcon={<ArrowForwardIcon />}
            assets={[
              {
                ...asset,
                cryptoAmount: '100',
                fiatAmount: '100'
              },
              {
                ...asset,
                cryptoAmount: '100',
                fiatAmount: '100'
              }
            ]}
          >
            <Stack spacing={6}>
              <Row>
                <Row.Label>
                  <Text translation='modals.broadcast.transactionId' />
                </Row.Label>
                <Row.Value>
                  <Link href='http://google.com' isExternal color='blue.500' fontWeight='bold'>
                    <MiddleEllipsis maxWidth='200px'>
                      0x73060cb15ae5b6a5edc71c3b8b49dd20746240990d0a1047481b4218c690ad1c
                    </MiddleEllipsis>
                  </Link>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.depositTo' />
                </Row.Label>
                <Row.Value fontWeight='bold'>Year Finance</Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedGas' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value='30.00' />
                    <Amount.Crypto color='gray.500' value='0.024' symbol='ETH' />
                  </Box>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.averageApr' />
                </Row.Label>
                <Row.Value>
                  <Tag colorScheme='green'>4%</Tag>
                </Row.Value>
              </Row>
              <Row>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedReturns' />
                </Row.Label>
                <Row.Value>
                  <Box textAlign='right'>
                    <Amount.Fiat fontWeight='bold' value='529.04' />
                    <Amount.Crypto color='gray.500' value='529.04' symbol='USDC' />
                  </Box>
                </Row.Value>
              </Row>
            </Stack>
          </BroadcastTx>
        )
      default:
        throw new Error('Step does not exist')
    }
  }

  if (loading || !asset || !marketData)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

  const cryptoAmountAvailable = bnOrZero(balance).div(`1e${asset.precision}`)
  const fiatAmountAvailable = bnOrZero(cryptoAmountAvailable).times(marketData.price)

  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', xl: '500px' }}
      flexDir={{ base: 'column', lg: 'row' }}
    >
      {!steps[activeStep].hideNav && (
        <Box
          bg={stepperBg}
          px={4}
          py={6}
          flex={1}
          borderRightWidth={{ base: 0, lg: 1 }}
          borderBottomWidth={{ base: 1, lg: 0 }}
          borderColor={stepperBorder}
          borderTopLeftRadius='xl'
          borderTopRightRadius={{ base: 'xl', lg: 'none' }}
          borderBottomLeftRadius={{ base: 'none', lg: 'xl' }}
          minWidth='250px'
        >
          <VerticalStepper activeStep={activeStep} steps={steps} />
        </Box>
      )}
      <Flex flexDir='column' width='full' minWidth='400px'>
        {activeStep === 0 && <EarnActionsButtons />}
        {renderStep(activeStep)}
      </Flex>
    </Flex>
  )
}
