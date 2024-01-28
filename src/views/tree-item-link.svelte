<script lang="ts">
    import { LinkModel } from "src/models";

    export let link: LinkModel;
</script>

<div class="tree-item nav-link">
    <div class="tree-item-self is-clickable nav-link-title">
        <div class="tree-item-inner nav-link-title-content">{link.id}</div>
    </div>
</div>
