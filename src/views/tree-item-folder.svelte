<script lang="ts">
    import { FolderModel, LinkModel } from "src/models";
    import Folder from "./tree-item-folder.svelte";
    import File from "./tree-item-file.svelte";
    import BrokenLinks from "src/main";
    import { afterUpdate } from "svelte";

    export let plugin: BrokenLinks;
    export let folder: FolderModel;
    export let expandableItemClicked: (e: MouseEvent, el: HTMLElement) => void;
    export let folderContextClicked: (e: MouseEvent, el: HTMLElement) => void;
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;

    let el: HTMLElement;
    let isCollapsed: boolean = !plugin.settings.expandedFolderItems.contains(folder.path);

    afterUpdate(() => {
        isCollapsed = !plugin.settings.expandedFolderItems.contains(folder.path);
    });
</script>

<div id={folder.path} bind:this={el} class="tree-item nav-folder" class:is-collapsed={isCollapsed}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="tree-item-self is-clickable nav-folder-title" on:click={(e) => expandableItemClicked(e, el)} on:contextmenu={(e) => folderContextClicked(e, el)}>
        <div class="tree-item-icon collapse-icon nav-folder-collapse-indicator" class:is-collapsed={isCollapsed} data-icon="right-triangle"></div>
        <div class="tree-item-icon" data-icon="lucide-folder"></div>
        <div class="tree-item-inner nav-folder-title-content">{folder.name}</div>
        <div class="tree-item-flair-outer nav-folder-link-count">
            <span class="tree-item-flair">{folder.linkCount}</span>
        </div>
    </div>
    <div class="tree-item-children nav-folder-children" class:hidden={isCollapsed}>
        {#each folder.folders as subfolder}
            <Folder {plugin} folder={subfolder} {linkClicked} {expandableItemClicked} {folderContextClicked} />
        {/each}
        {#each folder.files as file}
            <File {plugin} {file} {expandableItemClicked} {linkClicked} />
        {/each}
    </div>
</div>
