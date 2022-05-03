import { swVersion } from './swVersion'

export function transformNavigation(headers: Headers, body: Uint8Array): BodyInit {
  const stringBody = new TextDecoder().decode(body)
  const metaVersion = stringBody.match(
    /<meta(?:\s+[^>]*)?(?: (?:name="serviceworker\/version"|value="([^"]*)")){2}(?:\s+[^>]*)?\/>\s*/is,
  )?.[1]
  if (!metaVersion) return body
  if (metaVersion !== swVersion) {
    console.warn(`sw: found meta tag with unrecognized version ${metaVersion}; skipping transform.`)
    return body
  }
  console.info(`sw: recognized version ${metaVersion}; transforming.`)

  let out = stringBody
    // Remove serviceworker/src meta tag. The stub uses the presence or absence of this tag to infer whether it's been
    // loaded by a page that's been transformed or not.
    .replace(
      /<meta(?:\s+[^>]*)?(?: (?:name="serviceworker\/src"|value="([^"]*)")){2}(?:\s+[^>]*)?\/>\s*/gis,
      '',
    )
    // Remove the injectable header list, if present.
    .replace(
      /<script(?:\s+[^>]*)? type="serviceworker\/injectable-headers"(?:\s+[^>]*)?>(.*?)<\/script(?:\s+[^>]*)?>\s*/gis,
      '',
    )
    // Remove the serviceworker/only-if-transformed type from any script tags that have it, which will allow them to run.
    .replace(
      /(<script(?:\s+[^>]*)?) type="serviceworker\/only-if-transformed"((?:\s+[^>]*)?(?:>))/gis,
      '$1$2',
    )

  // Parse out the contents of a serviceworker/injectable-headers script tag, if any, in the untransformed source.
  const injectableHeadersJson = stringBody.match(
    /<script(?:\s+[^>]*)? type="serviceworker\/injectable-headers"(?:\s+[^>]*)?>(.*?)<\/script(?:\s+[^>]*)?>\s*/is,
  )?.[1]
  if (injectableHeadersJson) {
    const injectableHeaders = JSON.parse(injectableHeadersJson) as Record<string, string>
    console.info('sw: injecting headers', injectableHeaders)
    for (const [name, value] of Object.entries(injectableHeaders)) {
      headers.append(name, value)
    }
    // Remove the serviceworker/only-if-headers-injected type from any script tags that have it, which will allow them to run.
    out = out.replace(
      /(<script(?:\s+[^>]*)?) type="serviceworker\/only-if-headers-injected"((?:\s+[^>]*)?(?:>))/gis,
      '$1$2',
    )
  }
  return out
}
Object.freeze(transformNavigation)
