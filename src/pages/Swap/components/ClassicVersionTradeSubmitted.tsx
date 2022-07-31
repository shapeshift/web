import '../SimpleSwap.css'

import { Box, Flex, Text as CText } from '@chakra-ui/react'
import { ImArrowRight } from 'react-icons/im'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'

import { OG_COLORS } from '../constants'
import {
  DEFAULT_RECEIVE_AMOUNT,
  DEFAULT_RECEIVE_TX_ID,
  DEFAULT_SELL_AMOUNT,
  DEFAULT_SELL_TX_ID,
  PAGE_HEIGHT_OFFSET_CLASSIC,
} from '../constants'

type ClassicVersionTradeSubmittedProps = {
  currentStep: string
  buyAsset: string
  sellAsset: string
}

export const ClassicVersionTradeSubmitted = ({
  currentStep,
  buyAsset,
  sellAsset,
}: ClassicVersionTradeSubmittedProps) => {
  return (
    <Flex height={`calc(100vh - ${PAGE_HEIGHT_OFFSET_CLASSIC})`} justifyContent='center'>
      <Box
        width='490px'
        height='340px'
        margin='0 1rem'
        mt='25px'
        border='4px solid'
        borderColor={OG_COLORS.lighterBlue}
      >
        <Box height='30px' backgroundColor={OG_COLORS.darkBlue} />
        <Flex height='272px' padding='15px' flexDirection='column' alignItems='center'>
          <Flex mb='12px'>
            <AssetIcon symbol={sellAsset} boxSize='45px' />
            <Box mx='15px'>
              <ImArrowRight color={OG_COLORS.lighterBlue} size={35} />
            </Box>
            <AssetIcon symbol={buyAsset} boxSize='45px' />
          </Flex>
          <Box fontSize='xs' mb={1}>
            <Text as='span' fontWeight='bold' translation='simpleSwap.classic.yourTradeIs' />
            <Text as='span' fontWeight='bold' translation={`simpleSwap.classic.${currentStep}`} />
          </Box>

          <Box ml='-10px'>
            <Flex direction='column' mb='16px'>
              <CText>
                <CText lineHeight='1' as='span' fontSize='8px' fontWeight='bold'>
                  {sellAsset.toUpperCase()}{' '}
                </CText>
                <Text
                  as='span'
                  fontSize='8px'
                  fontWeight='bold'
                  translation='simpleSwap.classic.transaction'
                ></Text>
              </CText>
              <CText lineHeight='1.3' fontWeight='light' fontSize='xs'>
                {DEFAULT_SELL_TX_ID}
              </CText>
              <CText lineHeight='.4'>
                <CText as='span' fontSize='8px' fontWeight='bold'>
                  {DEFAULT_SELL_AMOUNT}{' '}
                </CText>
                <CText as='span' fontSize='8px' fontWeight='bold'>
                  {sellAsset.toUpperCase()}
                </CText>
              </CText>
            </Flex>

            <Flex direction='column' mb={8}>
              <CText>
                <CText lineHeight='1' as='span' fontSize='8px' fontWeight='bold'>
                  {buyAsset.toUpperCase()}{' '}
                </CText>
                <Text
                  as='span'
                  fontSize='8px'
                  fontWeight='bold'
                  translation='simpleSwap.classic.transaction'
                ></Text>
              </CText>
              {currentStep !== 'complete' ? (
                <Text fontSize='xs' translation='simpleSwap.classic.pending' />
              ) : (
                <>
                  <CText lineHeight='1.3' fontWeight='light' fontSize='xs'>
                    {DEFAULT_RECEIVE_TX_ID}
                  </CText>
                  <CText lineHeight='.4'>
                    <CText as='span' fontSize='8px' fontWeight='bold'>
                      {DEFAULT_RECEIVE_AMOUNT}{' '}
                    </CText>
                    <CText as='span' fontSize='8px' fontWeight='bold'>
                      {buyAsset.toUpperCase()}
                    </CText>
                  </CText>
                </>
              )}
            </Flex>
          </Box>

          {currentStep === 'complete' && (
            <Text
              mb={1}
              textAlign='center'
              margin='0 auto'
              width='290px'
              fontSize='7px'
              translation='simpleSwap.classic.quote'
            />
          )}
        </Flex>
        <Box height='30px' backgroundColor={OG_COLORS.darkBlue} />
      </Box>
    </Flex>
  )
}
