import { Pos } from "obsidian";

export interface FolderModel {
    name: string;
    parent?: FolderModel;
    path: string;
    folders: FolderModel[];
    files: FileModel[];
    linkCount: number;
}

export interface FileModel {
    name: string;
    parent?: FolderModel;
    path: string;
    created: number;
    modified: number;
    links: LinkModel[];
}

export interface LinkModelGroup {
    id: string;
    links: LinkModel[];
}

export interface LinkModel {
    id: string;
    sortId: string;
    parent: FileModel;
    position: Pos;
}
