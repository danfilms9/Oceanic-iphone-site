type NotionPageProperties = Record<string, unknown>

/**
 * TCPA proof-of-consent record stored alongside each entry.
 * `ipAddress` is captured server-side from the request.
 */
export interface SmsConsentEntry {
  smsConsent: boolean
  smsConsentAt?: string
  smsConsentSource?: string
  smsConsentText?: string
  ipAddress?: string
}

/**
 * Notion "Email Entries" database property payloads (First Name, Last Name, Email, City, Phone,
 * SMS consent record). City is written as rich_text (full location string); falls back to select
 * for legacy databases.
 */
export function buildEmailEntryNotionProperties(
  firstName: string,
  lastName: string,
  email: string,
  city?: string,
  phone?: string,
  options: {
    emailAsRichText?: boolean
    includeCity?: boolean
    includePhone?: boolean
    cityAsSelect?: boolean
    includeConsent?: boolean
  } = {},
  consent?: SmsConsentEntry,
): NotionPageProperties {
  const {
    emailAsRichText = true,
    includeCity = true,
    includePhone = true,
    cityAsSelect = false,
    includeConsent = true,
  } = options
  const properties: NotionPageProperties = {
    'First Name': {
      rich_text: [{ text: { content: firstName } }],
    },
    'Last Name': {
      title: [{ text: { content: lastName } }],
    },
    Email: emailAsRichText
      ? { rich_text: [{ text: { content: email } }] }
      : { email },
  }
  const cityName = city?.trim()
  if (includeCity && cityName) {
    properties.City = cityAsSelect
      ? { select: { name: cityName.slice(0, 100) } }
      : { rich_text: [{ text: { content: cityName.slice(0, 2000) } }] }
  }
  const phoneValue = phone?.trim()
  if (includePhone && phoneValue) {
    properties.Phone = { rich_text: [{ text: { content: phoneValue } }] }
  }
  if (includeConsent && consent) {
    properties['SMS Consent'] = { checkbox: consent.smsConsent === true }
    if (consent.smsConsentAt) {
      properties['SMS Consent At'] = {
        rich_text: [{ text: { content: consent.smsConsentAt.slice(0, 100) } }],
      }
    }
    if (consent.smsConsentSource) {
      properties['SMS Consent Source'] = {
        rich_text: [{ text: { content: consent.smsConsentSource.slice(0, 2000) } }],
      }
    }
    if (consent.smsConsentText) {
      properties['SMS Consent Text'] = {
        rich_text: [{ text: { content: consent.smsConsentText.slice(0, 2000) } }],
      }
    }
    if (consent.ipAddress) {
      properties['IP Address'] = {
        rich_text: [{ text: { content: consent.ipAddress.slice(0, 100) } }],
      }
    }
  }
  return properties
}

function isNotionValidationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'validation_error'
  )
}

/**
 * Creates a page, retrying with alternate Email/City shapes when Notion rejects the payload.
 * Consent properties are tried first; if the database is missing the consent columns, the
 * same shapes are retried without them so signups are never lost.
 */
export async function createEmailEntryPage(
  notion: { pages: { create: (args: unknown) => Promise<{ id: string }> } },
  databaseId: string,
  firstName: string,
  lastName: string,
  email: string,
  city?: string,
  phone?: string,
  consent?: SmsConsentEntry,
): Promise<{ id: string }> {
  const shapeConfigs = [
    {},
    { emailAsRichText: false },
    { cityAsSelect: true },
    { emailAsRichText: false, cityAsSelect: true },
    { includeCity: false },
    { emailAsRichText: false, includeCity: false },
    { includePhone: false },
    { emailAsRichText: false, includeCity: false, includePhone: false },
  ]
  const consentPhases = consent ? [true, false] : [false]
  const attempts: NotionPageProperties[] = consentPhases.flatMap((includeConsent) =>
    shapeConfigs.map((config) =>
      buildEmailEntryNotionProperties(
        firstName,
        lastName,
        email,
        city,
        phone,
        { ...config, includeConsent },
        consent,
      ),
    ),
  )

  let lastError: unknown
  for (const properties of attempts) {
    try {
      return await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      })
    } catch (error) {
      lastError = error
      if (!isNotionValidationError(error)) throw error
    }
  }

  throw lastError
}

export function formatNotionDatabaseId(databaseId: string) {
  if (databaseId.length === 32 && !databaseId.includes('-')) {
    return `${databaseId.slice(0, 8)}-${databaseId.slice(8, 12)}-${databaseId.slice(12, 16)}-${databaseId.slice(16, 20)}-${databaseId.slice(20)}`
  }
  return databaseId
}
