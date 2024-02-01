import { App, PluginSettingTab, Setting } from "obsidian";
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

        new Setting(containerEl)
            .setName("Show ribbon icon")
            .setDesc("Add an icon in the ribbon toolbar that opens the Broken Links panel. Changes require a reload to take effect.")
            .addToggle((toggle) => {
                // Set the value from the plugin settings
                toggle.setValue(this.plugin.settings.showRibbonIcon);
                // Set up onChange handler
                toggle.onChange(async (value) => {
                    // Update settings with new value
                    this.plugin.settings.showRibbonIcon = value;
                    // Save settings
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName("Deep scan")
            .setDesc(
                "For links to heading/blocks, check not just if the file exists, but also if the heading/block exists. This can have a significant impact on performance depending on the size/contents of your vault. Changing this setting will force a refresh of the Broken Links panel."
            )
            .addToggle((toggle) => {
                // Set the value from the plugin settings
                toggle.setValue(this.plugin.settings.deepScan);
                // Set up onChange handler
                toggle.onChange(async (value) => {
                    // Update settings with new value
                    this.plugin.settings.deepScan = value;
                    // Save settings
                    await this.plugin.saveSettings();
                    await this.plugin.updateView();
                });
            });
    }
}
