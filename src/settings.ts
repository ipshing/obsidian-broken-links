import { App, PluginSettingTab } from "obsidian";
import BrokenLinks from "./main";

export class BrokenLinksSettingsTab extends PluginSettingTab {
    plugin: BrokenLinks;

    constructor(app: App, plugin: BrokenLinks) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.addClass("broken-links-settings");
    }
}
