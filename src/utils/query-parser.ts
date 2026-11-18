import { PREFIX_MAP, CATEGORY_EXTENSIONS } from "../constants";
import { FileCategory, ParsedQuery } from "../types";

export function parseSearchQuery(input: string): ParsedQuery {
  const trimmed = input.trim();

  // Pattern: matches `<prefix_string>:<remainder>`
  // Allows letters, digits, underscores, dashes, commas and spaces before ':'
  const prefixMatch = trimmed.match(/^([a-zA-Z0-9_,\s-]+):(.*)$/);
  if (prefixMatch) {
    const rawTokens = prefixMatch[1]
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const remainder = prefixMatch[2].trim();

    if (rawTokens.length > 0) {
      let containsHidden = false;
      const resolvedExtensions = new Set<string>();
      let singleCategory: FileCategory | undefined;

      for (const token of rawTokens) {
        if (token === "hidden" || token === "h") {
          containsHidden = true;
          continue;
        }

        // Check if token matches a category (either with ':' or without)
        const catKey = token.endsWith(":") ? token : `${token}:`;
        const matchedCategory = PREFIX_MAP[catKey];

        if (matchedCategory) {
          if (rawTokens.length === 1 && !containsHidden) {
            singleCategory = matchedCategory;
          }
          if (matchedCategory !== "all" && CATEGORY_EXTENSIONS[matchedCategory]) {
            for (const ext of CATEGORY_EXTENSIONS[matchedCategory]) {
              resolvedExtensions.add(ext.toLowerCase());
            }
          }
        } else if (/^[a-z0-9_-]{1,10}$/.test(token)) {
          // Custom extension (e.g. epub, mobi, pdf, py, tsx)
          resolvedExtensions.add(token);
        }
      }

      // If only "hidden:" or "h:" was specified
      if (resolvedExtensions.size === 0 && (singleCategory === undefined || singleCategory === "git")) {
        if (containsHidden) {
          return {
            rawQuery: input,
            searchTerm: remainder,
            showHidden: true
          };
        }
        if (singleCategory === "git") {
          return {
            rawQuery: input,
            searchTerm: remainder,
            categoryPrefix: "git"
          };
        }
      }

      // If exactly 1 single standard category was requested and no other token
      if (rawTokens.length === 1 && singleCategory) {
        return {
          rawQuery: input,
          searchTerm: remainder,
          categoryPrefix: singleCategory,
          filterExtensions: Array.from(resolvedExtensions)
        };
      }

      // If single custom extension was requested and no hidden flag
      if (rawTokens.length === 1 && !containsHidden && resolvedExtensions.size === 1) {
        return {
          rawQuery: input,
          searchTerm: remainder,
          customExtension: rawTokens[0],
          filterExtensions: Array.from(resolvedExtensions)
        };
      }

      // Multi tokens / combination (e.g. video,epub: or hidden,code: or pdf,docx:)
      return {
        rawQuery: input,
        searchTerm: remainder,
        filterExtensions: resolvedExtensions.size > 0 ? Array.from(resolvedExtensions) : undefined,
        showHidden: containsHidden || undefined
      };
    }
  }

  return {
    rawQuery: input,
    searchTerm: trimmed
  };
}
