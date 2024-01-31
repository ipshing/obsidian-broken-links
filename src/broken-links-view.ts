import { ItemView, Keymap, MarkdownPreviewView, MarkdownView, TFile, WorkspaceLeaf, getLinkpath } from "obsidian";
import BrokenLinks from "./main";
import { FolderModel, FileModel, LinkModel, LinkPosition } from "./models";
import FileListView from "./views/file-list.svelte";

export const BROKEN_LINKS_VIEW_TYPE = "broken-links-view";

export class BrokenLinksView extends ItemView {
    plugin: BrokenLinks;
    fileList: FileListView;

    constructor(leaf: WorkspaceLeaf, plugin: BrokenLinks) {
        super(leaf);
        this.plugin = plugin;
        // Bind "this" to methods for callbacks
        this.updateView = this.updateView.bind(this);
        this.linkClickedHandler = this.linkClickedHandler.bind(this);
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

        const list = this.getLinks();

        this.containerEl.empty();
        this.fileList = new FileListView({
            target: this.containerEl,
            props: {
                folders: list.folders,
                files: list.files,
                linkClicked: this.linkClickedHandler,
            },
        });

        // Handles file contents being updated
        this.registerEvent(this.app.metadataCache.on("changed", this.updateView));
        // Handles new files being created/deleted
        this.registerEvent(this.app.metadataCache.on("resolved", this.updateView));

        console.timeEnd("Broken Links onOpen");
    }

    async onClose() {
        this.fileList.$destroy();
    }

    async updateView() {
        console.time("Broken Links updateView");

        const list = this.getLinks();
        this.fileList.$set({
            folders: list.folders,
            files: list.files,
        });

        console.timeEnd("Broken Links updateView");
    }

    getLinks(): { folders: Map<string, FolderModel>; files: Map<string, FileModel> } {
        // Set up models for the root
        const folders = new Map<string, FolderModel>();
        const files = new Map<string, FileModel>();

        // Get all the files in the vault
        for (const file of this.app.vault.getMarkdownFiles()) {
            // Use the cache to get determine if there are links in the file
            const meta = this.app.metadataCache.getFileCache(file);
            if (meta?.links) {
                // Create file model before iterating through the links
                // to prevent having to search through structure later
                let fileModel: FileModel = {
                    id: file.name,
                    path: file.path,
                    links: new Map<LinkPosition, LinkModel>(),
                };
                for (const link of meta.links) {
                    const linkPath = getLinkpath(link.link);
                    // Look through the cache to determine if the link goes anywhere
                    const target = this.app.metadataCache.getFirstLinkpathDest(linkPath, file.path);
                    if (target == null) {
                        // Parse the path and build into the folder model
                        const pathParts = file.path.split("/");
                        // Nest in folders collection
                        let parentFolder: FolderModel | null = null;
                        for (let i = 0; i < pathParts.length - 1; i++) {
                            const id = pathParts[i];
                            // If parentFolder is null, add it to the root,
                            // otherwise nest it into the parentFolder
                            if (parentFolder === null) {
                                // Look for existing folder or create
                                // a new one and set it as the parent
                                if (folders.has(id)) {
                                    parentFolder = folders.get(id)!;
                                    // Increment link count
                                    parentFolder.linkCount++;
                                } else {
                                    // Add to root
                                    parentFolder = {
                                        id: id,
                                        folders: new Map<string, FolderModel>(),
                                        files: new Map<string, FileModel>(),
                                        linkCount: 1, // default to 1
                                    };
                                    folders.set(id, parentFolder);
                                }
                            } else {
                                // Look for existing child folder or create
                                // a new one and add it to the parent
                                let childFolder: FolderModel | null = null;
                                if (parentFolder.folders.has(id)) {
                                    childFolder = parentFolder.folders.get(id)!;
                                    // Increment link count
                                    childFolder.linkCount++;
                                } else {
                                    childFolder = {
                                        id: id,
                                        folders: new Map<string, FolderModel>(),
                                        files: new Map<string, FileModel>(),
                                        linkCount: 1, // default to 1
                                    };
                                    parentFolder.folders.set(id, childFolder);
                                }
                                // Set the child folder as the parent and recurse
                                parentFolder = childFolder;
                            }
                        }

                        // Locate file in parentFolder or root
                        if (parentFolder) {
                            if (parentFolder.files.has(file.name)) {
                                fileModel = parentFolder.files.get(file.name)!;
                            } else {
                                parentFolder.files.set(file.name, fileModel);
                            }
                        } else {
                            // File is in the root
                            if (files.has(file.name)) {
                                fileModel = files.get(file.name)!; // eslint-disable-line
                            } else {
                                files.set(file.name, fileModel);
                            }
                        }

                        // Add the link to the file
                        const pos: LinkPosition = { line: link.position.start.line, col: link.position.start.col };
                        if (!fileModel.links.has(pos)) {
                            fileModel.links.set(pos, {
                                id: link.link,
                                parent: fileModel,
                                path: file.path,
                                position: link.position,
                            });
                        }
                    }
                }
            }
        }

        return { folders: folders, files: files };
    }

    async linkClickedHandler(e: MouseEvent, link: LinkModel) {
        const file = this.app.vault.getAbstractFileByPath(link.path);
        if (file instanceof TFile) {
            const leaf: WorkspaceLeaf = this.app.workspace.getLeaf(Keymap.isModEvent(e));
            await leaf.openFile(file);
            // Scroll to section and highlight
            if (leaf.view instanceof MarkdownView) {
                if (leaf.view.currentMode instanceof MarkdownPreviewView) {
                    const renderer = leaf.view.currentMode.renderer;
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
