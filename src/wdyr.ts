import React from 'react'

if (import.meta.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render')
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    exclude: [/withBoundingRects\(\)/, /Portal/],
  })
}
