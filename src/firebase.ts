import * as vscode from 'vscode';
import { readFileSync, accessSync, } from 'fs';
import { join } from 'path';
// @ts-ignore
import * as firebaseCli from 'firebase-tools';
import { accountInfo, AccountInfo } from './account';
import fetch from 'node-fetch';

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
        public readonly siteName: string,
        public readonly siteUrl: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(siteName, collapsibleState);
        this.tooltip = `${this.siteName}`;
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
        public readonly siteName: string,
        public readonly siteUrl: string,
        public readonly command: vscode.Command,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(siteName, collapsibleState);
        this.tooltip = `${this.siteName}`;
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

export class AccountProvider implements vscode.TreeDataProvider<Account> {

    private _onDidChangeTreeData: vscode.EventEmitter<App | undefined | null | void> = new vscode.EventEmitter<App | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<App | undefined | null | void> = this._onDidChangeTreeData.event;
    private accountInfo: AccountInfo | null = null;

    constructor() { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    updateAccount(accountInfo: AccountInfo):void {
        this.accountInfo = accountInfo;
    }

    getTreeItem(element: App): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: App): Promise<Account[]> {
        if (!this.accountInfo) {
            vscode.window.showInformationMessage('Please log in first');
            return Promise.resolve([]);
        }

        // apps are not nested
        if (element) {
            return Promise.resolve([]);
        } else {
            // get all apps in the projects
            return [new Account(this.accountInfo.user.email, this.accountInfo.user.email, vscode.TreeItemCollapsibleState.None)];
        }
    }
}
class Account extends vscode.TreeItem {
    constructor(
        public readonly siteName: string,
        public readonly siteUrl: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(siteName, collapsibleState);
        this.tooltip = `${this.siteName}`;
    }

    // TODO: use right icons
    iconPath = {
        light: join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
        dark: join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    };
}

export class SitesProvider implements vscode.TreeDataProvider<SiteItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<SiteItem | undefined | null | void> = new vscode.EventEmitter<SiteItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SiteItem | undefined | null | void> = this._onDidChangeTreeData.event;
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
        console.log('accountinfo,', accountInfo);
        // apps are not nested
        if (element) {
            return Promise.resolve([]);
        } else if(accountInfo && this.projectId) {

            // get all apps in the projects
            const sites: Site[] = await getHostingSites(this.projectId, accountInfo.tokens.access_token);
            return sites.map(s => new App(s.name, s.defaultUrl, vscode.TreeItemCollapsibleState.None));
        } else {
            return [];
        }
    }
}

class SiteItem extends vscode.TreeItem {
    constructor(
        public readonly siteName: string,
        public readonly siteUrl: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(siteName, collapsibleState);
        this.tooltip = `${this.siteName}`;
    }

    // TODO: use right icons
    iconPath = {
        light: join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
        dark: join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    };
}

async function getHostingSites(projectId: string, accessToken: string): Promise<Site[]> {
    const url = `https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites`;
    const response = await fetch(url, {
        headers: {
            authorization: `Bearer ${accessToken}`
        }
    });

    const json = await response.json();
    return json.sites;
}

interface Site {
    name: string;
    defaultUrl: string;
    appId?: string;
    type: string;
}