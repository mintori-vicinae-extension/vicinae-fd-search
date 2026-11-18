import { parseSearchQuery } from "../src/utils/query-parser";
import { searchWithFd } from "../src/services/search/fd-engine";
import { CATEGORY_EXTENSIONS } from "../src/constants";
import * as assert from "assert";

function testParser() {
  console.log("=== Testing parseSearchQuery ===");

  // 1. Backward compatibility: single category
  const res1 = parseSearchQuery("video: naruto");
  assert.strictEqual(res1.searchTerm, "naruto");
  assert.strictEqual(res1.categoryPrefix, "video");
  assert.ok(res1.filterExtensions?.includes("mp4"));
  assert.ok(res1.filterExtensions?.includes("mkv"));
  assert.strictEqual(res1.showHidden, undefined);

  // 2. Backward compatibility: single extension
  const res2 = parseSearchQuery("epub: dragon ball");
  assert.strictEqual(res2.searchTerm, "dragon ball");
  assert.strictEqual(res2.customExtension, "epub");
  assert.deepStrictEqual(res2.filterExtensions, ["epub"]);
  assert.strictEqual(res2.showHidden, undefined);

  // 3. Multi: video,epub:
  const res3 = parseSearchQuery("video,epub: bleach");
  assert.strictEqual(res3.searchTerm, "bleach");
  assert.ok(res3.filterExtensions?.includes("mp4"));
  assert.ok(res3.filterExtensions?.includes("mkv"));
  assert.ok(res3.filterExtensions?.includes("epub"));
  assert.strictEqual(res3.showHidden, undefined);

  // 4. Multi with spaces: video, epub:
  const res4 = parseSearchQuery("video, epub: bleach");
  assert.strictEqual(res4.searchTerm, "bleach");
  assert.ok(res4.filterExtensions?.includes("mp4"));
  assert.ok(res4.filterExtensions?.includes("epub"));

  // 5. Multi extensions: pdf, docx, mobi: book
  const res5 = parseSearchQuery("pdf, docx, mobi: book");
  assert.strictEqual(res5.searchTerm, "book");
  assert.ok(res5.filterExtensions?.includes("pdf"));
  assert.ok(res5.filterExtensions?.includes("docx"));
  assert.ok(res5.filterExtensions?.includes("mobi"));

  // 6. Hidden alone: hidden: bashrc
  const res6 = parseSearchQuery("hidden: bashrc");
  assert.strictEqual(res6.searchTerm, "bashrc");
  assert.strictEqual(res6.showHidden, true);
  assert.strictEqual(res6.filterExtensions, undefined);

  // 7. Hidden alias h:
  const res7 = parseSearchQuery("h: profile");
  assert.strictEqual(res7.searchTerm, "profile");
  assert.strictEqual(res7.showHidden, true);

  // 8. Combination: hidden,code: env
  const res8 = parseSearchQuery("hidden,code: env");
  assert.strictEqual(res8.searchTerm, "env");
  assert.strictEqual(res8.showHidden, true);
  assert.ok(res8.filterExtensions?.includes("ts"));
  assert.ok(res8.filterExtensions?.includes("env"));

  // 9. Combination: h, video, epub: movie
  const res9 = parseSearchQuery("h, video, epub: movie");
  assert.strictEqual(res9.searchTerm, "movie");
  assert.strictEqual(res9.showHidden, true);
  assert.ok(res9.filterExtensions?.includes("mp4"));
  assert.ok(res9.filterExtensions?.includes("epub"));

  console.log("All query parser tests passed! ✅");
}

async function testFdWithMultiAndHidden() {
  console.log("=== Testing searchWithFd with multi extensions and hidden ===");
  const items: string[] = [];
  await new Promise<void>((resolve, reject) => {
    searchWithFd({
      searchTerm: "",
      rootPath: process.cwd(),
      category: "all",
      extensions: ["json", "md"],
      showHidden: true,
      excludedDirs: ["node_modules", ".git"],
      maxResults: 20,
      onItem: (item) => {
        items.push(item.name);
      },
      onError: (err) => reject(err),
      onFinish: () => resolve()
    });
  });

  console.log(`Found ${items.length} items with multi extensions (json, md) and hidden=true:`, items);
  assert.ok(items.length > 0, "Should find files matching json/md");
  assert.ok(items.some((it) => it.endsWith(".json")), "Should have found .json files");
  assert.ok(items.some((it) => it.endsWith(".md")), "Should have found .md files");
  console.log("Fd multi search tests passed! ✅");
}

async function main() {
  testParser();
  await testFdWithMultiAndHidden();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
