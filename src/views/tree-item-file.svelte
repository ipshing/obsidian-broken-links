<script lang="ts">
    import { FileModel, LinkModel } from "src/models";
    import BrokenLinks from "src/main";
    import { afterUpdate } from "svelte";
    import { LinkGrouping } from "src/enum";

    export let plugin: BrokenLinks;
    export let file: FileModel;
    export let expandableItemClicked: (e: MouseEvent, el: HTMLElement) => void;
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;

    let el: HTMLElement;
    let isCollapsed: boolean =
        plugin.settings.groupBy == LinkGrouping.ByFolder ? !plugin.settings.expandedFolderItems.contains(file.path) : !plugin.settings.expandedFileItems.contains(file.path);

    afterUpdate(() => {
        isCollapsed =
            plugin.settings.groupBy == LinkGrouping.ByFolder ? !plugin.settings.expandedFolderItems.contains(file.path) : !plugin.settings.expandedFileItems.contains(file.path);
    });
</script>

<div id={file.path} bind:this={el} class="tree-item nav-file" class:is-collapsed={isCollapsed}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="tree-item-self is-clickable nav-file-title" on:click={(e) => expandableItemClicked(e, el)}>
        <div class="tree-item-icon collapse-icon nav-folder-collapse-indicator" class:is-collapsed={isCollapsed} data-icon="right-triangle"></div>
        <div class="tree-item-icon" data-icon="file"></div>
        <div class="tree-item-inner nav-file-title-content">{file.name}</div>
        <div class="tree-item-flair-outer nav-file-link-count">
            <span class="tree-item-flair">{file.links.length}</span>
        </div>
    </div>
    <div class="tree-item-children nav-file-children" class:hidden={isCollapsed}>
        {#each file.links as link}
            <div class="tree-item nav-link">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="tree-item-self is-clickable nav-link-title"
                    on:click={(e) => {
                        linkClicked(e, link);
                    }}
                    on:auxclick={(e) => {
                        linkClicked(e, link);
                    }}
                >
                    <div class="tree-item-inner nav-link-title-content">{link.id}</div>
                </div>
            </div>
        {/each}
    </div>
</div>
