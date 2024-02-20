import { App, PluginSettingTab, SearchComponent, Setting } from "obsidian";
import BrokenLinks from "./main";
import { FolderSuggest } from "./utils/folder-suggest";
import IgnoredFoldersList from "./views/settings-ignored-folders.svelte";

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

        this.addLinkSeparationSetting();
        this.addIgnoreFoldersSetting();
    }

    addLinkSeparationSetting() {
        const { containerEl } = this;
        new Setting(containerEl)
            .setName("Consolidate links")
            .setDesc("Links to the same file/heading but with different display names will be grouped together in the link view, resulting in a shorter list.")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.consolidateLinks).onChange(async (value) => {
                    // Update settings
                    this.plugin.settings.consolidateLinks = value;
                    await this.plugin.saveSettings();
                    // Force refresh of broken links panel
                    await this.plugin.updateView();
                    // Refresh settings view
                    this.display();
                });
            });
    }

    addIgnoreFoldersSetting() {
        const { containerEl } = this;
        let search: SearchComponent;

        new Setting(containerEl)
            .setName("Ignore folders")
            .setDesc("Folders (and their subfolders) listed here will not be searched for broken links.")
            .addSearch((comp) => {
                search = comp;
                new FolderSuggest(this.plugin.app, comp.inputEl);
                comp.setPlaceholder("Example: folder 1/folder 2");
            })
            .addExtraButton((comp) => {
                comp.setIcon("plus-circle")
                    .setTooltip("Add folder")
                    .onClick(async () => {
                        if (search) {
                            const folder = search.getValue();
                            if (folder.trim().length > 0) {
                                // If it's already in the list, remove it, then re-add it (effectively moving it to the top)
                                if (this.plugin.settings.ignoredFolders.contains(folder)) {
                                    this.plugin.settings.ignoredFolders.remove(folder);
                                }
                                // Add the folder to the top of the list
                                this.plugin.settings.ignoredFolders.splice(0, 0, folder);
                                // Save the settings
                                await this.plugin.saveSettings();
                                // Force refresh of broken links panel
                                await this.plugin.updateView();
                                // Refresh settings view
                                this.display();
                            }
                        }
                    });
            });

        // List ignored folders
        const folderList = new IgnoredFoldersList({
            target: containerEl,
            props: {
                ignoredFolders: this.plugin.settings.ignoredFolders,
                removeFolder: async (folder) => {
                    this.plugin.settings.ignoredFolders.remove(folder);
                    // Save the settings
                    await this.plugin.saveSettings();
                    // Force refresh of broken links panel
                    await this.plugin.updateView();
                    // Update list
                    folderList.$set({
                        ignoredFolders: this.plugin.settings.ignoredFolders,
                    });
                },
            },
        });
    }
}
