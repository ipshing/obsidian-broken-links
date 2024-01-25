import { Plugin } from "obsidian";

interface BrokenLinksSettings {}

const DEFAULT_SETTINGS: BrokenLinksSettings = {};

export default class BrokenLinks extends Plugin {
    settings: BrokenLinksSettings;

    async onload() {
        await this.loadSettings();

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
