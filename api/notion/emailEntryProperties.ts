/**
 * Notion "Email Entries" database property payloads (First Name, Last Name, Email, City).
 */
export function buildEmailEntryNotionProperties(
  firstName: string,
  lastName: string,
  email: string,
  city?: string,
) {
  const properties: Record<string, unknown> = {
    'First Name': {
      rich_text: [{ text: { content: firstName } }],
    },
    'Last Name': {
      title: [{ text: { content: lastName } }],
    },
    Email: {
      rich_text: [{ text: { content: email } }],
    },
  }
  const cityName = city?.trim()
  if (cityName) {
    properties.City = { select: { name: cityName } }
  }
  return properties
}

export function formatNotionDatabaseId(databaseId: string) {
  if (databaseId.length === 32 && !databaseId.includes('-')) {
    return `${databaseId.slice(0, 8)}-${databaseId.slice(8, 12)}-${databaseId.slice(12, 16)}-${databaseId.slice(16, 20)}-${databaseId.slice(20)}`
  }
  return databaseId
}
