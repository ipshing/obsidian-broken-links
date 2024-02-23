<script lang="ts">
    import { setIcon } from "obsidian";
    import { BrokenLinksModel, LinkFilter, LinkModel } from "src/models";
    import { afterUpdate, beforeUpdate } from "svelte";
    import Folder from "./tree-item-folder.svelte";
    import File from "./tree-item-file.svelte";
    import LinkGroup from "./tree-item-link-group.svelte";
    import BrokenLinks from "src/main";
    import { LinkGrouping } from "src/enum";

    export let plugin: BrokenLinks;
    export let brokenLinks: BrokenLinksModel;
    export let groupBy: LinkGrouping;
    export let linkFilter: LinkFilter = {
        filterString: "",
        matchCase: false,
    };
    export let groupByButtonClicked: (e: MouseEvent) => void;
    export let sortButtonClicked: (e: MouseEvent) => void;
    export let expandButtonClicked: (e: MouseEvent, el: HTMLElement) => void;
    export let expandableItemClicked: (e: MouseEvent, el: HTMLElement) => void;
    export let folderContextClicked: (e: MouseEvent, el: HTMLElement) => void;
    export let updateLinkFilter: (filterString: string, matchCase: boolean) => void;
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;

    let header: HTMLElement;
    let container: HTMLElement;
    let children: HTMLElement;
    let expandLabel = "Expand all";
    let expandIcon = "chevrons-up-down";

    beforeUpdate(() => {
        let showExpand = true;
        if (plugin.settings.groupBy == LinkGrouping.ByFolder) {
            showExpand = plugin.settings.expandedFolderItems.length == 0;
        } else if (plugin.settings.groupBy == LinkGrouping.ByFile) {
            showExpand = plugin.settings.expandedFileItems.length == 0;
        } else if (plugin.settings.groupBy == LinkGrouping.ByLink) {
            showExpand = plugin.settings.expandedLinkItems.length == 0;
            if (plugin.settings.linkFilter.filterString.length > 0) {
                showExpand = brokenLinks.byLink.filter((value) => value.show && plugin.settings.expandedLinkItems.contains(value.id)).length == 0;
            }
        }
        expandLabel = showExpand ? "Expand all" : "Collapse all";
        expandIcon = showExpand ? "chevrons-up-down" : "chevrons-down-up";
    });
    afterUpdate(() => {
        // Set icons after DOM has been updated
        setIcons();
    });
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
        <div class="clickable-icon nav-action-button" aria-label={expandLabel} data-icon={expandIcon} on:click={(e) => expandButtonClicked(e, children)}></div>
    </div>
    {#if groupBy == LinkGrouping.ByLink}
        <div class="filter-row">
            <div class="filter-input-container">
                <input
                    type="search"
                    spellcheck="false"
                    placeholder="Filter..."
                    bind:value={linkFilter.filterString}
                    on:input={() => updateLinkFilter(linkFilter.filterString, linkFilter.matchCase)}
                />
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="filter-input-clear-button"
                    aria-label="Clear filter"
                    on:click={() => {
                        linkFilter.filterString = "";
                        updateLinkFilter(linkFilter.filterString, linkFilter.matchCase);
                    }}
                ></div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="input-right-decorator clickable-icon"
                    aria-label="Match case"
                    data-icon="uppercase-lowercase-a"
                    class:is-active={linkFilter.matchCase}
                    on:click={() => {
                        linkFilter.matchCase = !linkFilter.matchCase;
                        updateLinkFilter(linkFilter.filterString, linkFilter.matchCase);
                    }}
                ></div>
            </div>
        </div>
    {/if}
</div>
<div class="nav-files-container" bind:this={container}>
    <div class="tree-item nav-folder mod-root">
        <div class="tree-item-children nav-folder-children" bind:this={children}>
            {#if groupBy == LinkGrouping.ByFolder}
                {#each brokenLinks.byFolder.folders as folder}
                    <Folder {plugin} {folder} {linkClicked} {expandableItemClicked} {folderContextClicked} />
                {/each}
                {#each brokenLinks.byFolder.files as file}
                    <File {plugin} {file} {expandableItemClicked} {linkClicked} />
                {/each}
            {/if}
            {#if groupBy == LinkGrouping.ByFile}
                {#each brokenLinks.byFile as file}
                    <File {plugin} {file} {expandableItemClicked} {linkClicked} />
                {/each}
            {/if}
            {#if groupBy == LinkGrouping.ByLink}
                {#each brokenLinks.byLink as linkGroup}
                    <LinkGroup {plugin} {linkGroup} {expandableItemClicked} {linkClicked} />
                {/each}
            {/if}
        </div>
    </div>
</div>
