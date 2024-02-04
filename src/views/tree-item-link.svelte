<script lang="ts">
    import { link } from "fs";
    import BrokenLinks from "src/main";
    import { LinkModel } from "src/models";
    import { afterUpdate } from "svelte";

    export let plugin: BrokenLinks;
    export let title: string;
    export let links: LinkModel[];
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;
    export let linkExpanded: () => void;

    let isCollapsed: boolean = !plugin.settings.expandedLinkItems.contains(title);

    afterUpdate(() => {
        isCollapsed = !plugin.settings.expandedLinkItems.contains(title);
    });
    async function toggleExpand() {
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            plugin.settings.expandedLinkItems.remove(title);
        } else {
            plugin.settings.expandedLinkItems.push(title);
            linkExpanded();
        }
        await plugin.saveSettings();
    }
</script>

<div id={title} class="tree-item nav-link-group">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="tree-item-self is-clickable nav-file-title" on:click={toggleExpand}>
        <div class="tree-item-icon collapse-icon nav-folder-collapse-indicator" class:is-collapsed={isCollapsed} data-icon="right-triangle"></div>
        <div class="tree-item-icon" data-icon="lucide-link"></div>
        <div class="tree-item-inner nav-file-title-content">{title}</div>
        <div class="tree-item-flair-outer nav-file-link-count">
            <span class="tree-item-flair">{links.length}</span>
        </div>
    </div>
    <div class="tree-item-children nav-link-children" class:hidden={isCollapsed}>
        {#each links as link}
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
                    <div class="tree-item-inner nav-link-title-content">{link.parent.name}</div>
                </div>
            </div>
        {/each}
    </div>
</div>
