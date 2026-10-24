import { PREFIX_MAP } from "../constants";
import { FileCategory, ParsedQuery } from "../types";

export function parseSearchQuery(input: string): ParsedQuery {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

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

  return {
    rawQuery: input,
    searchTerm: trimmed
  };
}
