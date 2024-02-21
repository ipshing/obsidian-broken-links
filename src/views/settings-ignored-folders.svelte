<script lang="ts">
    import { setIcon } from "obsidian";
    import { afterUpdate } from "svelte";

    export let ignoredFolders: string[] = [];
    export let removeFolder: (folder: string) => void;

    let list: HTMLElement;

    afterUpdate(() => {
        list.querySelectorAll(".broken-links-settings-folder-icon").forEach((el) => setIcon(el as HTMLElement, el.getAttr("data-icon") ?? ""));
        list.querySelectorAll(".clickable-icon").forEach((el) => setIcon(el as HTMLElement, el.getAttr("data-icon") ?? ""));
    });
</script>

<div class="broken-links-settings-folders" bind:this={list}>
    {#each ignoredFolders as folder}
        <div class="broken-links-settings-folder">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="clickable-icon" data-icon="lucide-x" aria-label="Remove folder" on:click={() => removeFolder(folder)}></div>
            <div class="broken-links-settings-folder-icon" data-icon="lucide-folder"></div>
            <div class="broken-links-settings-folder-title">{folder}</div>
        </div>
    {/each}
</div>
