<script lang="ts">
    import { FolderModel, LinkModel } from "src/models";
    import { getFile, getFolder, getSortedKeys } from "src/utils";
    import Folder from "./tree-item-folder.svelte";
    import File from "./tree-item-file.svelte";

    export let folder: FolderModel;
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;

    let isCollapsed: boolean = true;
</script>

<div class="tree-item nav-folder is-collapsed" class:is-collapsed={isCollapsed}>
    <div class="tree-item-self is-clickable nav-folder-title" on:click={() => (isCollapsed = !isCollapsed)}>
        <div class="tree-item-icon collapse-icon nav-folder-collapse-indicator" class:is-collapsed={isCollapsed} data-icon="right-triangle"></div>
        <div class="tree-item-icon" data-icon="lucide-folder"></div>
        <div class="tree-item-inner nav-folder-title-content">{folder.id}</div>
        <div class="tree-item-flair-outer nav-folder-link-count">
            <span class="tree-item-flair">{folder.linkCount}</span>
        </div>
    </div>
    <div class="tree-item-children nav-folder-children" class:hidden={isCollapsed}>
        {#each getSortedKeys(folder.folders) as key}
            <Folder folder={getFolder(key, folder.folders)} {linkClicked} />
        {/each}
        {#each getSortedKeys(folder.files) as key}
            <File file={getFile(key, folder.files)} {linkClicked} />
        {/each}
    </div>
</div>
