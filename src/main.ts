import { Plugin } from "obsidian";
import { BrokenLinksSettingsTab } from "./settings";

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

        if (this.settings.showRibbonIcon) {
            this.addRibbonIcon("unlink", "Open Broken Links list", () => {});
        }

        this.addCommand({
            id: "list",
            name: "Open Broken Links list",
            callback: () => {},
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
}
