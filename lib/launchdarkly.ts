import * as ld from '@launchdarkly/node-server-sdk'

let client: ld.LDClient | null = null

async function getClient(): Promise<ld.LDClient | null> {
  const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY
  if (!sdkKey) return null

  if (!client) {
    client = ld.init(sdkKey)
    try {
      await client.waitForInitialization({ timeout: 5 })
    } catch {
      client = null
      return null
    }
  }

  return client
}

export async function getFlag(
  flagKey: string,
  defaultValue: boolean,
  contextAttributes: Record<string, string> = {}
): Promise<boolean> {
  const ldClient = await getClient()
  if (!ldClient) return defaultValue

  const context: ld.LDContext = {
    kind: 'user',
    key: 'anonymous',
    ...contextAttributes,
  }

  return ldClient.boolVariation(flagKey, context, defaultValue)
}
