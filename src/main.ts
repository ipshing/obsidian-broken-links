import { Plugin, WorkspaceLeaf } from "obsidian";
import { BROKEN_LINKS_VIEW_TYPE, BrokenLinksView } from "./broken-links-view";

interface BrokenLinksSettings {
    showRibbonIcon: boolean;
    groupBy: "folder" | "file" | "link";
    expandButton: boolean;
    expandedFolderItems: string[];
    expandedFileItems: string[];
    expandedLinkItems: string[];
    folderSort: "nameAsc" | "nameDesc";
    fileSort: "nameAsc" | "nameDesc" | "countAsc" | "countDesc";
    linkSort: "nameAsc" | "nameDesc" | "countAsc" | "countDesc";
}

const DEFAULT_SETTINGS: BrokenLinksSettings = {
    showRibbonIcon: true,
    groupBy: "folder",
    expandButton: true,
    expandedFolderItems: [],
    expandedFileItems: [],
    expandedLinkItems: [],
    folderSort: "nameAsc",
    fileSort: "countDesc",
    linkSort: "countDesc",
};

export default class BrokenLinks extends Plugin {
    settings: BrokenLinksSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(BROKEN_LINKS_VIEW_TYPE, (leaf) => new BrokenLinksView(leaf, this));

        if (this.settings.showRibbonIcon) {
            this.addRibbonIcon("unlink", "View broken links", () => {
                this.activateView();
            });
        }

        this.addCommand({
            id: "list",
            name: "View broken links",
            callback: () => {
                this.activateView();
            },
        });

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
