import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Image,
  getPreferenceValues,
  showToast,
  Toast
} from "@raycast/api";
import * as path from "path";
import { FileItem, FileCategory, ExtensionPreferences, PreviewData } from "./types";
import { DEFAULT_EXCLUDED_DIRS } from "./constants";
import { resolveHomePath, checkCliTool, formatBytes } from "./utils/system";
import { parseSearchQuery } from "./utils/query-parser";
import { searchWithFd } from "./services/search/fd-engine";
import { searchWithPlocate } from "./services/search/plocate-engine";
import { searchWithFind } from "./services/search/fallback-engine";
import { searchGitRepositories } from "./services/search/git-repo-engine";
import { generateFilePreview } from "./services/preview/preview-manager";
import { parseRemoteWebUrl } from "./services/preview/git-preview";
import {
  openFileWithDefaultApp,
  openFileWithApp,
  getApplicationName,
  revealInFileManager,
  openInTerminal
} from "./services/action/open-action";

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const [rawSearchText, setRawSearchText] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>("all");
  const [items, setItems] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [previewMap, setPreviewMap] = useState<Record<string, PreviewData>>({});
  const [manualHiddenToggle, setManualHiddenToggle] = useState<boolean | null>(null);

  const abortCurrentSearchRef = useRef<(() => void) | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse raw text for potential prefix like "img: query", "video,epub: book", "hidden: config"
  const parsed = useMemo(() => parseSearchQuery(rawSearchText), [rawSearchText]);

  // Determine effective show hidden state:
  // 1. If prefix explicitly has hidden: or h: -> true
  // 2. Else if user toggled via hotkey Ctrl+H -> manualHiddenToggle
  // 3. Else fallback to preferences.showHidden
  const effectiveShowHidden = useMemo(() => {
    if (parsed.showHidden) return true;
    if (manualHiddenToggle !== null) return manualHiddenToggle;
    return Boolean(preferences.showHidden);
  }, [parsed.showHidden, manualHiddenToggle, preferences.showHidden]);

  // When custom extension or multi filter extensions are in the search box, category dropdown is overridden
  const activeCategory = parsed.filterExtensions || parsed.customExtension
    ? "all"
    : (parsed.categoryPrefix || selectedCategory);

  const rootPath = useMemo(
    () => resolveHomePath(preferences.rootPath || "~"),
    [preferences.rootPath]
  );

  const maxResults = useMemo(
    () => parseInt(preferences.maxResults || "100", 10) || 100,
    [preferences.maxResults]
  );

  const excludedDirs = useMemo(() => {
    if (preferences.excludedDirs) {
      return preferences.excludedDirs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return DEFAULT_EXCLUDED_DIRS;
  }, [preferences.excludedDirs]);

  // Execute Search Effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      // Cancel previous search process
      if (abortCurrentSearchRef.current) {
        abortCurrentSearchRef.current();
        abortCurrentSearchRef.current = null;
      }

      setIsLoading(true);
      setItems([]);

      const hasFd = await checkCliTool("fd");
      const hasPlocate = await checkCliTool("locate");

      let cancelSearch: () => void;

      const searchOptions = {
        searchTerm: parsed.searchTerm,
        rootPath,
        category: activeCategory,
        customExtension: parsed.customExtension,
        extensions: parsed.filterExtensions,
        showHidden: effectiveShowHidden,
        excludedDirs,
        maxResults,
        onItem: (newItem: FileItem) => {
          setItems((prev) => {
            if (prev.some((it) => it.id === newItem.id)) return prev;
            return [...prev, newItem];
          });
        },
        onError: async (err: Error) => {
          await showToast({
            style: Toast.Style.Failure,
            title: "Search Error",
            message: err.message
          });
        },
        onFinish: () => {
          setIsLoading(false);
        }
      };

      if (activeCategory === "git") {
        cancelSearch = searchGitRepositories({
          searchTerm: parsed.searchTerm,
          rootPath,
          maxResults,
          onItem: (newItem: FileItem) => {
            setItems((prev) => {
              if (prev.some((it) => it.id === newItem.id)) return prev;
              return [...prev, newItem];
            });
          },
          onError: async (err: Error) => {
            await showToast({
              style: Toast.Style.Failure,
              title: "Git Search Error",
              message: err.message
            });
          },
          onFinish: () => {
            setIsLoading(false);
          }
        });
      } else if (preferences.usePlocate && hasPlocate) {
        cancelSearch = searchWithPlocate(searchOptions);
      } else if (hasFd) {
        cancelSearch = searchWithFd(searchOptions);
      } else {
        cancelSearch = searchWithFind(searchOptions);
      }

      abortCurrentSearchRef.current = cancelSearch;
    }, 150); // 150ms debounce

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortCurrentSearchRef.current) {
        abortCurrentSearchRef.current();
        abortCurrentSearchRef.current = null;
      }
    };
  }, [
    parsed.searchTerm,
    parsed.customExtension,
    parsed.filterExtensions,
    effectiveShowHidden,
    activeCategory,
    rootPath,
    maxResults,
    excludedDirs,
    preferences.usePlocate
  ]);

  // Fetch Preview Effect for active selected item
  useEffect(() => {
    if (!selectedItemId) return;
    const currentItem = items.find((it) => it.id === selectedItemId);
    if (!currentItem) return;

    if (!previewMap[selectedItemId]) {
      let isCancelled = false;
      generateFilePreview(currentItem).then((preview) => {
        if (!isCancelled) {
          setPreviewMap((prev) => ({
            ...prev,
            [selectedItemId]: preview
          }));
        }
      });
      return () => {
        isCancelled = true;
      };
    }
  }, [selectedItemId, items, previewMap]);

  function getItemIcon(item: FileItem): Image.ImageLike {
    if (item.category === "git") {
      return Icon.Box;
    }
    return { fileIcon: item.path };
  }

  const selectedItem = items.find((it) => it.id === selectedItemId) || items[0];
  const selectedPreview = selectedItem ? previewMap[selectedItem.id] : null;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={items.length > 0}
      onSearchTextChange={setRawSearchText}
      onSelectionChange={(id) => setSelectedItemId(id)}
      searchBarPlaceholder="Search files... (e.g. git:, epub:, pdf:, img:, doc:)"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by File Type"
          value={selectedCategory}
          onChange={(val) => setSelectedCategory(val as FileCategory)}
        >
          <List.Dropdown.Item title="All Files" value="all" icon={Icon.Globe} />
          <List.Dropdown.Item title="Git Repositories" value="git" icon={Icon.Box} />
          <List.Dropdown.Item title="Images" value="image" icon={Icon.Image} />
          <List.Dropdown.Item title="Videos" value="video" icon={Icon.Video} />
          <List.Dropdown.Item title="Audio" value="audio" icon={Icon.Music} />
          <List.Dropdown.Item title="Documents" value="document" icon={Icon.Document} />
          <List.Dropdown.Item title="Code" value="code" icon={Icon.Code} />
          <List.Dropdown.Item title="Archives" value="archive" icon={Icon.HardDrive} />
        </List.Dropdown>
      }
    >
      <List.Section
        title={
          activeCategory === "git"
            ? `Git Repositories (${items.length} repos)`
            : parsed.customExtension
            ? `Results for *.${parsed.customExtension} (${items.length} files)`
            : `Results (${items.length} files)`
        }
      >
        {items.map((item) => {
          const parentDir = path.dirname(item.path);
          const parentFolder = path.basename(parentDir);
          return (
            <List.Item
              key={item.id}
              id={item.id}
              title={item.name}
              subtitle={parentFolder ? `in ${parentFolder}` : undefined}
              icon={getItemIcon(item)}
              accessories={[
                {
                  text: formatBytes(item.size)
                }
              ]}
              detail={
                <List.Item.Detail
                  markdown={selectedPreview?.markdownContent || "*Loading preview...*"}
                  metadata={
                    selectedPreview?.metadata && (
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="File Name"
                          text={item.name}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Folder"
                          text={parentDir.replace(rootPath, "~")}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Full Path"
                          text={item.path}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Size"
                          text={selectedPreview.metadata.size || formatBytes(item.size)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Type"
                          text={selectedPreview.metadata.type || item.extension.toUpperCase()}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Modified"
                          text={selectedPreview.metadata.mtime || ""}
                        />
                        {selectedPreview.metadata.permissions && (
                          <List.Item.Detail.Metadata.Label
                            title="Permissions"
                            text={selectedPreview.metadata.permissions}
                          />
                        )}
                        {selectedPreview.metadata.extra && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            {Object.entries(selectedPreview.metadata.extra).map(([k, v]) => (
                              <List.Item.Detail.Metadata.Label
                                key={k}
                                title={k}
                                text={v}
                              />
                            ))}
                          </>
                        )}
                      </List.Item.Detail.Metadata>
                    )
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={item.category === "git" ? "Open Repository" : "Open File"}
                      icon={Icon.Eye}
                      onAction={() => openFileWithDefaultApp(item.path)}
                    />
                    {preferences.shiftOpenApp ? (
                      <Action
                        title={`Open with ${getApplicationName(preferences.shiftOpenApp) || "Application"}`}
                        icon={Icon.AppWindow}
                        shortcut={{ modifiers: ["shift"], key: "enter" }}
                        onAction={() => openFileWithApp(item.path, preferences.shiftOpenApp!)}
                      />
                    ) : (
                      <Action.OpenWith
                        path={item.path}
                        shortcut={{ modifiers: ["shift"], key: "enter" }}
                      />
                    )}
                    {item.category === "git" && (
                      <Action
                        title="Open in Terminal"
                        icon={Icon.Terminal}
                        shortcut={{ modifiers: ["ctrl"], key: "t" }}
                        onAction={() => openInTerminal(item.path)}
                      />
                    )}
                    {item.category === "git" && selectedPreview?.metadata?.extra?.["Remote URL"] && (
                      (() => {
                        const webUrl = parseRemoteWebUrl(selectedPreview.metadata.extra["Remote URL"]);
                        return webUrl ? (
                          <Action.OpenInBrowser
                            title="Open Remote Repository"
                            url={webUrl}
                            shortcut={{ modifiers: ["ctrl"], key: "o" }}
                          />
                        ) : null;
                      })()
                    )}
                    <Action
                      title="Reveal in File Manager"
                      icon={Icon.Folder}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                      onAction={() => revealInFileManager(item.path)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy File Path"
                      content={item.path}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy File Name"
                      content={item.name}
                      shortcut={{ modifiers: ["cmd", "alt"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title={effectiveShowHidden ? "Hide Hidden Files" : "Show Hidden Files"}
                      icon={effectiveShowHidden ? Icon.EyeDisabled : Icon.Eye}
                      shortcut={{ modifiers: ["ctrl"], key: "h" }}
                      onAction={() => setManualHiddenToggle(!effectiveShowHidden)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
