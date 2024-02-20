import { ItemView, Keymap, MarkdownPreviewView, MarkdownView, Menu, TFile, WorkspaceLeaf, getLinkpath, stripHeading } from "obsidian";
import BrokenLinks from "./main";
import { FileModel, FolderModel, LinkModel, LinkModelGroup } from "./models";
import BrokenLinksTree from "./views/broken-links-tree.svelte";

export const BROKEN_LINKS_VIEW_TYPE = "broken-links-view";

export class BrokenLinksView extends ItemView {
    plugin: BrokenLinks;
    brokenLinks: {
        byFolder: FolderModel;
        byFile: FileModel[];
        byLink: LinkModelGroup[];
    };
    brokenLinksTree: BrokenLinksTree;

    constructor(leaf: WorkspaceLeaf, plugin: BrokenLinks) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return BROKEN_LINKS_VIEW_TYPE;
    }
    getDisplayText(): string {
        return "Broken links list";
    }
    getIcon(): string {
        return "unlink";
    }

    async onOpen() {
        this.brokenLinks = await this.getBrokenLinks();

        this.containerEl.empty();

        this.containerEl.addClass("broken-links");

        this.brokenLinksTree = new BrokenLinksTree({
            target: this.containerEl,
            props: {
                plugin: this.plugin,
                groupBy: this.plugin.settings.groupBy,
                folderTree: this.brokenLinks.byFolder,
                fileTree: this.brokenLinks.byFile,
                linkTree: this.brokenLinks.byLink,
                linkFilter: this.plugin.settings.linkFilter,
                groupByButtonClicked: this.groupByButtonClickedHandler.bind(this),
                sortButtonClicked: this.sortButtonClickedHandler.bind(this),
                updateLinkFilter: this.updateLinkFilterHandler.bind(this),
                folderContextClicked: this.folderContextClickedHandler.bind(this),
                linkClicked: this.linkClickedHandler.bind(this),
            },
        });

        // Add callback to update the view when files get changed
        this.registerEvent(this.app.metadataCache.on("resolved", this.updateView.bind(this)));
    }

    async onClose() {
        this.brokenLinksTree.$destroy();
    }

    async updateView(reloadLinks = true) {
        if (reloadLinks) this.brokenLinks = await this.getBrokenLinks();
        this.brokenLinksTree.$set({
            folderTree: this.brokenLinks.byFolder,
            fileTree: this.brokenLinks.byFile,
            linkTree: this.brokenLinks.byLink,
        });
    }

    async getBrokenLinks(): Promise<{
        byFolder: FolderModel;
        byFile: FileModel[];
        byLink: LinkModelGroup[];
    }> {
        const byFolder: FolderModel = {
            name: "root",
            path: "/",
            folders: [],
            files: [],
            linkCount: 0,
        };
        let byFile: FileModel[] = [];
        let byLink: LinkModelGroup[] = [];

        // Iterate all the files in the vault
        for (const file of this.plugin.app.vault.getMarkdownFiles()) {
            // Check ignored folder list
            if (
                this.plugin.settings.ignoredFolders.find((folder) => {
                    return (file.parent && file.parent.path == "/" && folder == "/") || file.path.startsWith(folder + "/");
                })
            ) {
                continue;
            }

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
                        // Add the link to the file
                        fileModel.links.push(linkModel);
                        // Add to byLink list
                        let group = byLink.find((g) => g.id == linkModel.sortId);
                        if (!group) {
                            group = {
                                id: linkModel.sortId,
                                show: true,
                                links: [],
                            };
                            byLink.push(group);
                        }
                        group.links.push(linkModel);
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
        byFile = this.sortFileTree(byFile);
        // Sort link tree & filter
        byLink = this.sortLinkTree(byLink);
        this.filterLinkTree(byLink);

        return {
            byFolder,
            byFile,
            byLink,
        };
    }

    sortFolderTree(folder: FolderModel) {
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
            if (this.plugin.settings.folderSort == "nameDesc") place *= -1;
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
            this.sortFolderTree(subfolder);
        });
    }

    sortFileTree(files: FileModel[]): FileModel[] {
        // Sort files according to settings
        const sorted = files.sort((a, b) => {
            let place = 0;
            if (this.plugin.settings.fileSort.startsWith("name")) {
                if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) place = -1;
                else if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) place = 1;
                if (this.plugin.settings.fileSort == "nameDesc") place *= -1;
            } else if (this.plugin.settings.fileSort.startsWith("count")) {
                if (a.links.length < b.links.length) place = -1;
                else if (a.links.length > b.links.length) place = 1;
                if (this.plugin.settings.fileSort == "countDesc") place *= -1;
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
        return sorted;
    }

    sortLinkTree(linkGroups: LinkModelGroup[]): LinkModelGroup[] {
        // Sort links according to settings
        const sorted = linkGroups.sort((a, b) => {
            let place = 0;
            if (this.plugin.settings.linkSort.startsWith("name")) {
                if (a.id.toLocaleLowerCase() < b.id.toLocaleLowerCase()) place = -1;
                else if (a.id.toLocaleLowerCase() > b.id.toLocaleLowerCase()) place = 1;
                if (this.plugin.settings.linkSort == "nameDesc") place *= -1;
            } else if (this.plugin.settings.linkSort.startsWith("count")) {
                if (a.links.length < b.links.length) place = -1;
                else if (a.links.length > b.links.length) place = 1;
                if (this.plugin.settings.linkSort == "countDesc") place *= -1;
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
        return sorted;
    }

    filterLinkTree(linkGroups: LinkModelGroup[]) {
        for (const group of linkGroups) {
            group.show = true;
            // get the filter string as an array of each "word"
            const words = this.plugin.settings.linkFilter.filterString.split(" ").filter((s) => s);
            for (const word of words) {
                if (this.plugin.settings.linkFilter.matchCase) {
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

    groupByButtonClickedHandler(e: MouseEvent) {
        const menu = new Menu();
        menu.addItem((item) =>
            item
                .setTitle("Group by folder")
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
                .setTitle("Group by file")
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
                .setTitle("Group by link")
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

    sortButtonClickedHandler(e: MouseEvent) {
        const menu = new Menu();
        if (this.plugin.settings.groupBy == "folder") {
            menu.addItem((item) =>
                item
                    .setTitle("File name (A to Z)")
                    .setChecked(this.plugin.settings.folderSort == "nameAsc")
                    .onClick(async () => {
                        if (this.plugin.settings.folderSort != "nameAsc") {
                            // Update settings
                            this.plugin.settings.folderSort = "nameAsc";
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addItem((item) =>
                item
                    .setTitle("File name (Z to A)")
                    .setChecked(this.plugin.settings.folderSort == "nameDesc")
                    .onClick(async () => {
                        if (this.plugin.settings.folderSort != "nameDesc") {
                            // Update settings
                            this.plugin.settings.folderSort = "nameDesc";
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.showAtMouseEvent(e);
        } else if (this.plugin.settings.groupBy == "file") {
            menu.addItem((item) =>
                item
                    .setTitle("File name (A to Z)")
                    .setChecked(this.plugin.settings.fileSort == "nameAsc")
                    .onClick(async () => {
                        if (this.plugin.settings.fileSort != "nameAsc") {
                            // Update settings
                            this.plugin.settings.fileSort = "nameAsc";
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addItem((item) =>
                item
                    .setTitle("File name (Z to A)")
                    .setChecked(this.plugin.settings.fileSort == "nameDesc")
                    .onClick(async () => {
                        if (this.plugin.settings.fileSort != "nameDesc") {
                            // Update settings
                            this.plugin.settings.fileSort = "nameDesc";
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addSeparator();
            menu.addItem((item) =>
                item
                    .setTitle("Link count (fewest to most)")
                    .setChecked(this.plugin.settings.fileSort == "countAsc")
                    .onClick(async () => {
                        if (this.plugin.settings.fileSort != "countAsc") {
                            // Update settings
                            this.plugin.settings.fileSort = "countAsc";
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addItem((item) =>
                item
                    .setTitle("Link count (most to fewest)")
                    .setChecked(this.plugin.settings.fileSort == "countDesc")
                    .onClick(async () => {
                        if (this.plugin.settings.fileSort != "countDesc") {
                            // Update settings
                            this.plugin.settings.fileSort = "countDesc";
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.showAtMouseEvent(e);
        } else if (this.plugin.settings.groupBy == "link") {
            menu.addItem((item) =>
                item
                    .setTitle("File name (A to Z)")
                    .setChecked(this.plugin.settings.linkSort == "nameAsc")
                    .onClick(async () => {
                        if (this.plugin.settings.linkSort != "nameAsc") {
                            // Update settings
                            this.plugin.settings.linkSort = "nameAsc";
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addItem((item) =>
                item
                    .setTitle("File name (Z to A)")
                    .setChecked(this.plugin.settings.linkSort == "nameDesc")
                    .onClick(async () => {
                        if (this.plugin.settings.linkSort != "nameDesc") {
                            // Update settings
                            this.plugin.settings.linkSort = "nameDesc";
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addSeparator();
            menu.addItem((item) =>
                item
                    .setTitle("Link count (fewest to most)")
                    .setChecked(this.plugin.settings.linkSort == "countAsc")
                    .onClick(async () => {
                        if (this.plugin.settings.linkSort != "countAsc") {
                            // Update settings
                            this.plugin.settings.linkSort = "countAsc";
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addItem((item) =>
                item
                    .setTitle("Link count (most to fewest)")
                    .setChecked(this.plugin.settings.linkSort == "countDesc")
                    .onClick(async () => {
                        if (this.plugin.settings.linkSort != "countDesc") {
                            // Update settings
                            this.plugin.settings.linkSort = "countDesc";
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.showAtMouseEvent(e);
        }
    }

    async updateLinkFilterHandler(filterString: string, matchCase: boolean) {
        this.plugin.settings.linkFilter.filterString = filterString;
        this.plugin.settings.linkFilter.matchCase = matchCase;
        await this.plugin.saveSettings();
        this.filterLinkTree(this.brokenLinks.byLink);
        this.updateView(false);
    }

    async folderContextClickedHandler(e: MouseEvent, el: HTMLElement) {
        const menu = new Menu();
        menu.addItem((item) => {
            item.setTitle("Expand all children")
                .setIcon("chevrons-up-down")
                .onClick(async () => {
                    const folder = this.getFolderFromElement(el);
                    if (folder) {
                        // Expand folder and all children
                        this.toggleExpand(folder, true);
                        // Set expand button to collapse
                        this.plugin.settings.expandButton = false;
                        // Save settings
                        await this.plugin.saveSettings();
                        // Update broken links tree
                        await this.updateView(false);
                    }
                });
        });
        menu.addItem((item) => {
            item.setTitle("Collapse all children")
                .setIcon("chevrons-down-up")
                .onClick(async () => {
                    const folder = this.getFolderFromElement(el);
                    if (folder) {
                        // Collapse folder and all children
                        this.toggleExpand(folder, false);
                        // Save settings
                        await this.plugin.saveSettings();
                        // Update broken links tree
                        await this.updateView(false);
                    }
                });
        });
        menu.showAtMouseEvent(e);
    }

    getFolderFromElement(el: HTMLElement): FolderModel | undefined {
        // Get folder path
        const path = el.getAttr("data-path") ?? "";
        // Split into parts
        const parts = path.split("/");
        // Dive into model until the bottom folder is found
        let folder = this.brokenLinks.byFolder.folders.find((f) => f.name == parts[0]);
        for (let i = 1; i < parts.length; i++) {
            if (folder) {
                folder = folder.folders.find((f) => f.name == parts[i]);
            }
        }
        return folder;
    }

    toggleExpand(folder: FolderModel, expand: boolean) {
        if (expand) {
            this.plugin.settings.expandedFolderItems.push(folder.path);
        } else {
            this.plugin.settings.expandedFolderItems.remove(folder.path);
        }
        for (const file of folder.files) {
            if (expand) {
                this.plugin.settings.expandedFolderItems.push(file.path);
            } else {
                this.plugin.settings.expandedFolderItems.remove(file.path);
            }
        }
        // Recurse for subfolders
        for (const subfolder of folder.folders) {
            this.toggleExpand(subfolder, expand);
        }
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
