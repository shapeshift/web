import { Box, Flex } from '@chakra-ui/layout'
import { Button, Center, Input, Select, Stack, Text as CText } from '@chakra-ui/react'
import { CSSProperties } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'

import { OG_COLORS, ROLES } from '../constants'

const DEFAULT_EXC_RATE = 0.00342
const DEFAULT_RECEIVING_ADDRESS = 'M8DNR...PGPA96'
const DEFAULT_RECEIVE_AMOUNT = 53.51273

type SwapCardClassicProps = {
  exchangeRate: number
  handleClickNext: () => void
  receiveAmount: number
  role: string
  selectedAsset: string
  selectedOtherAsset: string
  setAsset: (asset: string) => void
}

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
}
const optionHiddenStyle: CSSProperties = {
  height: '100%',
  border: `1px dotted ${OG_COLORS.darkGray}`,
  boxSizing: 'border-box',
  display: 'none',
  padding: '8px',
}

export const SwapCardClassic = ({
  role,
  selectedAsset,
  selectedOtherAsset,
  handleClickNext,
  setAsset,
  exchangeRate = DEFAULT_EXC_RATE,
  receiveAmount = DEFAULT_RECEIVE_AMOUNT,
}: SwapCardClassicProps) => {
  const isSellRole = role === ROLES.sell
  const renderTopSectionContent = () => (
    <Text fontSize='xs' fontWeight='bold' translation={`simpleSwap.classic.${role}.title`} />
  )

  const renderMiddleSectionContent = () => {
    const renderAmount = () => {
      if (isSellRole) {
        return (
          <Input
            style={{
              fontSize: '12px',
              color: 'black',
              marginTop: '0',
              padding: '0',
              height: 'auto',
              borderRadius: '0',
              backgroundColor: 'white',
            }}
          />
        )
      }
      return (
        <CText fontSize='xs' fontWeight='medium' style={{ marginTop: '0', textAlign: 'right' }}>
          {receiveAmount}
        </CText>
      )
    }

    return (
      <>
        <Box width='183px'>
          <Box style={{ width: '160px', position: 'relative', padding: '8px' }}>
            <Select
              onChange={e => setAsset(e.target.value)}
              style={{ opacity: '0', width: '100%', padding: '8px' }}
              rootProps={{
                style: { padding: '8px' },
              }}
              placeholder='Select Token'
            >
              <option value='btc'>BTC</option>
              <option value='eth'>ETH</option>
              <option value='ltc'>LTC</option>
            </Select>
            <div style={optionsWrapperStyles}>
              <Flex style={{ ...optionHiddenStyle, ...(selectedAsset === 'btc' && isVisible) }}>
                <AssetIcon mt='2px' symbol='btc' boxSize='30px' />
                <Flex mt='2px' ml='16px' direction='column'>
                  <CText fontSize='2xl' fontWeight='bold' lineHeight='.9'>
                    BTC
                  </CText>
                  <CText fontSize='10px'>Bitcoin</CText>
                </Flex>
              </Flex>
              <Flex style={{ ...optionHiddenStyle, ...(selectedAsset === 'eth' && isVisible) }}>
                <AssetIcon mt='2px' symbol='eth' boxSize='30px' />
                <Flex ml='16px' mt='2px' direction='column'>
                  <CText fontSize='2xl' fontWeight='bold' lineHeight='.9'>
                    ETH
                  </CText>
                  <CText fontSize='10px'>Ethereum</CText>
                </Flex>
              </Flex>
              <Flex style={{ ...optionHiddenStyle, ...(selectedAsset === 'ltc' && isVisible) }}>
                <AssetIcon mt='2px' symbol='ltc' boxSize='30px' />
                <Flex ml='16px' mt='2px' direction='column'>
                  <CText fontSize='2xl' fontWeight='bold' lineHeight='.9'>
                    LTC
                  </CText>
                  <CText fontSize='10px'>Litecoin</CText>
                </Flex>
              </Flex>
            </div>
          </Box>
        </Box>
        <Center width='115px'>
          <Stack>
            <Text
              fontSize='xs'
              mb={isSellRole ? '4px' : '0'}
              translation={`simpleSwap.classic.${role}.inputLabel`}
            />
            {renderAmount()}
          </Stack>
        </Center>
      </>
    )
  }

  const renderBottomSectionContent = () => (
    <>
      <Flex justifyContent='space-between'>
        <Flex direction='column' mt={1}>
          <Text fontSize='10px' translation={`simpleSwap.classic.${role}.footerLabel`} />
          {isSellRole ? (
            <Flex>
              <CText fontSize='xs'>{exchangeRate} </CText>
              &nbsp;
              <CText fontSize='xs'>
                {selectedAsset.toUpperCase()}/{selectedOtherAsset.toUpperCase()}
              </CText>
            </Flex>
          ) : (
            <CText fontSize='xs'>{DEFAULT_RECEIVING_ADDRESS}</CText>
          )}
        </Flex>
        {!isSellRole && (
          <Button
            onClick={handleClickNext}
            fontSize='10px'
            color='white'
            backgroundColor={OG_COLORS.green}
            height='20px'
            borderRadius='0px'
            mr='10px'
            mt='12px'
          >
            Start
          </Button>
        )}
      </Flex>
    </>
  )

  return (
    <Box w='300px' height='206px' border='4px solid' borderColor={OG_COLORS.lighterBlue}>
      <Flex direction='column'>
        <Flex alignItems='center' height='34px' bg='#021735' pl={3}>
          <Flex alignItems='center'>{renderTopSectionContent()}</Flex>
        </Flex>
        <Flex alignItems='center' height='104px' bg='#27394C' p={3}>
          {renderMiddleSectionContent()}
        </Flex>
        <Box height='60px' bg='#021735' pl={3} py={2}>
          {renderBottomSectionContent()}
        </Box>
      </Flex>
    </Box>
  )
}
