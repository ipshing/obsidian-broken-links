import { Pos } from "obsidian";

export interface FolderModel {
    name: string;
    parent?: FolderModel;
    folders: Map<string, FolderModel>;
    files: Map<string, FileModel>;
    linkCount: number;
}

export interface FileModel {
    name: string;
    parent?: FolderModel;
    path: string;
    created: number;
    modified: number;
    links: Map<number, LinkModel>;
}

export interface LinkModel {
    id: string;
    parent: FileModel;
    position: Pos;
}
