import { ItemView, WorkspaceLeaf, getLinkpath } from "obsidian";
import BrokenLinks from "./main";
import { FolderModel, FileModel, LinkModel, LinkPosition } from "./models";
import FileListView from "./views/file-list.svelte";

export const BROKEN_LINKS_VIEW_TYPE = "broken-links-view";

export class BrokenLinksView extends ItemView {
    plugin: BrokenLinks;
    fileList: FileListView;

    constructor(leaf: WorkspaceLeaf, plugin: BrokenLinks) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return BROKEN_LINKS_VIEW_TYPE;
    }
    getDisplayText(): string {
        return "Broken Links List";
    }
    getIcon(): string {
        return "unlink";
    }

    async onOpen() {
        this.draw();
    }

    async onClose() {
        this.fileList.$destroy();
    }

    draw() {
        // Set up models for the root
        const folders = new Map<string, FolderModel>();
        const files = new Map<string, FileModel>();

        // Get all the files in the vault
        for (const file of this.app.vault.getMarkdownFiles()) {
            // Use the cache to get determine if there are links in the file
            const meta = this.app.metadataCache.getFileCache(file);
            if (meta?.links) {
                // Create file model before iterating through the links
                // to prevent having to search through structure later
                let fileModel: FileModel = {
                    id: file.name,
                    path: file.path,
                    links: new Map<LinkPosition, LinkModel>(),
                };
                for (const link of meta.links) {
                    const linkPath = getLinkpath(link.link);
                    // Look through the cache to determine if the link goes anywhere
                    const target = this.app.metadataCache.getFirstLinkpathDest(linkPath, file.path);
                    if (target == null) {
                        // Parse the path and build into the folder model
                        const pathParts = file.path.split("/");
                        // Nest in folders collection
                        let parentFolder: FolderModel | null = null;
                        for (let i = 0; i < pathParts.length - 1; i++) {
                            const id = pathParts[i];
                            // If parentFolder is null, add it to the root,
                            // otherwise nest it into the parentFolder
                            if (parentFolder === null) {
                                // Look for existing folder or create
                                // a new one and set it as the parent
                                if (folders.has(id)) {
                                    parentFolder = folders.get(id)!;
                                    // Increment link count
                                    parentFolder.linkCount++;
                                } else {
                                    // Add to root
                                    parentFolder = {
                                        id: id,
                                        folders: new Map<string, FolderModel>(),
                                        files: new Map<string, FileModel>(),
                                        linkCount: 1, // default to 1
                                    };
                                    folders.set(id, parentFolder);
                                }
                            } else {
                                // Look for existing child folder or create
                                // a new one and add it to the parent
                                let childFolder: FolderModel | null = null;
                                if (parentFolder.folders.has(id)) {
                                    childFolder = parentFolder.folders.get(id)!;
                                    // Increment link count
                                    childFolder.linkCount++;
                                } else {
                                    childFolder = {
                                        id: id,
                                        folders: new Map<string, FolderModel>(),
                                        files: new Map<string, FileModel>(),
                                        linkCount: 1, // default to 1
                                    };
                                    parentFolder.folders.set(id, childFolder);
                                }
                                // Set the child folder as the parent and recurse
                                parentFolder = childFolder;
                            }
                        }

                        // Locate file in parentFolder or root
                        if (parentFolder) {
                            if (parentFolder.files.has(file.name)) {
                                fileModel = parentFolder.files.get(file.name)!;
                            } else {
                                parentFolder.files.set(file.name, fileModel);
                            }
                        } else {
                            // File is in the root
                            if (files.has(file.name)) {
                                fileModel = files.get(file.name)!; // eslint-disable-line
                            } else {
                                files.set(file.name, fileModel);
                            }
                        }

                        // Add the link to the file
                        const pos: LinkPosition = { line: link.position.start.line, col: link.position.start.col };
                        if (!fileModel.links.has(pos)) {
                            fileModel.links.set(pos, {
                                id: link.link,
                                parent: fileModel,
                                path: file.path,
                                posotion: link.position,
                            });
                        }
                    }
                }
            }
        }

        this.containerEl.empty();
        this.fileList = new FileListView({
            target: this.containerEl,
            props: {
                folders: folders,
                files: files,
            },
        });
    }
}
