import { ItemView, Keymap, MarkdownPreviewView, MarkdownView, Menu, TFile, WorkspaceLeaf, getLinkpath } from "obsidian";
import BrokenLinks from "./main";
import { FileModel, FolderModel, LinkModel } from "./models";
import BrokenLinksTree from "./views/broken-links-tree.svelte";

export const BROKEN_LINKS_VIEW_TYPE = "broken-links-view";

export class BrokenLinksView extends ItemView {
    plugin: BrokenLinks;
    brokenLinksTree: BrokenLinksTree;

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
        console.time("Broken Links onOpen");

        const links = await this.getBrokenLinks();

        this.containerEl.empty();

        this.brokenLinksTree = new BrokenLinksTree({
            target: this.containerEl,
            props: {
                plugin: this.plugin,
                groupBy: this.plugin.settings.groupBy,
                folderTree: links.byFolder,
                fileTree: links.byFile,
                linkTree: links.byLink,
                groupByClicked: this.groupClickedHandler.bind(this),
                linkClicked: this.linkClickedHandler.bind(this),
            },
        });

        // Add callback to update the view when files get changed
        this.registerEvent(this.app.metadataCache.on("resolved", this.updateView.bind(this)));

        console.timeEnd("Broken Links onOpen");
    }

    async onClose() {
        this.brokenLinksTree.$destroy();
    }

    async updateView() {
        console.time("Broken Links updateView");

        const links = await this.getBrokenLinks();
        this.brokenLinksTree.$set({
            folderTree: links.byFolder,
            fileTree: links.byFile,
            linkTree: links.byLink,
        });

        console.timeEnd("Broken Links updateView");
    }

    async getBrokenLinks(): Promise<{
        byFolder: FolderModel;
        byFile: FileModel[];
        byLink: LinkModel[][];
    }> {
        const byFolder: FolderModel = {
            name: "root",
            path: "/",
            folders: [],
            files: [],
            linkCount: 0,
        };
        let byFile: FileModel[] = [];
        let byLink: LinkModel[][] = new Array<LinkModel[]>();

        // Iterate all the files in the vault
        for (const file of this.plugin.app.vault.getMarkdownFiles()) {
            // Use the cache to get determine if there are links in the file
            const fileCache = this.plugin.app.metadataCache.getFileCache(file);
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
                    const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(linkPath, file.path);
                    // Default behavior is to mark link as broken if no destination is found
                    let destIsMissing = dest == null;
                    // If there is a destination file, check for missing blocks/headings
                    if (dest != null && link.link.contains("#")) {
                        const targetCache = this.plugin.app.metadataCache.getFileCache(dest);
                        if (link.link.contains("^") && targetCache?.blocks) {
                            const block = link.link.slice(link.link.indexOf("^") + 1);
                            destIsMissing = targetCache.blocks[block] == undefined;
                        } else if (targetCache?.headings) {
                            const heading = link.link.slice(link.link.indexOf("#") + 1);
                            destIsMissing =
                                targetCache.headings.find((value) => {
                                    if (value.heading == heading || value.heading.replace(":", "") == heading) {
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
                            parent: fileModel,
                            position: link.position,
                        };
                        // Add the link to the file
                        fileModel.links.push(linkModel);
                        // Add to byLink list
                        let linkList: LinkModel[] | null =
                            byLink.find((arr) => {
                                if (arr.length > 0 && arr[0].id == linkModel.id) {
                                    return arr;
                                }
                            }) ?? null;
                        if (linkList == null) {
                            linkList = [];
                            byLink.push(linkList);
                        }
                        linkList.push(linkModel);
                    }
                }

                if (fileModel.links.length > 0) {
                    byFile.push(fileModel);
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
                                    byFolder.folders.find((f) => {
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
                                    byFolder.folders.push(parentFolder);
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
                            byFolder.files.push(fileModel);
                        }
                    }
                }
            }
        }

        // Sort folder tree
        this.sortFolderTree(byFolder);
        // Sort file tree
        byFile = byFile.sort((a, b) => {
            if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) return -1;
            else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) return 1;
            else return 0;
        });
        byFile.forEach((file) => {
            file.links = file.links.sort((a, b) => {
                if (a.position.start.offset < b.position.start.offset) return -1;
                else if (a.position.start.offset > b.position.start.offset) return 1;
                else return 0;
            });
        });
        // Sort link tree
        byLink = byLink.sort((a, b) => {
            if (a[0].id.toLocaleLowerCase() < b[0].id.toLocaleLowerCase()) return -1;
            else if (a[0].id.toLocaleLowerCase() > b[0].id.toLocaleLowerCase()) return 1;
            else return 0;
        });
        for (let i = 0; i < byLink.length; i++) {
            byLink[i] = byLink[i].sort((a, b) => {
                if (a.parent.path.toLocaleLowerCase() < b.parent.path.toLocaleLowerCase()) return -1;
                if (a.parent.path.toLocaleLowerCase() > b.parent.path.toLocaleLowerCase()) return 1;
                else return 0;
            });
        }

        return {
            byFolder,
            byFile,
            byLink,
        };
    }

    sortFolderTree(folder: FolderModel) {
        // Sort folders
        folder.folders = folder.folders.sort((a, b) => {
            if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) return -1;
            else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) return 1;
            else return 0;
        });
        // Sort files
        folder.files = folder.files.sort((a, b) => {
            if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) return -1;
            else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) return 1;
            else return 0;
        });
        // Sort links
        folder.files.forEach((file) => {
            file.links = file.links.sort((a, b) => {
                if (a.position.start.offset < b.position.start.offset) return -1;
                else if (a.position.start.offset > b.position.start.offset) return 1;
                else return 0;
            });
        });

        // Recurse through subfolders
        folder.folders.forEach((subfolder) => {
            this.sortFolderTree(subfolder);
        });
    }

    groupClickedHandler(e: MouseEvent) {
        const menu = new Menu();
        menu.addItem((item) =>
            item
                .setTitle("Group by Folder")
                .setIcon("lucide-folder")
                .onClick(async () => {
                    if (this.plugin.settings.groupBy != "folder") {
                        this.plugin.settings.groupBy = "folder";
                        this.brokenLinksTree.$set({
                            groupBy: "folder",
                        });
                        await this.plugin.saveSettings();
                    }
                })
        );
        menu.addItem((item) =>
            item
                .setTitle("Group by File")
                .setIcon("lucide-file")
                .onClick(async () => {
                    if (this.plugin.settings.groupBy != "file") {
                        this.plugin.settings.groupBy = "file";
                        this.brokenLinksTree.$set({
                            groupBy: "file",
                        });
                        await this.plugin.saveSettings();
                    }
                })
        );
        menu.addItem((item) =>
            item
                .setTitle("Group by Link")
                .setIcon("lucide-link")
                .onClick(async () => {
                    if (this.plugin.settings.groupBy != "link") {
                        this.plugin.settings.groupBy = "link";
                        this.brokenLinksTree.$set({
                            groupBy: "link",
                        });
                        await this.plugin.saveSettings();
                    }
                })
        );
        menu.showAtMouseEvent(e);
    }

    async linkClickedHandler(e: MouseEvent, link: LinkModel) {
        if (!((e.instanceOf(MouseEvent) && e.button !== 0 && e.button !== 1) || e.defaultPrevented)) {
            const file = this.app.vault.getAbstractFileByPath(link.parent.path);
            if (file instanceof TFile) {
                const leaf: WorkspaceLeaf = this.app.workspace.getLeaf(Keymap.isModEvent(e));
                await leaf.openFile(file);
                // Scroll to section and highlight
                if (leaf.view instanceof MarkdownView) {
                    if (leaf.view.currentMode instanceof MarkdownPreviewView) {
                        // @ts-ignore
                        const renderer = leaf.view.currentMode.renderer; // trust me, it's there
                        renderer.onRendered(() => {
                            renderer.applyScroll(link.position.start.line, {
                                center: true,
                                highlight: true,
                            });
                        });
                    } else {
                        leaf.view.editor.scrollIntoView(
                            {
                                from: { line: link.position.start.line, ch: link.position.start.col },
                                to: { line: link.position.end.line, ch: link.position.end.col },
                            },
                            true
                        );
                        leaf.view.editor.setSelection(
                            {
                                line: link.position.start.line,
                                ch: link.position.start.col,
                            },
                            {
                                line: link.position.end.line,
                                ch: link.position.end.col,
                            }
                        );
                    }
                }
            }
        }
    }
}
