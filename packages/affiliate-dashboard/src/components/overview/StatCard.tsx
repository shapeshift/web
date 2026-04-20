import { Box, Stat, StatLabel, StatNumber } from '@chakra-ui/react'

interface StatCardProps {
  label: string
  value: string
}

export const StatCard = ({ label, value }: StatCardProps): React.JSX.Element => (
  <Box
    bg='bg.surface'
    border='1px solid'
    borderColor='border.subtle'
    borderRadius='2xl'
    px={6}
    py={7}
    textAlign='center'
  >
    <Stat>
      <StatNumber
        fontSize={{ base: '2xl', md: '3xl' }}
        fontWeight={700}
        color='fg.bright'
        fontFamily='mono'
        letterSpacing='-0.02em'
        mb={1.5}
      >
        {value}
      </StatNumber>
      <StatLabel
        fontSize='xs'
        fontWeight={500}
        color='fg.muted'
        textTransform='uppercase'
        letterSpacing='0.06em'
      >
        {label}
      </StatLabel>
    </Stat>
  </Box>
)
