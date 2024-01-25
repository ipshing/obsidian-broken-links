import { ItemView, WorkspaceLeaf } from "obsidian";
import BrokenLinks from "./main";

export const BROKEN_LINKS_VIEW_TYPE = "broken-links-view";

export class BrokenLinksView extends ItemView {
    private readonly plugin: BrokenLinks;

    constructor(leaf: WorkspaceLeaf, plugin: BrokenLinks) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return BROKEN_LINKS_VIEW_TYPE;
    }
    getDisplayText(): string {
        return "Broken Links List";
    }
    getIcon(): string {
        return "unlink";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h4", { text: "Broken Links" });
    }

    async onClose() {}
}
