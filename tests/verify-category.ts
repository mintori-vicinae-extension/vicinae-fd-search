import { searchWithFd } from "../src/services/search/fd-engine";
import { FileItem } from "../src/types";

async function testCategoryFilter() {
  console.log("=== 4. TEST CATEGORY FILTERING WITH FD -e FLAGS ===");
  const imageFiles: FileItem[] = [];
  await new Promise<void>((resolve, reject) => {
    searchWithFd({
      searchTerm: "",
      rootPath: "/tmp/vicinae-test-workspace",
      category: "image",
      showHidden: false,
      excludedDirs: [],
      maxResults: 10,
      onItem: (item) => imageFiles.push(item),
      onError: (err) => reject(err),
      onFinish: () => resolve()
    });
  });

  console.log(`Found ${imageFiles.length} image files:`, imageFiles.map((f) => f.name));
  if (imageFiles.length !== 1 || imageFiles[0].name !== "banner.png") {
    throw new Error("Category filter for image failed!");
  }

  const archiveFiles: FileItem[] = [];
  await new Promise<void>((resolve, reject) => {
    searchWithFd({
      searchTerm: "",
      rootPath: "/tmp/vicinae-test-workspace",
      category: "archive",
      showHidden: false,
      excludedDirs: [],
      maxResults: 10,
      onItem: (item) => archiveFiles.push(item),
      onError: (err) => reject(err),
      onFinish: () => resolve()
    });
  });

  console.log(`Found ${archiveFiles.length} archive files:`, archiveFiles.map((f) => f.name));
  if (archiveFiles.length !== 1 || archiveFiles[0].name !== "bundle.tar.gz") {
    throw new Error("Category filter for archive failed!");
  }

  console.log("CATEGORY FILTERING TESTS PASSED! ✅");
}

testCategoryFilter().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
