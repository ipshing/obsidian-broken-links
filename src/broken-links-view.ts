import { ItemView, Keymap, MarkdownPreviewView, MarkdownView, TFile, WorkspaceLeaf } from "obsidian";
import BrokenLinks from "./main";
import { LinkModel } from "./models";
import FileListView from "./views/file-list.svelte";
import { getLinksByFolder } from "./links";

export const BROKEN_LINKS_VIEW_TYPE = "broken-links-view";

export class BrokenLinksView extends ItemView {
    plugin: BrokenLinks;
    fileList: FileListView;

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
        console.time("Broken Links onOpen");

        const list = await getLinksByFolder(this.plugin);

        this.containerEl.empty();
        this.fileList = new FileListView({
            target: this.containerEl,
            props: {
                plugin: this.plugin,
                folders: list.folders,
                files: list.files,
                linkClicked: this.linkClickedHandler.bind(this),
            },
        });

        // Add callback to update the view when files get changed
        this.registerEvent(this.app.metadataCache.on("resolved", this.updateView.bind(this)));

        console.timeEnd("Broken Links onOpen");
    }

    async onClose() {
        this.fileList.$destroy();
    }

    async updateView() {
        console.time("Broken Links updateView");

        const list = await getLinksByFolder(this.plugin);
        this.fileList.$set({
            folders: list.folders,
            files: list.files,
        });

        console.timeEnd("Broken Links updateView");
    }

    async linkClickedHandler(e: MouseEvent, link: LinkModel) {
        if (!((e.instanceOf(MouseEvent) && e.button !== 0 && e.button !== 1) || e.defaultPrevented)) {
            const file = this.app.vault.getAbstractFileByPath(link.parent.path);
            if (file instanceof TFile) {
                const leaf: WorkspaceLeaf = this.app.workspace.getLeaf(Keymap.isModEvent(e));
                await leaf.openFile(file);
                // Scroll to section and highlight
                if (leaf.view instanceof MarkdownView) {
                    if (leaf.view.currentMode instanceof MarkdownPreviewView) {
                        // @ts-ignore
                        const renderer = leaf.view.currentMode.renderer; // trust me, it's there
                        renderer.onRendered(() => {
                            renderer.applyScroll(link.position.start.line, {
                                center: true,
                                highlight: true,
                            });
                        });
                    } else {
                        leaf.view.editor.scrollIntoView(
                            {
                                from: { line: link.position.start.line, ch: link.position.start.col },
                                to: { line: link.position.end.line, ch: link.position.end.col },
                            },
                            true
                        );
                        leaf.view.editor.setSelection(
                            {
                                line: link.position.start.line,
                                ch: link.position.start.col,
                            },
                            {
                                line: link.position.end.line,
                                ch: link.position.end.col,
                            }
                        );
                    }
                }
            }
        }
    }
}
