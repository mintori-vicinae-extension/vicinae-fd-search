import { searchWithFd } from "../src/services/search/fd-engine";
import { FileItem } from "../src/types";

async function testPathMatching() {
  console.log("=== TEST MATCHING BOTH PATH AND FILENAME ===");
  const results: FileItem[] = [];
  await new Promise<void>((resolve, reject) => {
    searchWithFd({
      searchTerm: "docs guide",
      rootPath: "/tmp/vicinae-test-workspace",
      category: "all",
      showHidden: false,
      excludedDirs: [],
      maxResults: 10,
      onItem: (item) => results.push(item),
      onError: (err) => reject(err),
      onFinish: () => resolve()
    });
  });

  console.log(`Searching 'docs guide' found ${results.length} files:`, results.map((f) => f.path));
  if (results.length !== 1 || !results[0].path.endsWith("docs/guide.md")) {
    throw new Error("Path matching test failed!");
  }

  const results2: FileItem[] = [];
  await new Promise<void>((resolve, reject) => {
    searchWithFd({
      searchTerm: "archives/bundle",
      rootPath: "/tmp/vicinae-test-workspace",
      category: "all",
      showHidden: false,
      excludedDirs: [],
      maxResults: 10,
      onItem: (item) => results2.push(item),
      onError: (err) => reject(err),
      onFinish: () => resolve()
    });
  });

  console.log(`Searching 'archives/bundle' found ${results2.length} files:`, results2.map((f) => f.path));
  if (results2.length !== 1 || !results2[0].path.endsWith("archives/bundle.tar.gz")) {
    throw new Error("Path with slash matching failed!");
  }

  console.log("PATH AND FILENAME MATCHING TEST PASSED! ✅");
}

testPathMatching().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
