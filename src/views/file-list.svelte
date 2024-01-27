<script lang="ts">
    import { setIcon } from "obsidian";
    import { FileModel, FolderModel } from "src/models";
    import { afterUpdate } from "svelte";
    import Folder from "./tree-item-folder.svelte";
    import File from "./tree-item-file.svelte";
    import { getFile, getFolder, getSortedKeys } from "src/utils";

    export let folders: Map<string, FolderModel>;
    export let files: Map<string, FileModel>;
    let container: HTMLElement;

    afterUpdate(() => {
        // Call in afterUpdate once all items have been populated
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
                <Folder folder={getFolder(key, folders)} />
            {/each}
            {#each getSortedKeys(files) as key}
                <File file={getFile(key, files)} />
            {/each}
        </div>
    </div>
</div>
