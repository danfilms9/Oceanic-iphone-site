type NotionPageProperties = Record<string, unknown>

/**
 * Notion "Email Entries" database property payloads (First Name, Last Name, Email, City).
 */
export function buildEmailEntryNotionProperties(
  firstName: string,
  lastName: string,
  email: string,
  city?: string,
  options: { emailAsRichText?: boolean; includeCity?: boolean } = {},
): NotionPageProperties {
  const { emailAsRichText = true, includeCity = true } = options
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
    properties.City = { select: { name: cityName } }
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
 */
export async function createEmailEntryPage(
  notion: { pages: { create: (args: unknown) => Promise<{ id: string }> } },
  databaseId: string,
  firstName: string,
  lastName: string,
  email: string,
  city?: string,
): Promise<{ id: string }> {
  const attempts: NotionPageProperties[] = [
    buildEmailEntryNotionProperties(firstName, lastName, email, city),
    buildEmailEntryNotionProperties(firstName, lastName, email, city, {
      emailAsRichText: false,
    }),
    buildEmailEntryNotionProperties(firstName, lastName, email, city, {
      includeCity: false,
    }),
    buildEmailEntryNotionProperties(firstName, lastName, email, city, {
      emailAsRichText: false,
      includeCity: false,
    }),
  ]

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
