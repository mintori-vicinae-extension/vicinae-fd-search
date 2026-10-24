import { searchWithFd } from "../src/services/search/fd-engine";
import { generateFilePreview } from "../src/services/preview/preview-manager";
import { parseSearchQuery } from "../src/utils/query-parser";
import { FileItem } from "../src/types";

async function runTests() {
  console.log("=== 1. TEST QUERY PARSER ===");
  const p1 = parseSearchQuery("img: cat photo");
  console.log("Parsed 'img: cat photo':", p1);
  if (p1.categoryPrefix !== "image" || p1.searchTerm !== "cat photo") {
    throw new Error("Query parser failed for img: prefix");
  }

  const p2 = parseSearchQuery("archive: backup.tar.gz");
  console.log("Parsed 'archive: backup.tar.gz':", p2);
  if (p2.categoryPrefix !== "archive" || p2.searchTerm !== "backup.tar.gz") {
    throw new Error("Query parser failed for archive: prefix");
  }

  console.log("\n=== 2. TEST FD SEARCH ENGINE ===");
  const foundItems: FileItem[] = [];
  await new Promise<void>((resolve, reject) => {
    const cancel = searchWithFd({
      searchTerm: "",
      rootPath: "/tmp/vicinae-test-workspace",
      category: "all",
      showHidden: false,
      excludedDirs: ["node_modules", "build"],
      maxResults: 20,
      onItem: (item) => {
        foundItems.push(item);
      },
      onError: (err) => reject(err),
      onFinish: () => resolve()
    });
  });

  console.log(`Found ${foundItems.length} files:`);
  for (const item of foundItems) {
    console.log(` - [${item.category}] ${item.name} (${item.path})`);
  }

  const hasNodeModules = foundItems.some((it) => it.path.includes("node_modules"));
  const hasBuild = foundItems.some((it) => it.path.includes("build"));
  if (hasNodeModules || hasBuild) {
    throw new Error("Excluded directories were not ignored by fd search!");
  }
  if (foundItems.length === 0) {
    throw new Error("No files found in test directory!");
  }

  console.log("\n=== 3. TEST PREVIEWS GENERATION ===");
  for (const item of foundItems) {
    const preview = await generateFilePreview(item);
    console.log(`Preview for ${item.name}:`);
    console.log(`  Markdown snippet:\n${preview.markdownContent?.split("\n").slice(0, 3).join("\n")}`);
    console.log(`  Metadata:`, preview.metadata);
  }

  console.log("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! ✅");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
