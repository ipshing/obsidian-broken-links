import { ItemView, Keymap, MarkdownPreviewView, MarkdownView, Menu, TFile, WorkspaceLeaf } from "obsidian";
import BrokenLinks from "./main";
import { BrokenLinksModel, LinkModel } from "./models";
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
                expandButtonClicked: this.expandButtonClickedHandler.bind(this),
                expandableItemClicked: this.expandableItemClickedHandler.bind(this),
                folderContextClicked: this.folderContextClickedHandler.bind(this),
                updateLinkFilter: this.updateLinkFilterHandler.bind(this),
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
                .setChecked(this.plugin.settings.groupBy == LinkGrouping.ByFolder)
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
                .setChecked(this.plugin.settings.groupBy == LinkGrouping.ByFile)
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
                .setChecked(this.plugin.settings.groupBy == LinkGrouping.ByLink)
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

    async expandButtonClickedHandler(e: MouseEvent, el: HTMLElement) {
        if (this.plugin.settings.groupBy == LinkGrouping.ByFolder) {
            if (this.plugin.settings.expandedFolderItems.length == 0) {
                el.querySelectorAll(".nav-folder, .nav-file").forEach((child) => {
                    this.plugin.settings.expandedFolderItems.push(child.id);
                });
            } else {
                this.plugin.settings.expandedFolderItems = [];
            }
        } else if (this.plugin.settings.groupBy == LinkGrouping.ByFile) {
            if (this.plugin.settings.expandedFileItems.length == 0) {
                el.querySelectorAll(".nav-file").forEach((child) => {
                    this.plugin.settings.expandedFileItems.push(child.id);
                });
            } else {
                this.plugin.settings.expandedFileItems = [];
            }
        } else if (this.plugin.settings.groupBy == LinkGrouping.ByLink) {
            if (this.plugin.settings.expandedLinkItems.length == 0) {
                el.querySelectorAll(".nav-link-group").forEach((child) => {
                    this.plugin.settings.expandedLinkItems.push(child.id);
                });
            } else {
                this.plugin.settings.expandedLinkItems = [];
            }
        }
        // Save settings
        await this.plugin.saveSettings();
        // Update broken links tree
        await this.updateView(false);
    }

    async expandableItemClickedHandler(e: MouseEvent, el: HTMLElement) {
        if (this.plugin.settings.groupBy == LinkGrouping.ByFolder) {
            if (this.plugin.settings.expandedFolderItems.contains(el.id)) {
                this.plugin.settings.expandedFolderItems.remove(el.id);
            } else {
                this.plugin.settings.expandedFolderItems.push(el.id);
            }
        } else if (this.plugin.settings.groupBy == LinkGrouping.ByFile) {
            if (this.plugin.settings.expandedFileItems.contains(el.id)) {
                this.plugin.settings.expandedFileItems.remove(el.id);
            } else {
                this.plugin.settings.expandedFileItems.push(el.id);
            }
        } else if (this.plugin.settings.groupBy == LinkGrouping.ByLink) {
            if (this.plugin.settings.expandedLinkItems.contains(el.id)) {
                this.plugin.settings.expandedLinkItems.remove(el.id);
            } else {
                this.plugin.settings.expandedLinkItems.push(el.id);
            }
        }
        // Save settings
        await this.plugin.saveSettings();
        // Update broken links tree
        await this.updateView(false);
    }

    async folderContextClickedHandler(e: MouseEvent, el: HTMLElement) {
        const menu = new Menu();
        menu.addItem((item) => {
            item.setTitle("Expand all children")
                .setIcon("chevrons-up-down")
                .onClick(async () => {
                    // Expand selected item
                    this.plugin.settings.expandedFolderItems.push(el.id);
                    // Expand children
                    el.querySelectorAll(".nav-folder, .nav-file").forEach((child) => {
                        this.plugin.settings.expandedFolderItems.push(child.id);
                    });
                    // Save settings
                    await this.plugin.saveSettings();
                    // Update broken links tree
                    await this.updateView(false);
                });
        });
        menu.addItem((item) => {
            item.setTitle("Collapse all children")
                .setIcon("chevrons-down-up")
                .onClick(async () => {
                    // Collapse selected item
                    this.plugin.settings.expandedFolderItems.remove(el.id);
                    // Collapse children
                    el.querySelectorAll(".nav-folder, .nav-file").forEach((child) => {
                        this.plugin.settings.expandedFolderItems.remove(child.id);
                    });
                    // Save settings
                    await this.plugin.saveSettings();
                    // Update broken links tree
                    await this.updateView(false);
                });
        });
        menu.showAtMouseEvent(e);
    }

    async updateLinkFilterHandler(filterString: string, matchCase: boolean) {
        this.plugin.settings.linkFilter.filterString = filterString;
        this.plugin.settings.linkFilter.matchCase = matchCase;
        await this.plugin.saveSettings();
        filterLinkTree(this.brokenLinks.byLink, this.plugin.settings.linkFilter);
        this.updateView(false);
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
                        // Exclude frontmatter links for now
                        if (!link.key) {
                            // Update start/end col to highlight only the link text
                            const colStart = link.position.start.col + link.fullText.indexOf(link.id);
                            const colEnd = colStart + link.id.length;
                            leaf.view.editor.setSelection(
                                {
                                    line: link.position.start.line,
                                    ch: colStart,
                                },
                                {
                                    line: link.position.end.line,
                                    ch: colEnd,
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
}
