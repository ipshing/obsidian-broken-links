<script lang="ts">
    import { FileModel } from "src/models";
    import { getLink, getSortedLinkKeys } from "src/utils";
    import Link from "./tree-item-link.svelte";

    export let file: FileModel;
    let isCollapsed: boolean = true;
</script>

<div class="tree-item nav-file" class:is-collapsed={isCollapsed}>
    <div class="tree-item-self is-clickable nav-file-title" on:click={() => (isCollapsed = !isCollapsed)}>
        <div class="tree-item-icon collapse-icon nav-folder-collapse-indicator" class:is-collapsed={isCollapsed} data-icon="right-triangle"></div>
        <div class="tree-item-icon" data-icon="file"></div>
        <div class="tree-item-inner nav-file-title-content">{file.id}</div>
        <div class="tree-item-flair-outer nav-file-link-count">
            <span class="tree-item-flair">{file.links.size}</span>
        </div>
    </div>
    <div class="tree-item-children nav-file-children" class:hidden={isCollapsed}>
        {#each getSortedLinkKeys(file.links) as key}
            <Link link={getLink(key, file.links)} />
        {/each}
    </div>
</div>
