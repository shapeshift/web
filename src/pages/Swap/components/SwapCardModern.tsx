import { Box, Flex } from '@chakra-ui/layout'
import {
  InputGroup,
  InputRightElement,
  NumberInput,
  NumberInputField,
  Select,
  Text as CText,
} from '@chakra-ui/react'
import { CSSProperties } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'

import { ROLES } from '../constants'
const DEFAULT_WALLET_BALANCE = 1.543265
const DEFAULT_RECEIVE_AMOUNT = 34.48238
const DEFAULT_SELL_AMOUNT = 0.2423
const DEFAULT_EXC_RATE = 0.35823
const DEFAULT_MODERN_RECEIVE_TX_ID = 'f3j35923...'
const DEFAULT_MODERN_SELL_TX_ID = '9834hf34...'

type SwapCardModernProps = {
  currentStep: string
  exchangeRate: number
  receiveAmount: number
  role: string
  selectedAsset: string
  selectedOtherAsset: string
  setAsset: (asset: string) => void
}

export const SwapCardModern = ({
  currentStep,
  role,
  selectedAsset,
  // selectedOtherAsset,
  setAsset,
}: SwapCardModernProps) => {
  const isSellRole = role === ROLES.sell
  const hasSubmittedTrade = currentStep === 'processing' || currentStep === 'complete'
  const isFinalStep = currentStep === 'complete'

  const optionsWrapperStyles: CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: '0',
    left: '0',
    pointerEvents: 'none',
    padding: '8px',
  }
  const isVisible: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }
  const optionStyleHidden: CSSProperties = {
    height: '100%',
    boxSizing: 'border-box',
    display: 'none',
  }

  const renderPostConfirmationStep = () => {
    if (!isSellRole) {
      if (isFinalStep) {
        return (
          <Box whiteSpace='nowrap'>
            <CText fontSize='xs'>{DEFAULT_MODERN_RECEIVE_TX_ID}</CText>
            <CText width='89px' as='span' fontSize='xs' fontWeight='bold'>
              {DEFAULT_RECEIVE_AMOUNT} {selectedAsset.toUpperCase()}
            </CText>
          </Box>
        )
      }

      return (
        <Box>
          <Text fontSize='xs' translation='simpleSwap.modern.pending' />
          <CText width='89px' visibility='hidden' fontSize='xs' fontWeight='bold'>
            {DEFAULT_SELL_AMOUNT} {selectedAsset.toUpperCase()}
          </CText>
        </Box>
      )
    }

    return (
      <Box whiteSpace='nowrap'>
        <CText fontSize='xs'>{DEFAULT_MODERN_SELL_TX_ID}</CText>
        <CText width='89px' fontSize='xs' fontWeight='bold'>
          {DEFAULT_SELL_AMOUNT} {selectedAsset.toUpperCase()}
        </CText>
      </Box>
    )
  }

  const renderSellConfirmStep = () => (
    <>
      <InputGroup mb={1}>
        <NumberInput borderRadius='3px' width='200px' height='30px'>
          <NumberInputField bgColor='#132444' height='30px' />
        </NumberInput>
        <InputRightElement
          height='30px'
          pointerEvents='none'
          children={
            <CText color='gray.300' fontSize='xs' fontWeight='bold'>
              {selectedAsset.toUpperCase()}
            </CText>
          }
        />
      </InputGroup>
      <Flex justifyContent='space-between'>
        <Text fontSize='8px' translation='simpleSwap.modern.sell.walletBalance' />
        <CText fontSize='8px' fontWeight='bold'>
          {DEFAULT_WALLET_BALANCE} {selectedAsset.toUpperCase()}
        </CText>
      </Flex>
    </>
  )

  const renderBuyConfirmStep = () => (
    <>
      <Flex justifyContent='space-between'>
        <Box>
          <Text fontSize='8px' translation='simpleSwap.modern.buy.youGet' />
          <Text fontSize='8px' translation='simpleSwap.modern.buy.exchangeRate' mb={2} />
          <Text fontSize='8px' translation='simpleSwap.modern.buy.deliveredTo' />
        </Box>
        <Box>
          <CText fontSize='8px' fontWeight='bold' textAlign='right'>
            {DEFAULT_RECEIVE_AMOUNT} {selectedAsset.toUpperCase()}
          </CText>
          <CText fontSize='8px' fontWeight='bold' textAlign='right' mb={2}>
            {DEFAULT_EXC_RATE} {selectedAsset.toUpperCase()}
          </CText>
          <CText fontSize='8px' fontWeight='bold' textAlign='right'>
            {DEFAULT_MODERN_RECEIVE_TX_ID} {selectedAsset.toUpperCase()}
          </CText>
        </Box>
      </Flex>
    </>
  )

  const renderConfirmStep = () => {
    if (isSellRole) {
      return renderSellConfirmStep()
    }

    return renderBuyConfirmStep()
  }

  return (
    <Flex
      width='155px'
      height='200px'
      marginTop={5}
      flexDirection='column'
      alignItems={isSellRole ? 'flex-end' : 'flex-start'}
      visibility={hasSubmittedTrade ? 'hidden' : 'visible'}
      justifyContent='center'
    >
      <Flex width='100%' mb={4}>
        <Box
          width='100%'
          position='relative'
          padding={2}
          marginBottom={currentStep === 'initial' ? '42px' : '0px'}
        >
          <Select
            onChange={e => setAsset(e.target.value)}
            className='hide'
            iconSize={currentStep === 'initial' ? '22px' : '0'}
            opacity='0'
            width='100%'
            padding={2}
            bg='tomato'
            borderColor='tomato'
            color='white'
            rootProps={{
              style: { padding: '8px', marginLeft: '40px', marginTop: '3px' },
            }}
            placeholder='Select Token'
          >
            <option value='btc'>BTC</option>
            <option value='eth'>ETH</option>
            <option value='ltc'>LTC</option>
          </Select>
          <div style={optionsWrapperStyles}>
            <Flex style={{ ...optionStyleHidden, ...(selectedAsset === 'btc' && isVisible) }}>
              <Text mr='10px' fontSize='xl' translation={`simpleSwap.modern.${role}.title`} />
              <AssetIcon visibility='visible' mt='2px' symbol='btc' boxSize='55px' />
              <Flex ml={2} mt='2px' direction='column'>
                <CText fontSize='2xl' fontWeight='bold' lineHeight='.9'>
                  BTC
                </CText>
              </Flex>
            </Flex>
            <Flex style={{ ...optionStyleHidden, ...(selectedAsset === 'eth' && isVisible) }}>
              <Text mr='10px' fontSize='xl' translation={`simpleSwap.modern.${role}.title`} />
              <AssetIcon visibility='visible' mt='2px' symbol='eth' boxSize='55px' />
              <Flex ml={2} mt='2px' direction='column'>
                <CText fontSize='2xl' fontWeight='bold' lineHeight='.9'>
                  ETH
                </CText>
              </Flex>
            </Flex>
            <Flex style={{ ...optionStyleHidden, ...(selectedAsset === 'ltc' && isVisible) }}>
              <Text mr='10px' fontSize='xl' translation={`simpleSwap.modern.${role}.title`} />
              <AssetIcon visibility='visible' mt='2px' symbol='ltc' boxSize='55px' />
              <Flex ml={2} mt='2px' direction='column'>
                <CText fontSize='2xl' fontWeight='bold' lineHeight='.9'>
                  LTC
                </CText>
              </Flex>
            </Flex>
          </div>
        </Box>
      </Flex>
      <Box width={hasSubmittedTrade ? '70px' : '100%'} margin='0 auto' visibility='visible'>
        {currentStep === 'confirm' && renderConfirmStep()}
        {hasSubmittedTrade && renderPostConfirmationStep()}
      </Box>
    </Flex>
  )
}
