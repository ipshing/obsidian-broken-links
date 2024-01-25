import { Plugin, WorkspaceLeaf } from "obsidian";
import { BrokenLinksSettingsTab } from "./settings";
import { BROKEN_LINKS_VIEW_TYPE, BrokenLinksView } from "./broken-links-view";

interface BrokenLinksSettings {
    showRibbonIcon: boolean;
}

const DEFAULT_SETTINGS: BrokenLinksSettings = {
    showRibbonIcon: true,
};

export default class BrokenLinks extends Plugin {
    settings: BrokenLinksSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(BROKEN_LINKS_VIEW_TYPE, (leaf) => new BrokenLinksView(leaf, this));

        if (this.settings.showRibbonIcon) {
            this.addRibbonIcon("unlink", "Open Broken Links list", () => {
                this.activateView();
            });
        }

        this.addCommand({
            id: "list",
            name: "Open Broken Links list",
            callback: () => {
                this.activateView();
            },
        });

        this.addSettingTab(new BrokenLinksSettingsTab(this.app, this));

        console.log("Broken Links plugin loaded");
    }

    onunload() {
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
}
