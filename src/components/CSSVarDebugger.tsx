import { Box, Text as CText, HStack, VStack } from '@chakra-ui/react'
import { memo, useEffect, useState } from 'react'

export const CSSVarDebugger = memo(() => {
  const [debugValues, setDebugValues] = useState<Record<string, string>>({})

  useEffect(() => {
    setTimeout(() => {
      const getEnvValue = (envVar: string): string => {
        if (typeof window === 'undefined') return 'N/A'

        // Create a test element with the env() function
        const testElement = document.createElement('div')
        testElement.style.position = 'fixed'
        testElement.style.top = '0'
        testElement.style.left = '0'
        testElement.style.visibility = 'hidden'
        testElement.style.pointerEvents = 'none'

        // Try to apply env() function
        testElement.style.height = envVar

        document.body.appendChild(testElement)

        const computedStyle = getComputedStyle(testElement)
        const value = computedStyle.height

        document.body.removeChild(testElement)

        return value && value !== 'auto' ? value : 'Not found'
      }

      // Try multiple methods to get CSS custom properties
      const getCSSVarValue = (varName: string): string => {
        if (typeof window === 'undefined') return 'N/A'

        // Method 1: Try to get from document root
        const rootStyle = getComputedStyle(document.documentElement)
        let value = rootStyle.getPropertyValue(varName)
        if (value && value.trim()) return value.trim()

        // Method 2: Try to get from body
        const bodyStyle = getComputedStyle(document.body)
        value = bodyStyle.getPropertyValue(varName)
        if (value && value.trim()) return value.trim()

        // Method 3: Create test element with var() usage
        const testElement = document.createElement('div')
        testElement.style.position = 'fixed'
        testElement.style.top = '0'
        testElement.style.left = '0'
        testElement.style.visibility = 'hidden'
        testElement.style.pointerEvents = 'none'
        testElement.style.height = `var(${varName})`

        document.body.appendChild(testElement)
        const computedStyle = getComputedStyle(testElement)
        value = computedStyle.height
        document.body.removeChild(testElement)

        if (value && value !== 'auto' && value !== '0px') return value.trim()

        return 'Not found'
      }

      const values = {
        '--mobile-header-offset': getCSSVarValue('--mobile-header-offset'),
        '--mobile-header-user-offset': getCSSVarValue('--mobile-header-user-offset'),
        '--mobile-nav-offset': getCSSVarValue('--mobile-nav-offset'),
        '--safe-area-inset-top': getCSSVarValue('--safe-area-inset-top'),
        '--safe-area-inset-bottom': getCSSVarValue('--safe-area-inset-bottom'),
        'env(safe-area-inset-top)': getEnvValue('env(safe-area-inset-top)'),
        'env(safe-area-inset-bottom)': getEnvValue('env(safe-area-inset-bottom)'),
      }

      setDebugValues(values)
    }, 5000)
  }, [])

  return (
    <Box
      position='fixed'
      top='60px'
      right='10px'
      bg='red.500'
      color='white'
      p={3}
      borderRadius='md'
      fontSize='xs'
      zIndex={9999}
      maxW='300px'
    >
      <VStack align='start' spacing={1}>
        <CText fontWeight='bold' fontSize='sm'>
          CSS Debug Values:
        </CText>
        {Object.entries(debugValues).map(([key, value]) => (
          <HStack key={key} spacing={2}>
            <CText fontSize='xs' fontWeight='bold' minW='120px'>
              {key}:
            </CText>
            <CText fontSize='xs'>{value}</CText>
          </HStack>
        ))}
      </VStack>
    </Box>
  )
})
