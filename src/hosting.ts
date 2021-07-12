
import * as vscode from 'vscode';
import { accountInfo } from './account';
import { join } from 'path';
import fetch from 'node-fetch';

export async function deploySite(): Promise<void> {
    console.log('deploying to hosting');
}

async function createVersion() {

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

    getTreeItem(element: SiteItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SiteItem): Promise<SiteItem[]> {
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
            return sites.map(s => new SiteItem(s.name, s.defaultUrl, vscode.TreeItemCollapsibleState.None));
        } else {
            return [];
        }
    }
}

class SiteItem extends vscode.TreeItem {
    contextValue = 'site';
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