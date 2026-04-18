import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react'

interface AuthStatusBarProps {
  onSignOut: () => void
}

export const AuthStatusBar = ({ onSignOut }: AuthStatusBarProps): React.JSX.Element => (
  <Box
    bg='rgba(74, 222, 128, 0.06)'
    border='1px solid'
    borderColor='rgba(74, 222, 128, 0.2)'
    borderRadius='xl'
    px={{ base: 5, md: 6 }}
    py={5}
  >
    <Flex justify='space-between' align='center' gap={5} wrap='wrap'>
      <Stack spacing={1} flex='1'>
        <Heading as='h3' fontSize='sm' fontWeight={600} color='success'>
          Authenticated
        </Heading>
        <Text fontSize='xs' color='fg.muted' lineHeight={1.5}>
          You&apos;re signed in and can manage settings for this wallet.
        </Text>
      </Stack>
      <Button
        onClick={onSignOut}
        variant='outline'
        colorScheme='gray'
        borderColor='border.input'
        color='fg.default'
        _hover={{ bg: 'bg.raised', borderColor: 'fg.muted' }}
      >
        Sign Out
      </Button>
    </Flex>
  </Box>
)
