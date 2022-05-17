/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Container } from '@chakra-ui/react'
import { Story } from '@storybook/react'
import { ReactNode } from 'react'

import { AllocationTable } from './components/AllocationTable'
import { AssetInput, AssetInputProps } from './components/AssetInput'

// export default {
//   title: 'Layout/DeFi',
//   decorators: [
//     (Story: any) => (
//       <Modal isOpen onClose={() => {}} size='lg'>
//         <ModalContent>
//           <ModalBody py={6}>
//             <Story />
//           </ModalBody>
//         </ModalContent>
//       </Modal>
//     ),
//   ],
// }

export default {
  title: 'Forms/AssetInput',
  component: AssetInput,
  decorators: [
    (Story: any) => (
      <Container maxWidth='md'>
        <Story />
      </Container>
    ),
  ],
}

export const Basic: Story<AssetInputProps> = args => <AssetInput {...args} />
Basic.args = {
  assetIcon: 'https://assets.coincap.io/assets/icons/256/fox.png',
  assetName: 'FOX',
  balance: '1000',
  fiatAmount: '0',
  onClick: undefined,
}

const testData = [
  {
    symbol: 'FOX',
    value: '1000',
    icon: 'https://assets.coincap.io/assets/icons/256/fox.png',
  },
  {
    symbol: 'USDC',
    value: '1000',
    icon: 'https://assets.coincap.io/assets/icons/256/usdc.png',
  },
]
export const WithChildren: Story<AssetInputProps & { children: ReactNode }> = args => (
  <AssetInput {...args} />
)
WithChildren.args = {
  ...Basic.args,
  children: <AllocationTable label='Allocation Table' items={testData} />,
  fiatAmount: '0',
}
