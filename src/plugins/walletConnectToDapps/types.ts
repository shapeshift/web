export type RegistryItem = {
  category: string
  id: string
  homepage: string
  name: string
  image: string
}

export type APIRegistryItem = {
  app_type: string
  id: string
  homepage: string
  name: string
  image_url: {
    md: string
  }
}
