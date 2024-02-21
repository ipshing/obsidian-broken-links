import { Plugin, WorkspaceLeaf } from "obsidian";
import { BROKEN_LINKS_VIEW_TYPE, BrokenLinksView } from "./broken-links-view";
import { BrokenLinksSettingsTab } from "./settings";
import { LinkFilter } from "./models";
import { FileSort, FolderSort, LinkGrouping, LinkSort } from "./enum";
import { lt, valid } from "semver";

interface BrokenLinksSettings {
    version: string;
    groupBy: LinkGrouping;
    expandButton: boolean;
    expandedFolderItems: string[];
    expandedFileItems: string[];
    expandedLinkItems: string[];
    folderSort: FolderSort;
    fileSort: FileSort;
    linkSort: LinkSort;
    linkFilter: LinkFilter;
    ignoredFolders: string[];
    consolidateLinks: boolean;
}

const DEFAULT_SETTINGS: BrokenLinksSettings = {
    version: "",
    groupBy: LinkGrouping.ByFolder,
    expandButton: true,
    expandedFolderItems: [],
    expandedFileItems: [],
    expandedLinkItems: [],
    folderSort: FolderSort.NameAsc,
    fileSort: FileSort.CountDesc,
    linkSort: LinkSort.CountDesc,
    linkFilter: {
        filterString: "",
        matchCase: false,
    },
    ignoredFolders: [],
    consolidateLinks: false,
};

export default class BrokenLinks extends Plugin {
    settings: BrokenLinksSettings;

    async onload() {
        await this.loadSettings();
        await this.runSettingsVersionCheck();

        this.registerView(BROKEN_LINKS_VIEW_TYPE, (leaf) => new BrokenLinksView(leaf, this));

        this.addRibbonIcon("unlink", "View broken links", () => {
            this.activateView();
        });

        this.addCommand({
            id: "list",
            name: "View broken links",
            callback: () => {
                this.activateView();
            },
        });

        this.addSettingTab(new BrokenLinksSettingsTab(this.app, this));

        console.log("Broken Links plugin loaded");
    }

    async onunload() {
        console.log("Broken Links plugin unloaded");
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(BROKEN_LINKS_VIEW_TYPE);
        if (leaves.length > 0) {
            // A leaf with the Broken Links view already exists, use that
            leaf = leaves[0];
        } else {
            // The view could not be found in the workspace,
            // create a new leaf in the right sidebar
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({ type: BROKEN_LINKS_VIEW_TYPE, active: true });
        }

        // Show the leaf in case it is in a collapsed sidebar
        workspace.revealLeaf(leaf);
    }

    async updateView() {
        this.app.workspace.getLeavesOfType(BROKEN_LINKS_VIEW_TYPE).forEach(async (leaf) => {
            if (leaf.view instanceof BrokenLinksView) {
                await leaf.view.updateView();
            }
        });
    }

    async runSettingsVersionCheck() {
        // Check previous version
        if (!valid(this.settings.version)) this.settings.version = "0.0.0";
        if (lt(this.settings.version, this.manifest.version)) {
            // Changes to settings in 1.2.0
            if (lt(this.settings.version, "1.2.0")) {
                switch (this.settings.groupBy as unknown as string) {
                    case "folder":
                    default:
                        this.settings.groupBy = LinkGrouping.ByFolder;
                        break;
                    case "file":
                        this.settings.groupBy = LinkGrouping.ByFile;
                        break;
                    case "link":
                        this.settings.groupBy = LinkGrouping.ByLink;
                        break;
                }
                switch (this.settings.folderSort as unknown as string) {
                    case "nameAsc":
                    default:
                        this.settings.folderSort = FolderSort.NameAsc;
                        break;
                    case "nameDesc":
                        this.settings.folderSort = FolderSort.NameDesc;
                        break;
                }
                switch (this.settings.fileSort as unknown as string) {
                    case "nameAsc":
                        this.settings.fileSort = FileSort.NameAsc;
                        break;
                    case "nameDesc":
                        this.settings.fileSort = FileSort.NameDesc;
                        break;
                    case "countAsc":
                        this.settings.fileSort = FileSort.CountAsc;
                        break;
                    case "countDesc":
                    default:
                        this.settings.fileSort = FileSort.CountDesc;
                        break;
                }
                switch (this.settings.linkSort as unknown as string) {
                    case "nameAsc":
                        this.settings.linkSort = LinkSort.NameAsc;
                        break;
                    case "nameDesc":
                        this.settings.linkSort = LinkSort.NameDesc;
                        break;
                    case "countAsc":
                        this.settings.linkSort = LinkSort.CountAsc;
                        break;
                    case "countDesc":
                    default:
                        this.settings.linkSort = LinkSort.CountDesc;
                        break;
                }
            }
            // Set version in settings to current version
            this.settings.version = this.manifest.version;
            // Save settings
            await this.saveSettings();
        }
    }
}
