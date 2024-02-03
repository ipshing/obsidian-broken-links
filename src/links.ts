import { getLinkpath } from "obsidian";
import { FileModel, FolderModel, LinkModel } from "./models";
import BrokenLinks from "./main";
import { error } from "console";

export async function getLinksByFolder(plugin: BrokenLinks, deepScan = false): Promise<{ folders: Map<string, FolderModel>; files: Map<string, FileModel> }> {
    // Set up models for the root
    const folders = new Map<string, FolderModel>();
    const files = new Map<string, FileModel>();

    // Iterate all the files in the vault
    for (const file of plugin.app.vault.getMarkdownFiles()) {
        // Use the cache to get determine if there are links in the file
        const fileCache = plugin.app.metadataCache.getFileCache(file);
        if (fileCache?.links) {
            // Set up the FileModel now to be added to any broken links
            const fileModel: FileModel = {
                name: file.name,
                path: file.path,
                created: file.stat.ctime,
                modified: file.stat.mtime,
                links: new Map<number, LinkModel>(),
            };
            // Iterate all links in the file
            for (const link of fileCache.links) {
                // Get link path
                const linkPath = getLinkpath(link.link);
                // Check if the link goes anywhere
                const dest = plugin.app.metadataCache.getFirstLinkpathDest(linkPath, file.path);
                // Default behavior is to mark link as broken if no destination is found
                let destIsMissing = dest == null;
                // If there is a destination file, check for missing blocks/headings
                if (dest != null && link.link.contains("#")) {
                    const targetCache = plugin.app.metadataCache.getFileCache(dest);
                    if (link.link.contains("^") && targetCache?.blocks) {
                        const block = link.link.slice(link.link.indexOf("^") + 1);
                        destIsMissing = targetCache.blocks[block] == undefined;
                    } else if (targetCache?.headings) {
                        const heading = link.link.slice(link.link.indexOf("#") + 1);
                        destIsMissing =
                            targetCache.headings.find((value) => {
                                if (value.heading == heading) {
                                    return value;
                                }
                                return undefined;
                            }) == undefined;
                    }
                }
                if (destIsMissing) {
                    // Add the link to the file
                    fileModel.links.set(link.position.start.offset, {
                        id: link.link,
                        parent: fileModel,
                        position: link.position,
                    });
                }
            }
            // Only need to nest the file if broken links were found
            if (fileModel.links.size > 0) {
                // Parse the path and build into the folder model
                const pathParts = file.path.split("/");
                if (pathParts.length > 0) {
                    // Nest in folders collection
                    let parentFolder: FolderModel | null = null;
                    let folderPath = "";
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        const folderName = pathParts[i];
                        folderPath = folderPath.length === 0 ? folderName : `${folderPath}/${folderName}`;
                        // If parentFolder is null, add it to the root,
                        // otherwise nest it into the parentFolder
                        if (parentFolder === null) {
                            // Look for existing folder or create
                            // a new one and set it as the parent
                            if (folders.has(folderName)) {
                                parentFolder = folders.get(folderName)!; // eslint-disable-line
                                // Increment link count
                                parentFolder.linkCount++;
                            } else {
                                // Add to root
                                parentFolder = {
                                    name: folderName,
                                    path: folderPath,
                                    folders: new Map<string, FolderModel>(),
                                    files: new Map<string, FileModel>(),
                                    linkCount: 1, // default to 1
                                };
                                folders.set(folderName, parentFolder);
                            }
                        } else {
                            // Look for existing child folder or create
                            // a new one and add it to the parent
                            let childFolder: FolderModel | null = null;
                            if (parentFolder.folders.has(folderName)) {
                                childFolder = parentFolder.folders.get(folderName)!; // eslint-disable-line
                                // Increment link count
                                childFolder.linkCount++;
                            } else {
                                childFolder = {
                                    name: folderName,
                                    path: folderPath,
                                    folders: new Map<string, FolderModel>(),
                                    files: new Map<string, FileModel>(),
                                    linkCount: 1, // default to 1
                                };
                                parentFolder.folders.set(folderName, childFolder);
                            }
                            // Set the child folder as the parent and recurse
                            parentFolder = childFolder;
                        }
                    }

                    // Locate file in parentFolder or root
                    if (parentFolder) {
                        if (!parentFolder.files.has(file.name)) {
                            parentFolder.files.set(file.name, fileModel);
                        }
                    } else {
                        // File is in the root
                        if (!files.has(file.name)) {
                            files.set(file.name, fileModel);
                        }
                    }
                }
            }
        }
    }

    return { folders: folders, files: files };
}

export async function getLinksByFile(plugin: BrokenLinks, deepScan = false): Promise<FileModel[]> {
    const files: FileModel[] = [];

    // Iterate all the files in the vault
    for (const file of plugin.app.vault.getMarkdownFiles()) {
        // Use the cache to get determine if there are links in the file
        const fileCache = plugin.app.metadataCache.getFileCache(file);
        if (fileCache?.links) {
            // Set up the FileModel now to be added to any broken links
            const fileModel: FileModel = {
                name: file.name,
                path: file.path,
                created: file.stat.ctime,
                modified: file.stat.mtime,
                links: new Map<number, LinkModel>(),
            };
            // Iterate all links in the file
            for (const link of fileCache.links) {
                // Get link path
                const linkPath = getLinkpath(link.link);
                // Check if the link goes anywhere
                const dest = plugin.app.metadataCache.getFirstLinkpathDest(linkPath, file.path);
                // Default behavior is to mark link as broken if no destination is found
                let destIsMissing = dest == null;
                // If there is a destination file, check for missing blocks/headings
                if (dest != null && link.link.contains("#")) {
                    const targetCache = plugin.app.metadataCache.getFileCache(dest);
                    if (link.link.contains("^") && targetCache?.blocks) {
                        const block = link.link.slice(link.link.indexOf("^") + 1);
                        destIsMissing = targetCache.blocks[block] == undefined;
                    } else if (targetCache?.headings) {
                        const heading = link.link.slice(link.link.indexOf("#") + 1);
                        destIsMissing =
                            targetCache.headings.find((value) => {
                                if (value.heading == heading) {
                                    return value;
                                }
                                return undefined;
                            }) == undefined;
                    }
                }
                if (destIsMissing) {
                    // Add the link to the file
                    fileModel.links.set(link.position.start.offset, {
                        id: link.link,
                        parent: fileModel,
                        position: link.position,
                    });
                }
            }

            // Add file to list
            files.push(fileModel);
        }
    }

    return files;
}

export function getSortedKeys(item: Map<string, unknown>): string[] {
    const keys: string[] = [];
    for (const key of item.keys()) {
        keys.push(key);
    }
    return keys.sort();
}

export function getSortedLinkKeys(links: Map<number, LinkModel>): number[] {
    const keys: number[] = [];
    for (const key of links.keys()) {
        keys.push(key);
    }
    return keys.sort();
}

export function getFolder(key: string, folders: Map<string, FolderModel>): FolderModel {
    if (folders.has(key)) {
        return folders.get(key)!; // eslint-disable-line
    }
    throw error("Unable to locate folder.");
}

export function getFile(key: string, files: Map<string, FileModel>): FileModel {
    if (files.has(key)) {
        return files.get(key)!; // eslint-disable-line
    }
    throw error("Unable to locate file.");
}

export function getLink(key: number, links: Map<number, LinkModel>): LinkModel {
    if (links.has(key)) {
        return links.get(key)!; // eslint-disable-line
    }
    throw error("Unable to locate link.");
}
