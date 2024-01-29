<script lang="ts">
    import { LinkModel } from "src/models";

    export let link: LinkModel;
    export let linkClicked: (e: MouseEvent, link: LinkModel) => void;
</script>

<div class="tree-item nav-link">
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
