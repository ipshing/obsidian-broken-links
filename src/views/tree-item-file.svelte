<script lang="ts">
    import { FileModel, LinkModel } from "src/models";
    import BrokenLinks from "src/main";
    import { afterUpdate } from "svelte";

    export let plugin: BrokenLinks;
    export let file: FileModel;
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;
    export let fileExpanded: () => void;

    let isCollapsed: boolean =
        plugin.settings.groupBy == "folder" ? !plugin.settings.expandedFolderItems.contains(file.path) : !plugin.settings.expandedFileItems.contains(file.path);

    afterUpdate(() => {
        isCollapsed = plugin.settings.groupBy == "folder" ? !plugin.settings.expandedFolderItems.contains(file.path) : !plugin.settings.expandedFileItems.contains(file.path);
    });
    async function toggleExpand() {
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            if (plugin.settings.groupBy == "folder") {
                plugin.settings.expandedFolderItems.remove(file.path);
            } else if (plugin.settings.groupBy == "file") {
                plugin.settings.expandedFileItems.remove(file.path);
            }
        } else {
            if (plugin.settings.groupBy == "folder") {
                plugin.settings.expandedFolderItems.push(file.path);
            } else if (plugin.settings.groupBy == "file") {
                plugin.settings.expandedFileItems.push(file.path);
            }
            fileExpanded();
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
