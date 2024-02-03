<script lang="ts">
    import { FolderModel, LinkModel } from "src/models";
    import { getFile, getFolder, getSortedKeys } from "src/links";
    import Folder from "./tree-item-folder.svelte";
    import File from "./tree-item-file.svelte";
    import BrokenLinks from "src/main";
    import { afterUpdate } from "svelte";

    export let plugin: BrokenLinks;
    export let folder: FolderModel;
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;
    export let folderExpanded: () => void;
    export let fileExpanded: () => void;

    let isCollapsed: boolean = !plugin.settings.expandedItems.contains(folder.path);

    afterUpdate(() => {
        isCollapsed = !plugin.settings.expandedItems.contains(folder.path);
    });
    async function toggleExpand() {
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            plugin.settings.expandedItems.remove(folder.path);
        } else {
            plugin.settings.expandedItems.push(folder.path);
            folderExpanded();
        }
        await plugin.saveSettings();
    }
</script>

<div id={folder.path} class="tree-item nav-folder" class:is-collapsed={isCollapsed}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="tree-item-self is-clickable nav-folder-title" on:click={toggleExpand}>
        <div class="tree-item-icon collapse-icon nav-folder-collapse-indicator" class:is-collapsed={isCollapsed} data-icon="right-triangle"></div>
        <div class="tree-item-icon" data-icon="lucide-folder"></div>
        <div class="tree-item-inner nav-folder-title-content">{folder.name}</div>
        <div class="tree-item-flair-outer nav-folder-link-count">
            <span class="tree-item-flair">{folder.linkCount}</span>
        </div>
    </div>
    <div class="tree-item-children nav-folder-children" class:hidden={isCollapsed}>
        {#each getSortedKeys(folder.folders) as key}
            <Folder {plugin} folder={getFolder(key, folder.folders)} {linkClicked} {folderExpanded} {fileExpanded} />
        {/each}
        {#each getSortedKeys(folder.files) as key}
            <File {plugin} file={getFile(key, folder.files)} {linkClicked} {fileExpanded} />
        {/each}
    </div>
</div>
