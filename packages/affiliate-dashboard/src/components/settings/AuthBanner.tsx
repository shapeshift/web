import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react'

interface AuthBannerProps {
  isAuthenticating: boolean
  error: string | null
  onSignIn: () => void
}

export const AuthBanner = ({
  isAuthenticating,
  error,
  onSignIn,
}: AuthBannerProps): React.JSX.Element => (
  <Box
    bg='rgba(55, 97, 249, 0.06)'
    border='1px solid'
    borderColor='rgba(55, 97, 249, 0.2)'
    borderRadius='xl'
    px={{ base: 5, md: 6 }}
    py={5}
  >
    <Flex justify='space-between' align='center' gap={5} wrap='wrap'>
      <Stack spacing={1} flex='1'>
        <Heading as='h3' fontSize='sm' fontWeight={600} color='fg.bright'>
          Sign in to manage settings
        </Heading>
        <Text fontSize='xs' color='fg.muted' lineHeight={1.5}>
          Sign a message with your wallet to prove ownership. This does not cost gas.
        </Text>
        {error && (
          <Text fontSize='xs' color='danger' mt={1}>
            {error}
          </Text>
        )}
      </Stack>
      <Button onClick={onSignIn} isLoading={isAuthenticating} loadingText='Signing...'>
        Sign In
      </Button>
    </Flex>
  </Box>
)
