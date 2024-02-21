import { ItemView, Keymap, MarkdownPreviewView, MarkdownView, Menu, TFile, WorkspaceLeaf } from "obsidian";
import BrokenLinks from "./main";
import { BrokenLinksModel, FolderModel, LinkModel } from "./models";
import BrokenLinksTree from "./views/broken-links-tree.svelte";
import { filterLinkTree, getBrokenLinks } from "./links";
import { FileSort, FolderSort, LinkGrouping, LinkSort } from "./enum";

export const BROKEN_LINKS_VIEW_TYPE = "broken-links-view";

export class BrokenLinksView extends ItemView {
    plugin: BrokenLinks;
    brokenLinks: BrokenLinksModel;
    brokenLinksTree: BrokenLinksTree;

    constructor(leaf: WorkspaceLeaf, plugin: BrokenLinks) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return BROKEN_LINKS_VIEW_TYPE;
    }
    getDisplayText(): string {
        return "Broken links";
    }
    getIcon(): string {
        return "unlink";
    }

    async onOpen() {
        this.brokenLinks = await getBrokenLinks(this.plugin);

        this.containerEl.empty();

        this.containerEl.addClass("broken-links");

        this.brokenLinksTree = new BrokenLinksTree({
            target: this.containerEl,
            props: {
                plugin: this.plugin,
                brokenLinks: this.brokenLinks,
                groupBy: this.plugin.settings.groupBy,
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
        if (reloadLinks) this.brokenLinks = await getBrokenLinks(this.plugin);
        this.brokenLinksTree.$set({
            brokenLinks: this.brokenLinks,
        });
    }

    groupByButtonClickedHandler(e: MouseEvent) {
        const menu = new Menu();
        menu.addItem((item) =>
            item
                .setTitle("Group by folder")
                .setIcon("lucide-folder")
                .onClick(async () => {
                    if (this.plugin.settings.groupBy != LinkGrouping.ByFolder) {
                        this.plugin.settings.groupBy = LinkGrouping.ByFolder;
                        this.brokenLinksTree.$set({
                            groupBy: LinkGrouping.ByFolder,
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
                    if (this.plugin.settings.groupBy != LinkGrouping.ByFile) {
                        this.plugin.settings.groupBy = LinkGrouping.ByFile;
                        this.brokenLinksTree.$set({
                            groupBy: LinkGrouping.ByFile,
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
                    if (this.plugin.settings.groupBy != LinkGrouping.ByLink) {
                        this.plugin.settings.groupBy = LinkGrouping.ByLink;
                        this.brokenLinksTree.$set({
                            groupBy: LinkGrouping.ByLink,
                        });
                        await this.plugin.saveSettings();
                    }
                })
        );
        menu.showAtMouseEvent(e);
    }

    sortButtonClickedHandler(e: MouseEvent) {
        const menu = new Menu();
        if (this.plugin.settings.groupBy == LinkGrouping.ByFolder) {
            menu.addItem((item) =>
                item
                    .setTitle("File name (A to Z)")
                    .setChecked(this.plugin.settings.folderSort == FolderSort.NameAsc)
                    .onClick(async () => {
                        if (this.plugin.settings.folderSort != FolderSort.NameAsc) {
                            // Update settings
                            this.plugin.settings.folderSort = FolderSort.NameAsc;
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addItem((item) =>
                item
                    .setTitle("File name (Z to A)")
                    .setChecked(this.plugin.settings.folderSort == FolderSort.NameDesc)
                    .onClick(async () => {
                        if (this.plugin.settings.folderSort != FolderSort.NameDesc) {
                            // Update settings
                            this.plugin.settings.folderSort = FolderSort.NameDesc;
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.showAtMouseEvent(e);
        } else if (this.plugin.settings.groupBy == LinkGrouping.ByFile) {
            menu.addItem((item) =>
                item
                    .setTitle("File name (A to Z)")
                    .setChecked(this.plugin.settings.fileSort == FileSort.NameAsc)
                    .onClick(async () => {
                        if (this.plugin.settings.fileSort != FileSort.NameAsc) {
                            // Update settings
                            this.plugin.settings.fileSort = FileSort.NameAsc;
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addItem((item) =>
                item
                    .setTitle("File name (Z to A)")
                    .setChecked(this.plugin.settings.fileSort == FileSort.NameDesc)
                    .onClick(async () => {
                        if (this.plugin.settings.fileSort != FileSort.NameDesc) {
                            // Update settings
                            this.plugin.settings.fileSort = FileSort.NameDesc;
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
                    .setChecked(this.plugin.settings.fileSort == FileSort.CountAsc)
                    .onClick(async () => {
                        if (this.plugin.settings.fileSort != FileSort.CountAsc) {
                            // Update settings
                            this.plugin.settings.fileSort = FileSort.CountAsc;
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addItem((item) =>
                item
                    .setTitle("Link count (most to fewest)")
                    .setChecked(this.plugin.settings.fileSort == FileSort.CountDesc)
                    .onClick(async () => {
                        if (this.plugin.settings.fileSort != FileSort.CountDesc) {
                            // Update settings
                            this.plugin.settings.fileSort = FileSort.CountDesc;
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.showAtMouseEvent(e);
        } else if (this.plugin.settings.groupBy == LinkGrouping.ByLink) {
            menu.addItem((item) =>
                item
                    .setTitle("File name (A to Z)")
                    .setChecked(this.plugin.settings.linkSort == LinkSort.NameAsc)
                    .onClick(async () => {
                        if (this.plugin.settings.linkSort != LinkSort.NameAsc) {
                            // Update settings
                            this.plugin.settings.linkSort = LinkSort.NameAsc;
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addItem((item) =>
                item
                    .setTitle("File name (Z to A)")
                    .setChecked(this.plugin.settings.linkSort == LinkSort.NameDesc)
                    .onClick(async () => {
                        if (this.plugin.settings.linkSort != LinkSort.NameDesc) {
                            // Update settings
                            this.plugin.settings.linkSort = LinkSort.NameDesc;
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
                    .setChecked(this.plugin.settings.linkSort == LinkSort.CountAsc)
                    .onClick(async () => {
                        if (this.plugin.settings.linkSort != LinkSort.CountAsc) {
                            // Update settings
                            this.plugin.settings.linkSort = LinkSort.CountAsc;
                            await this.plugin.saveSettings();
                            // Refresh links list
                            await this.updateView();
                        }
                    })
            );
            menu.addItem((item) =>
                item
                    .setTitle("Link count (most to fewest)")
                    .setChecked(this.plugin.settings.linkSort == LinkSort.CountDesc)
                    .onClick(async () => {
                        if (this.plugin.settings.linkSort != LinkSort.CountDesc) {
                            // Update settings
                            this.plugin.settings.linkSort = LinkSort.CountDesc;
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
        filterLinkTree(this.brokenLinks.byLink, this.plugin.settings.linkFilter);
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
                        leaf.view.editor.scrollIntoView(
                            {
                                from: { line: link.position.start.line, ch: link.position.start.col },
                                to: { line: link.position.end.line, ch: link.position.end.col },
                            },
                            true
                        );
                    }
                }
            }
        }
    }
}
