
import * as vscode from 'vscode';
import { accountInfo } from './account';
import { join } from 'path';
import fetch from 'node-fetch';

const HOSTING_URLS = {
    ROOT_URL: 'https://firebasehosting.googleapis.com/v1beta1'
} as const;

export async function deploySite(siteId: string, accessToken: string): Promise<void> {
    console.log('deploying to hosting');
    const result = await createVersion(siteId, accessToken);
}

async function createVersion(siteId: string, accessToken: string): Promise<Version> {
    const response = await fetch(
        `${HOSTING_URLS.ROOT_URL}/sites/${siteId}/versions`,
        {
            method: 'POST',
            headers: {
                authorization: `Bearer ${accessToken}`
            }
        }
    );

    const json = await response.json();

    return json;
}

async function populateFilesToVersion() {

}

async function uploadFiles() {

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
        } else if (accountInfo && this.projectId) {

            // get all apps in the projects
            const sites: Site[] = await getHostingSites(this.projectId, accountInfo.tokens.access_token);
            return sites.map(s => new SiteItem(
                s.name,
                s.defaultUrl,
                s.siteId,
                createSiteSelectedCommand(s.siteId),
                vscode.TreeItemCollapsibleState.None
            ));
        } else {
            return [];
        }
    }
}

export class SiteItem extends vscode.TreeItem {
    contextValue = 'site';
    constructor(
        public readonly siteName: string,
        public readonly siteUrl: string,
        public readonly siteId: string,
        public readonly command: vscode.Command,
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

function createSiteSelectedCommand(siteId: string): vscode.Command {
    return {
        title: 'select site',
        command: 'theofficialfirebase.selectSite',
        arguments: [siteId]
    };
}

async function getHostingSites(projectId: string, accessToken: string): Promise<Site[]> {
    const url = `${HOSTING_URLS.ROOT_URL}/projects/${projectId}/sites`;
    const response = await fetch(url, {
        headers: {
            authorization: `Bearer ${accessToken}`
        }
    });

    const json = await response.json();
    return json.sites.map((site: any) => ({
        ...site,
        siteId: getSiteId(site.name)
    }));
}

function getSiteId(siteName: string): string {
    const parts = siteName.split('/');
    return parts[parts.length - 1];
}

// reference - https://firebase.google.com/docs/reference/hosting/rest/v1beta1/projects.sites?authuser=0#resource:-site
interface Site {
    // format: "projects/PROJECT_IDENTIFIER/sites/SITE_ID"
    name: string;
    siteId: string
    defaultUrl: string;
    appId?: string;
    type: string;
}

interface Version {
    name: string;
    status: VersionStatus;
}

const enum VersionStatus {
    CREATED = 'CREATED'
}