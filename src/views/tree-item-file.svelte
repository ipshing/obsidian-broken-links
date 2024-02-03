<script lang="ts">
    import { FileModel, LinkModel } from "src/models";
    import { getLink, getSortedLinkKeys } from "src/links";
    import Link from "./tree-item-link.svelte";
    import BrokenLinks from "src/main";
    import { afterUpdate, beforeUpdate } from "svelte";

    export let plugin: BrokenLinks;
    export let file: FileModel;
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;

    let isCollapsed: boolean = !plugin.settings.expandedItems.contains(file.path);

    afterUpdate(() => {
        isCollapsed = !plugin.settings.expandedItems.contains(file.path);
    });
    async function toggleExpand() {
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            plugin.settings.expandedItems.remove(file.path);
        } else {
            plugin.settings.expandedItems.push(file.path);
        }
        await plugin.saveSettings();
    }
</script>

<div id={file.path} class="tree-item nav-file" class:is-collapsed={isCollapsed}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="tree-item-self is-clickable nav-file-title" on:click={toggleExpand}>
        <div class="tree-item-icon collapse-icon nav-folder-collapse-indicator" class:is-collapsed={isCollapsed} data-icon="right-triangle"></div>
        <div class="tree-item-icon" data-icon="file"></div>
        <div class="tree-item-inner nav-file-title-content">{file.name}</div>
        <div class="tree-item-flair-outer nav-file-link-count">
            <span class="tree-item-flair">{file.links.size}</span>
        </div>
    </div>
    <div class="tree-item-children nav-file-children" class:hidden={isCollapsed}>
        {#each getSortedLinkKeys(file.links) as key}
            <Link link={getLink(key, file.links)} {linkClicked} />
        {/each}
    </div>
</div>
