import { Plugin, WorkspaceLeaf } from "obsidian";
import { BROKEN_LINKS_VIEW_TYPE, BrokenLinksView } from "./broken-links-view";
import { BrokenLinksSettingsTab } from "./settings";
import { LinkFilter } from "./models";
import { FileSort, FolderSort, LinkGrouping, LinkSort } from "./enum";

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
}
