<script lang="ts">
    import { setIcon } from "obsidian";
    import { FileModel, FolderModel, LinkModel } from "src/models";
    import { afterUpdate, beforeUpdate } from "svelte";
    import Folder from "./tree-item-folder.svelte";
    import File from "./tree-item-file.svelte";
    import Link from "./tree-item-link.svelte";
    import BrokenLinks from "src/main";

    export let plugin: BrokenLinks;
    export let groupBy: "folder" | "file" | "link";
    export let folderTree: FolderModel;
    export let fileTree: FileModel[];
    export let linkTree: LinkModel[][];
    export let groupByButtonClicked: (e: MouseEvent) => void;
    export let sortButtonClicked: (e: MouseEvent) => void;
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
            if (plugin.settings.groupBy == "folder") {
                children.querySelectorAll(".nav-folder, .nav-file").forEach((child) => {
                    plugin.settings.expandedFolderItems.push(child.id);
                });
            } else if (plugin.settings.groupBy == "file") {
                children.querySelectorAll(".nav-file").forEach((child) => {
                    plugin.settings.expandedFileItems.push(child.id);
                });
            } else if (plugin.settings.groupBy == "link") {
                children.querySelectorAll(".nav-link-group").forEach((child) => {
                    plugin.settings.expandedLinkItems.push(child.id);
                });
            }
            // Change to collapse
            plugin.settings.expandButton = false;
        } else {
            // Collapse everything
            if (plugin.settings.groupBy == "folder") {
                plugin.settings.expandedFolderItems = [];
            } else if (plugin.settings.groupBy == "file") {
                plugin.settings.expandedFileItems = [];
            } else if (plugin.settings.groupBy == "link") {
                plugin.settings.expandedLinkItems = [];
            }
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
        <div class="clickable-icon nav-action-button" aria-label="Group by" data-icon="list" on:click={groupByButtonClicked}></div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="clickable-icon nav-action-button" aria-label="Change sort order" data-icon="lucide-sort-asc" on:click={sortButtonClicked}></div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="clickable-icon nav-action-button" aria-label={expandLabel} data-icon={expandIcon} on:click={toggleExpandButton}></div>
    </div>
</div>
<div class="nav-files-container" bind:this={container}>
    <div class="tree-item nav-folder mod-root">
        <div class="tree-item-self nav-folder-title">
            <div class="tree-item-inner nav-folder-title-content">Broken Links</div>
        </div>
        <div class="tree-item-children nav-folder-children" bind:this={children}>
            {#if groupBy == "folder"}
                {#each folderTree.folders as folder}
                    <Folder {plugin} {folder} {linkClicked} folderExpanded={childExpanded} fileExpanded={childExpanded} />
                {/each}
                {#each folderTree.files as file}
                    <File {plugin} {file} {linkClicked} fileExpanded={childExpanded} />
                {/each}
            {/if}
            {#if groupBy == "file"}
                {#each fileTree as file}
                    <File {plugin} {file} {linkClicked} fileExpanded={childExpanded} />
                {/each}
            {/if}
            {#if groupBy == "link"}
                {#each linkTree as links}
                    <Link {plugin} title={links[0].id} {links} {linkClicked} linkExpanded={childExpanded} />
                {/each}
            {/if}
        </div>
    </div>
</div>
