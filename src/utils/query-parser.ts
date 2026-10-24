import { PREFIX_MAP } from "../constants";
import { ParsedQuery } from "../types";

export function parseSearchQuery(input: string): ParsedQuery {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // 1. First priority: Check known category prefixes (e.g. video:, img:, doc:, code:, zip:)
  for (const [prefix, category] of Object.entries(PREFIX_MAP)) {
    if (lower.startsWith(prefix)) {
      const searchTerm = trimmed.slice(prefix.length).trim();
      return {
        rawQuery: input,
        searchTerm,
        categoryPrefix: category
      };
    }
  }

  // 2. Second priority: Check custom extension prefix: `<ext>:<searchTerm>` or `<ext>: <searchTerm>`
  // Valid file extensions typically consist of 1-10 alphanumeric characters (e.g. epub:, pdf:, gz:, tsx:, 7z:)
  const customExtMatch = trimmed.match(/^([a-zA-Z0-9_-]{1,10}):(.*)$/);
  if (customExtMatch) {
    const rawExt = customExtMatch[1].toLowerCase();
    const searchTerm = customExtMatch[2].trim();
    return {
      rawQuery: input,
      searchTerm,
      customExtension: rawExt
    };
  }

  return {
    rawQuery: input,
    searchTerm: trimmed
  };
}
