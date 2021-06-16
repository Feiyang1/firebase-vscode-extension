import * as vscode from 'vscode';
import { readFileSync, accessSync, } from 'fs';
import { join } from 'path';
// @ts-ignore
import * as firebaseCli from 'firebase-tools';

export const FIREBASE_JSON = 'firebase.json';
export const FIREBASE_RC = '.firebaserc';

interface ProjectAlias {
    [key: string]: string;
}

interface ProjectConfig {
    // TODO
}

export async function initializeFirebase() {
    const terminal = vscode.window.createTerminal();
    terminal.show();
    terminal.sendText("firebase init");
}

export function isFirebaseProjectInitialized(): boolean {
    return pathExists(join(vscode.workspace.rootPath!, FIREBASE_JSON));
}

export function loadProjectList(): ProjectAlias {
    return JSON.parse(readFileSync(join(vscode.workspace.rootPath!, FIREBASE_RC), 'utf-8')).projects;
}

function pathExists(p: string): boolean {
    try {
        accessSync(p);
    } catch (err) {
        return false;
    }
    return true;
}

export class AppsProvider implements vscode.TreeDataProvider<App> {

    private _onDidChangeTreeData: vscode.EventEmitter<App | undefined | null | void> = new vscode.EventEmitter<App | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<App | undefined | null | void> = this._onDidChangeTreeData.event;
    private projectId: string | null = null;

    constructor() { }


    setProjectId(id: string): void {
        this.projectId = id;
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: App): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: App): Promise<App[]> {
        if (!this.projectId) {
            vscode.window.showInformationMessage('No project selected');
            return Promise.resolve([]);
        }

        // apps are not nested
        if (element) {
            return Promise.resolve([]);
        } else {
            // get all apps in the projects
            const apps: any[] = await firebaseCli.apps.list('web', {
                project: this.projectId
            });
            return apps.map(a => new App(a.displayName, a.appId, vscode.TreeItemCollapsibleState.None));
        }
    }
}

class App extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
    }

    // TODO: use right icons
    iconPath = {
        light: join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
        dark: join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    };
}

export class ProjectsProvider implements vscode.TreeDataProvider<Project> {
    private _onDidChangeTreeData: vscode.EventEmitter<Project | undefined | null | void> = new vscode.EventEmitter<Project | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Project | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Project): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: Project): Promise<Project[]> {
        // projects are not nested
        if (element) {
            return Promise.resolve([]);
        } else {
            if (isFirebaseProjectInitialized()) {
                vscode.window.showInformationMessage('loading projects!');
                const projects = loadProjectList();
                return Object.values(projects).map(project => new Project(
                    project,
                    project,
                    createProjectSelectCommand(project),
                    vscode.TreeItemCollapsibleState.None
                ));
            } else {
                vscode.window.showInformationMessage('please run firebase init first');
                return Promise.resolve([]);
            }
        }
    }
}

class Project extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly command: vscode.Command,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
    }

    // use right icons
    iconPath = {
        light: join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
        dark: join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    };
}

function createProjectSelectCommand(projectId: string): vscode.Command {
    return {
        title: 'select project',
        command: 'theofficialfirebase.selectProject',
        arguments: [projectId]
    };
}