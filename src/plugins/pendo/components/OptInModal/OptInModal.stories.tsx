/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */

import { Story } from '@storybook/react'

import { OptInModal } from './OptInModal'

export default {
  title: 'Plugins/Analytics/OptInModal',
  component: OptInModal,
}

export const AnalyticsModal: Story = () => <OptInModal isOpen={true} close={() => {}} />
