export interface Note {
  id: string;
  name: string;
  content: string;
}

export interface NotionNote {
  id: string;
  properties: {
    'Name'?: { title: Array<{ plain_text: string }> };
    'Content'?: { rich_text: Array<{ plain_text: string }> } | { title: Array<{ plain_text: string }> };
  };
}
