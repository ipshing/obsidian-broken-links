import { Pos } from "obsidian";

export interface FolderModel {
    id: string;
    parent?: FolderModel;
    folders: Map<string, FolderModel>;
    files: Map<string, FileModel>;
    linkCount: number;
}

export interface FileModel {
    id: string;
    parent?: FolderModel;
    path: string;
    links: Map<LinkPosition, LinkModel>;
}

export interface LinkModel {
    id: string;
    parent: FileModel;
    path: string;
    position: Pos;
}

export interface LinkPosition {
    line: number;
    col: number;
}
