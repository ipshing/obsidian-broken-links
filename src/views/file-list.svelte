<script lang="ts">
    import { setIcon } from "obsidian";
    import { FileModel, FolderModel, LinkModel } from "src/models";
    import { afterUpdate, beforeUpdate } from "svelte";
    import Folder from "./tree-item-folder.svelte";
    import File from "./tree-item-file.svelte";
    import { getFile, getFolder, getSortedKeys } from "src/links";
    import BrokenLinks from "src/main";

    export let plugin: BrokenLinks;
    export let folders: Map<string, FolderModel>;
    export let files: Map<string, FileModel>;
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;

    let container: HTMLElement;

    afterUpdate(() => {
        // Set icons after all items have been populated
        container.querySelectorAll(".tree-item-icon").forEach((el) => setIcon(el as HTMLElement, el.getAttr("data-icon") ?? ""));
    });
</script>

<div class="nav-header"></div>

<div class="nav-files-container" bind:this={container}>
    <div class="tree-item nav-folder mod-root">
        <div class="tree-item-self nav-folder-title">
            <div class="tree-item-inner nav-folder-title-content">Broken Links</div>
        </div>
        <div class="tree-item-children nav-folder-children">
            {#each getSortedKeys(folders) as key}
                <Folder {plugin} folder={getFolder(key, folders)} {linkClicked} />
            {/each}
            {#each getSortedKeys(files) as key}
                <File {plugin} file={getFile(key, files)} {linkClicked} />
            {/each}
        </div>
    </div>
</div>
