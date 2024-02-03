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

    let header: HTMLElement;
    let container: HTMLElement;
    let children: HTMLElement;
    let expandLabel = plugin.settings.expandButton ? "Expand all" : "Collapse all";
    let expandIcon = plugin.settings.expandButton ? "chevrons-up-down" : "chevrons-down-up";

    beforeUpdate(() => {
        expandLabel = plugin.settings.expandButton ? "Expand all" : "Collapse all";
        expandIcon = plugin.settings.expandButton ? "chevrons-up-down" : "chevrons-down-up";
    });
    afterUpdate(() => {
        // Set icons after DOM has been updated
        setIcons();
    });
    async function toggleExpandButton() {
        if (expandLabel === "Expand all") {
            // Expand everything
            children.querySelectorAll(".nav-folder, .nav-file").forEach((child, key, parent) => {
                plugin.settings.expandedItems.push(child.id);
            });
            // Change to collapse
            plugin.settings.expandButton = false;
        } else {
            // Collapse everything
            plugin.settings.expandedItems = [];
            // Change to expand
            plugin.settings.expandButton = true;
        }
        await plugin.saveSettings();
    }
    async function childExpanded() {
        // Change to collapse
        plugin.settings.expandButton = false;
    }
    function setIcons() {
        header.querySelectorAll(".clickable-icon").forEach((el) => setIcon(el as HTMLElement, el.getAttr("data-icon") ?? ""));
        container.querySelectorAll(".tree-item-icon").forEach((el) => setIcon(el as HTMLElement, el.getAttr("data-icon") ?? ""));
    }
</script>

<div class="nav-header" bind:this={header}>
    <div class="nav-buttons-container">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="clickable-icon nav-actionbutton" aria-label={expandLabel} data-icon={expandIcon} on:click={toggleExpandButton}></div>
    </div>
</div>
<div class="nav-files-container" bind:this={container}>
    <div class="tree-item nav-folder mod-root">
        <div class="tree-item-self nav-folder-title">
            <div class="tree-item-inner nav-folder-title-content">Broken Links</div>
        </div>
        <div class="tree-item-children nav-folder-children" bind:this={children}>
            {#each getSortedKeys(folders) as key}
                <Folder {plugin} folder={getFolder(key, folders)} {linkClicked} folderExpanded={childExpanded} fileExpanded={childExpanded} />
            {/each}
            {#each getSortedKeys(files) as key}
                <File {plugin} file={getFile(key, files)} {linkClicked} fileExpanded={childExpanded} />
            {/each}
        </div>
    </div>
</div>
