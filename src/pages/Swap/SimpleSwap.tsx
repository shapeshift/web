import './SimpleSwap.css'

import { Box, Flex, Grid, GridItem } from '@chakra-ui/layout'
import { Switch, useMediaQuery } from '@chakra-ui/react'
import { useState } from 'react'
import { Page } from 'components/Layout/Page'
import { breakpoints } from 'theme/theme'

import { CenterColumn } from './components/CenterColumn'
import { CenterRow } from './components/CenterRow'
import { ClassicVersionTradeSubmitted } from './components/ClassicVersionTradeSubmitted'
import { MobileFooter } from './components/MobileFooter'
import { OGHeader } from './components/OGHeader'
import { SwapCardSwitch } from './components/SwapCardSwitch'
import {
  BODY_PADDING_TOP,
  DEFAULT_BUY_ASSET,
  DEFAULT_SELL_ASSET,
  OG_COLORS,
  PAGE_HEIGHT_OFFSET_CLASSIC,
  PAGE_HEIGHT_OFFSET_MOBILE,
  PAGE_HEIGHT_OFFSET_MODERN,
  PAGE_MARGIN_TOP_MODERN,
  TRADE_STEPS_CLASSIC,
  TRADE_STEPS_MODERN,
} from './constants'

export const SimpleSwap = () => {
  const [shouldShowClassicVersion, setShouldShowClassicVerion] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [sellAsset, setSellAsset] = useState(DEFAULT_SELL_ASSET)
  const [buyAsset, setBuyAsset] = useState(DEFAULT_BUY_ASSET)

  const stepsList = shouldShowClassicVersion ? TRADE_STEPS_CLASSIC : TRADE_STEPS_MODERN
  const currentStep = stepsList[currentStepIndex]
  const bgColor = shouldShowClassicVersion ? OG_COLORS.lightBlue : OG_COLORS.darkBlue
  const hasSubmittedTrade = currentStep === 'processing' || currentStep === 'complete'
  const isInitialStep = currentStep === 'initial'
  const isFinalStep = currentStep === 'complete'
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)

  const handleClickNext = () => {
    // TODO: This logic will be updated once we integrate with THORchain. For now it just uses
    // timers to demo the progression through the flow
    if (shouldShowClassicVersion) {
      setCurrentStepIndex(1)

      setTimeout(() => {
        setCurrentStepIndex(2)
      }, 3000)

      return
    }

    if (isInitialStep) {
      setCurrentStepIndex(currentStepIndex + 1)
      return
    }

    setCurrentStepIndex(2)

    setTimeout(() => {
      setCurrentStepIndex(3)
    }, 3000)
  }

  // const handleClickPrevious = () => {
  //   setCurrentStepIndex(currentStepIndex - 1)
  // }

  const handleClickSwitchVersions = () => {
    setShouldShowClassicVerion(!shouldShowClassicVersion)
    setCurrentStepIndex(0)
  }

  const handleClickSwitchAssets = () => {
    const originalBuyAsset = buyAsset
    setBuyAsset(sellAsset)
    setSellAsset(originalBuyAsset)
  }

  const handleSelectSellAsset = (asset: string) => {
    if (asset === buyAsset) {
      handleClickSwitchAssets()
      return
    }
    setSellAsset(asset)
  }

  const handleSelectBuyAsset = (asset: string) => {
    if (asset === sellAsset) {
      handleClickSwitchAssets()
      return
    }
    setBuyAsset(asset)
  }

  const renderClassicVersionNextSteps = () => {
    return (
      <>
        <ClassicVersionTradeSubmitted
          buyAsset={buyAsset}
          sellAsset={sellAsset}
          currentStep={currentStep}
        />
        <Flex>
          <Switch
            margin='0 auto'
            size='sm'
            colorScheme={OG_COLORS.lightBlue}
            bottom={8}
            isChecked={shouldShowClassicVersion}
            onChange={handleClickSwitchVersions}
          />
        </Flex>
      </>
    )
  }

  const renderSteps = () => {
    if (shouldShowClassicVersion && !isInitialStep) {
      return renderClassicVersionNextSteps()
    }

    return (
      <Grid
        height={{
          base: shouldShowClassicVersion ? '70vh' : `calc(100vh - ${PAGE_HEIGHT_OFFSET_MOBILE})`,
          md: shouldShowClassicVersion
            ? `calc(100vh - ${PAGE_HEIGHT_OFFSET_CLASSIC})`
            : `calc(100vh - ${PAGE_HEIGHT_OFFSET_MODERN})`,
        }}
        templateColumns={{
          base: '1fr',
          md: 'repeat(11, 1fr)',
        }}
        mt={{
          base: '0',
          md: shouldShowClassicVersion ? '0' : PAGE_MARGIN_TOP_MODERN,
        }}
        gap={0}
      >
        <GridItem margin={{ base: '0 auto', md: '0' }} colSpan={{ base: 1, md: 5 }}>
          <Flex justifyContent='flex-end'>
            <SwapCardSwitch
              role='sell'
              selectedAsset={sellAsset}
              setAsset={handleSelectSellAsset}
              selectedOtherAsset={buyAsset}
              shouldShowClassicVersion={shouldShowClassicVersion}
              currentStep={stepsList[currentStepIndex]}
              // receiveAmount={}
              // exchangeRate={}
            />
          </Flex>
        </GridItem>
        <GridItem colSpan={1} margin={hasSubmittedTrade ? '0 30px' : '0 40px'} bg={bgColor}>
          {isLargerThanMd ? (
            <CenterColumn
              currentStep={currentStep}
              handleClickNext={handleClickNext}
              isFinalStep={isFinalStep}
              isInitialStep={isInitialStep}
              shouldShowClassicVersion={shouldShowClassicVersion}
              handleClickSwitchAssets={handleClickSwitchAssets}
              handleClickSwitchVersions={handleClickSwitchVersions}
              hasSubmittedTrade={hasSubmittedTrade}
            />
          ) : (
            <CenterRow
              currentStep={currentStep}
              isFinalStep={isFinalStep}
              shouldShowClassicVersion={shouldShowClassicVersion}
              handleClickSwitchAssets={handleClickSwitchAssets}
              hasSubmittedTrade={hasSubmittedTrade}
            />
          )}
        </GridItem>
        <GridItem margin={{ base: '0 auto', md: '0' }} colSpan={{ base: 1, md: 5 }}>
          <Flex justifyContent='flex-start'>
            <SwapCardSwitch
              role='buy'
              selectedAsset={buyAsset}
              setAsset={handleSelectBuyAsset}
              selectedOtherAsset={sellAsset}
              shouldShowClassicVersion={shouldShowClassicVersion}
              handleClickNext={handleClickNext}
              currentStep={stepsList[currentStepIndex]}
              // receiveAmount={}
              // exchangeRate={}
            />
          </Flex>
        </GridItem>
        {!isLargerThanMd && (
          <MobileFooter
            handleClickNext={handleClickNext}
            isInitialStep={isInitialStep}
            shouldShowClassicVersion={shouldShowClassicVersion}
            handleClickSwitchVersions={handleClickSwitchVersions}
            hasSubmittedTrade={hasSubmittedTrade}
          />
        )}
      </Grid>
    )
  }

  return (
    <Page>
      <Flex direction='column'>
        {shouldShowClassicVersion && <OGHeader />}
        <Box bg={bgColor} paddingTop={shouldShowClassicVersion ? BODY_PADDING_TOP : '0'}>
          {renderSteps()}
        </Box>
      </Flex>
    </Page>
  )
}
