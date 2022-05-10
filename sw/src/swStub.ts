export { SimpleRpc } from './simpleRpc'

function showFallback() {
  console.info('swStub: showing fallback elements')
  // This stylesheet will be injected after the 'display: none' one, so it will take precedence.
  const element = document.createElement('style')
  element.appendChild(document.createTextNode('[noserviceworker] { display: revert; }'))
  document.documentElement.appendChild(element)
}

/**
 * Find the value of (the first) service worker meta tag with a certain name.
 * @param {string} name
 */
function getSwMetaTag(name: string) {
  return Array.from(document.getElementsByTagName('meta'))
    .find(x => x.name === `serviceworker/${name}`)
    ?.attributes.getNamedItem('value')?.value
}

// Synchronously prevent display of anything with the 'noserviceworker' attribute.
// As long as this stub is included in the <head> tag, this will prevent fallback
// elements from ever being displayed.
;(() => {
  const element = document.createElement('style')
  element.appendChild(document.createTextNode('[noserviceworker] { display: none; }'))
  document.documentElement.appendChild(element)
})()

// The rest of this process can proceed asynchronously now that the stylesheet is in place.
;(async () => {
  let swActive = false
  try {
    // This occurs in Private Browsing mode on Firefox, and in iframes on Chromium.
    if (!navigator.serviceWorker) throw new Error('navigator.serviceWorker is not available')

    const swPath = getSwMetaTag('src')
    // If there's no serviceworker/src meta tag, the ServiceWorker removed it -- which means
    // the page has been transformed by the version it asked to be transformed by, and no
    // registration or update is required.
    if (!swPath) {
      swActive = true
    } else {
      const swRegistration = await navigator.serviceWorker.register(swPath, {
        updateViaCache: 'none',
      })
      console.info('swStub: ServiceWorker registered')
      await swRegistration.update()
      console.info('swStub: ServiceWorker updated')
    }

    const registration = await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      // This will occur when there's an existing ServiceWorker registration, but
      // the page was just force-reloaded. Force-reloads bypass any ServiceWorker,
      // so we need to reload normally here to allow the already-registered one to
      // take control.
      console.info(
        'swStub: detected force-reload; forcing ServiceWorker update and reloading page.',
      )
      await registration.update()
      window.location.reload()
      return
    }
    // This event listener will be installed irrespective of whether the page has been
    // transformed or not. We need to prevent the page from continuing to execute code
    // on a ServiceWorker change, because the page might rely on the ServiceWorker it
    // loaded with having relevant state -- like a set of fetch filters the page installs
    // on load.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.info('swStub: new ServiceWorker detected; reloading page.')
      window.location.reload()
    })

    // If there's a serviceworker/src meta tag, the ServiceWorker didn't remove it. That implies
    // that either it's not the version we requested, or that it was first installed after the page
    // loaded. Either way, the page hasn't been transformed by the version of the ServiceWorker it
    // needs, and we can't proceed.
    if (!swActive) {
      console.info("swStub: ServiceWorker ready, but page hasn't been transformed yet; reloading.")
      window.location.reload()
      return
    }

    console.info(
      `swStub: ServiceWorker version ${await getSwMetaTag(
        'version',
      )} ready, and the page has been transformed.`,
    )
    navigator.serviceWorker.startMessages()
    registration.active?.postMessage({ method: 'stubLoaded' })
  } catch (e) {
    console.error('swStub:', e)
    // We don't want to display fallback elements if the service worker's active, even if we
    // experience an exception.
    if (!swActive) showFallback()
  }
})()
