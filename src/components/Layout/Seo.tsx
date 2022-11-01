import React from 'react'
import { Helmet } from 'react-helmet-async'

type SeoProps = {
  title?: string
  description?: string
  type?: string
  name?: string
}

export const Seo: React.FC<SeoProps> = ({
  title,
  description = 'ShapeShift DAO | Your Web3 & DeFi Portal',
  type = 'website',
  name = 'ShapeShift',
}) => {
  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{title ? `${title} | ShapeShift` : 'ShapeShift'}</title>
      <meta name='description' content={description} />
      {/* End standard metadata tags */}
      {/* Facebook tags */}
      <meta property='og:type' content={type} />
      <meta property='og:title' content={title} />
      <meta property='og:description' content={description} />
      {/* End Facebook tags */}
      {/* Twitter tags */}
      <meta name='twitter:creator' content={name} />
      <meta name='twitter:card' content={type} />
      <meta name='twitter:title' content={title} />
      <meta name='twitter:description' content={description} />
      {/* End Twitter tags */}
    </Helmet>
  )
}
