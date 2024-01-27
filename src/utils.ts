import { error } from "console";
import { FolderModel, FileModel, LinkPosition, LinkModel } from "./models";

export function getSortedKeys(item: Map<string, unknown>): string[] {
    const keys: string[] = [];
    for (const key of item.keys()) {
        keys.push(key);
    }
    return keys.sort();
}

export function getSortedLinkKeys(links: Map<LinkPosition, LinkModel>): LinkPosition[] {
    const keys: LinkPosition[] = [];
    for (const key of links.keys()) {
        keys.push(key);
    }
    return keys.sort((left, right) => {
        if (left.line < right.line) return -1;
        else if (left.line > right.line) return 1;
        else if (left.col < right.col) return -1;
        else if (left.col > right.col) return 1;
        else return 0;
    });
}

export function getFolder(key: string, folders: Map<string, FolderModel>): FolderModel {
    if (folders.has(key)) {
        return folders.get(key)!;
    }
    throw error("Unable to locate folder.");
}

export function getFile(key: string, files: Map<string, FileModel>): FileModel {
    if (files.has(key)) {
        return files.get(key)!;
    }
    throw error("Unable to locate file.");
}

export function getLink(key: LinkPosition, links: Map<LinkPosition, LinkModel>): LinkModel {
    if (links.has(key)) {
        return links.get(key)!;
    }
    throw error("Unable to locate link.");
}
