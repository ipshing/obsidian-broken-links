import { getLinkpath, stripHeading } from "obsidian";
import BrokenLinks from "./main";
import { BrokenLinksModel, FileModel, FolderModel, LinkFilter, LinkModel, LinkModelGroup } from "./models";
import { FileSort, FolderSort, LinkSort } from "./enum";

export async function getBrokenLinks(plugin: BrokenLinks): Promise<BrokenLinksModel> {
    const links: BrokenLinksModel = {
        byFolder: {
            name: "root",
            path: "/",
            folders: [],
            files: [],
            linkCount: 0,
        },
        byFile: [],
        byLink: [],
    };

    // Iterate all the files in the vault
    for (const file of plugin.app.vault.getMarkdownFiles()) {
        // Check ignored folder list
        if (
            plugin.settings.ignoredFolders.find((folder) => {
                return (file.parent && file.parent.path == "/" && folder == "/") || file.path.startsWith(folder + "/");
            })
        ) {
            continue;
        }

        // Use the cache to get determine if there are links in the file
        const fileCache = plugin.app.metadataCache.getFileCache(file);
        if (fileCache?.links) {
            // Set up the FileModel now to be added to any broken links
            const fileModel: FileModel = {
                name: file.name,
                path: file.path,
                created: file.stat.ctime,
                modified: file.stat.mtime,
                links: [],
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
                        const block = link.link.slice(link.link.indexOf("^") + 1).toLocaleLowerCase();
                        destIsMissing = targetCache.blocks[block] == undefined;
                    } else if (targetCache?.headings) {
                        const heading = link.link.slice(link.link.indexOf("#") + 1);
                        destIsMissing =
                            targetCache.headings.find((value) => {
                                if (stripHeading(heading).toLocaleLowerCase() == stripHeading(value.heading).toLocaleLowerCase()) {
                                    return value;
                                }
                                return undefined;
                            }) == undefined;
                    }
                }
                if (destIsMissing) {
                    // Create model
                    const linkModel: LinkModel = {
                        id: link.link,
                        sortId: link.link.replace(/^#?\^?/, ""),
                        parent: fileModel,
                        position: link.position,
                    };
                    if (!plugin.settings.consolidateLinks && link.displayText && link.displayText != link.link) {
                        linkModel.sortId += `|${link.displayText}`;
                    }
                    // Add the link to the file
                    fileModel.links.push(linkModel);
                    // Add to byLink list
                    let group = links.byLink.find((g) => g.id == linkModel.sortId);
                    if (!group) {
                        group = {
                            id: linkModel.sortId,
                            show: true,
                            links: [],
                        };
                        links.byLink.push(group);
                    }
                    group.links.push(linkModel);
                }
            }

            if (fileModel.links.length > 0) {
                links.byFile.push(fileModel);
                // Parse the path and build into the folder model
                const pathParts = file.path.split("/");
                if (pathParts.length > 0) {
                    // Nest in folders collection
                    let parentFolder: FolderModel | null = null;
                    let folderPath = "";
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        const folderName = pathParts[i];
                        folderPath = folderPath.length == 0 ? folderName : `${folderPath}/${folderName}`;
                        // If parentFolder is null, add it to the root,
                        // otherwise nest it into the parentFolder
                        if (parentFolder == null) {
                            // Look for existing folder or create
                            // a new one and set it as the parent
                            parentFolder =
                                links.byFolder.folders.find((f) => {
                                    if (f.path == folderPath) return f;
                                }) ?? null;
                            if (parentFolder != null) {
                                // Increment link count
                                parentFolder.linkCount++;
                            } else {
                                // Add to root
                                parentFolder = {
                                    name: folderName,
                                    path: folderPath,
                                    folders: [],
                                    files: [],
                                    linkCount: 1, // default to 1
                                };
                                links.byFolder.folders.push(parentFolder);
                            }
                        } else {
                            // Look for existing child folder or create
                            // a new one and add it to the parent
                            let childFolder: FolderModel | null =
                                parentFolder.folders.find((f) => {
                                    if (f.path == folderPath) return f;
                                }) ?? null;
                            if (childFolder != null) {
                                // Increment link count
                                childFolder.linkCount++;
                            } else {
                                childFolder = {
                                    name: folderName,
                                    path: folderPath,
                                    folders: [],
                                    files: [],
                                    linkCount: 1, // default to 1
                                };
                                parentFolder.folders.push(childFolder);
                            }
                            // Set the child folder as the parent and recurse
                            parentFolder = childFolder;
                        }
                    }

                    // If there is a parent folder, put the file in there
                    if (parentFolder != null) {
                        parentFolder.files.push(fileModel);
                    } else {
                        // Otherwise, file is in the root
                        links.byFolder.files.push(fileModel);
                    }
                }
            }
        }
    }

    // Sort folder tree
    sortFolderTree(links.byFolder, plugin.settings.folderSort);
    // Sort file tree
    sortFileTree(links.byFile, plugin.settings.fileSort);
    // Sort link tree & filter
    sortLinkTree(links.byLink, plugin.settings.linkSort);
    filterLinkTree(links.byLink, plugin.settings.linkFilter);

    return links;
}

export function sortFolderTree(folder: FolderModel, sort: FolderSort) {
    // Sort folders A to Z
    folder.folders = folder.folders.sort((a, b) => {
        if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) return -1;
        else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) return 1;
        else return 0;
    });
    // Sort files according to settings
    folder.files = folder.files.sort((a, b) => {
        let place = 0;
        if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) place = -1;
        else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) place = 1;
        if (sort == FolderSort.NameDesc) place *= -1;
        return place;
    });
    // Sort links by position
    folder.files.forEach((file) => {
        file.links = file.links.sort((a, b) => {
            if (a.position.start.offset < b.position.start.offset) return -1;
            else if (a.position.start.offset > b.position.start.offset) return 1;
            else return 0;
        });
    });

    // Recurse through subfolders
    folder.folders.forEach((subfolder) => {
        sortFolderTree(subfolder, sort);
    });
}

export function sortFileTree(files: FileModel[], sort: FileSort) {
    // Sort files according to settings
    const sorted = files.sort((a, b) => {
        let place = 0;
        if (sort == FileSort.NameAsc || sort == FileSort.NameDesc) {
            if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) place = -1;
            else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) place = 1;
            if (sort == FileSort.NameDesc) place *= -1;
        } else if (sort == FileSort.CountAsc || sort == FileSort.CountDesc) {
            if (a.links.length < b.links.length) place = -1;
            else if (a.links.length > b.links.length) place = 1;
            if (sort == FileSort.CountDesc) place *= -1;
            // For same link count, default to A to Z
            if (a.links.length == b.links.length) {
                if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) place = -1;
                else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) place = 1;
            }
        }
        return place;
    });
    // Sort links by position
    sorted.forEach((file) => {
        file.links = file.links.sort((a, b) => {
            if (a.position.start.offset < b.position.start.offset) return -1;
            else if (a.position.start.offset > b.position.start.offset) return 1;
            else return 0;
        });
    });
    // Assign back to files
    files = sorted;
}

export function sortLinkTree(linkGroups: LinkModelGroup[], sort: LinkSort) {
    // Sort links according to settings
    const sorted = linkGroups.sort((a, b) => {
        let place = 0;
        if (sort == LinkSort.NameAsc || sort == LinkSort.NameDesc) {
            if (a.id.toLocaleLowerCase() < b.id.toLocaleLowerCase()) place = -1;
            else if (a.id.toLocaleLowerCase() > b.id.toLocaleLowerCase()) place = 1;
            if (sort == LinkSort.NameDesc) place *= -1;
        } else if (sort == LinkSort.CountAsc || sort == LinkSort.CountDesc) {
            if (a.links.length < b.links.length) place = -1;
            else if (a.links.length > b.links.length) place = 1;
            if (sort == LinkSort.CountDesc) place *= -1;
            // For same link count, default to A to Z
            if (a.links.length == b.links.length) {
                if (a.id.toLocaleLowerCase() < b.id.toLocaleLowerCase()) place = -1;
                else if (a.id.toLocaleLowerCase() > b.id.toLocaleLowerCase()) place = 1;
            }
        }
        return place;
    });
    // Sort files A to Z
    for (let i = 0; i < sorted.length; i++) {
        sorted[i].links = sorted[i].links.sort((a, b) => {
            if (a.parent.name.toLocaleLowerCase() < b.parent.name.toLocaleLowerCase()) return -1;
            if (a.parent.name.toLocaleLowerCase() > b.parent.name.toLocaleLowerCase()) return 1;
            else return 0;
        });
    }
    // Assign back to linkGroups
    linkGroups = sorted;
}

export function filterLinkTree(linkGroups: LinkModelGroup[], filter: LinkFilter) {
    for (const group of linkGroups) {
        group.show = true;
        // get the filter string as an array of each "word"
        const words = filter.filterString.split(" ").filter((s) => s);
        for (const word of words) {
            if (filter.matchCase) {
                if (!group.id.contains(word)) {
                    group.show = false;
                }
            } else {
                if (!group.id.toLocaleLowerCase().contains(word.toLocaleLowerCase())) {
                    group.show = false;
                }
            }
        }
    }
}
