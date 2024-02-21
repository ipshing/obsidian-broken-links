<script lang="ts">
    import BrokenLinks from "src/main";
    import { LinkModel, LinkModelGroup } from "src/models";
    import { afterUpdate } from "svelte";

    export let plugin: BrokenLinks;
    export let linkGroup: LinkModelGroup;
    export let expandableItemClicked: (e: MouseEvent, el: HTMLElement) => void;
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;

    let el: HTMLElement;
    let isCollapsed: boolean = !plugin.settings.expandedLinkItems.contains(linkGroup.id);

    afterUpdate(() => {
        isCollapsed = !plugin.settings.expandedLinkItems.contains(linkGroup.id);
    });
</script>

<div id={linkGroup.id} bind:this={el} class="tree-item nav-link-group" class:hidden={!linkGroup.show}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="tree-item-self is-clickable nav-file-title" on:click={(e) => expandableItemClicked(e, el)}>
        <div class="tree-item-icon collapse-icon nav-folder-collapse-indicator" class:is-collapsed={isCollapsed} data-icon="right-triangle"></div>
        <div class="tree-item-icon" data-icon="lucide-link"></div>
        <div class="tree-item-inner nav-file-title-content">{linkGroup.id}</div>
        <div class="tree-item-flair-outer nav-file-link-count">
            <span class="tree-item-flair">{linkGroup.links.length}</span>
        </div>
    </div>
    <div class="tree-item-children nav-link-children" class:hidden={isCollapsed}>
        {#each linkGroup.links as link}
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
                    <div class="tree-item-inner nav-link-title-content">{link.parent.name} (line: {link.position.start.line + 1})</div>
                </div>
            </div>
        {/each}
    </div>
</div>
