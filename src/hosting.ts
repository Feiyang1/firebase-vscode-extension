
import * as vscode from 'vscode';
import { accountInfo } from './account';
import { join } from 'path';
import {
    readFileSync, readdirSync, statSync, createReadStream,
    createWriteStream
} from 'fs';
import fetch from 'node-fetch';
import { FIREBASE_JSON_PATH } from './constants';
import { createGzip } from 'zlib';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { URLSearchParams } from 'url';

const pipe = promisify(pipeline);

const HOSTING_URLS = {
    ROOT_URL: 'https://firebasehosting.googleapis.com/v1beta1'
} as const;

export async function deploySite(siteId: string, accessToken: string): Promise<void> {
    console.log('deploying to hosting');
    const version = await createVersion(siteId, accessToken);
    const filesToUpload = await getFilesForUpload();

    const uploadUrl = await populateFilesToVersion(version, filesToUpload, accessToken);

    // upload file contents
    await uploadFileContents(uploadUrl, filesToUpload, accessToken);

    // finalize the version
    await finalizeVersion(version, accessToken);

    // create release
    await createRelease(siteId, version, accessToken);
}

async function createRelease(siteId: string, version: Version, accessToken: string): Promise<void> {
    const params = new URLSearchParams({
        versionName: version.name
    });
    const response = await fetch(`${HOSTING_URLS.ROOT_URL}/sites/${siteId}/releases?${params}`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${accessToken}`
        }
    });

    console.log(response);
}

async function finalizeVersion(version: Version, accessToken: string): Promise<void> {
    const response = await fetch(`${HOSTING_URLS.ROOT_URL}/${version.name}`, {
        method: 'PATCH',
        headers: {
            authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            ...version,
            status: VersionStatus.FINALIZED
        })
    });

    console.log(response);
}

async function uploadFileContents(uploadUrl: string, filesToUpload: FilesToUpload, accessToken: string): Promise<void> {
    for (const file of filesToUpload.files) {
        const fileStream = createReadStream(file.path);
        const gzip = createGzip();
        const response = await fetch(
            `${uploadUrl}/${file.hash}`,
            {
                method: 'POST',
                headers: {
                    authorization: `Bearer ${accessToken}`
                },
                body: fileStream.pipe(gzip)
            }
        );
        console.log(response.statusText);
    }
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

async function populateFilesToVersion(version: Version, filesToUpload: FilesToUpload, accessToken: string): Promise<string> {

    // https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions/populateFiles?authuser=0#request-body
    const filesRequest: Record<string, string> = {};
    for (const file of filesToUpload.files) {
        const relativeFilePath = file.path.substring(filesToUpload.baseDir.length);
        filesRequest[relativeFilePath] = file.hash;
    }

    const response = await fetch(
        `${HOSTING_URLS.ROOT_URL}/${version.name}:populateFiles`,
        {
            method: 'POST',
            headers: {
                authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({ files: filesRequest })
        }
    );

    const json = await response.json();
    return json.uploadUrl;
}

async function uploadFiles() {

}

// TODO: error handling
async function getFilesForUpload(): Promise<FilesToUpload> {
    // read firebase.json for the files to upload
    const firebaseJson = JSON.parse(readFileSync(FIREBASE_JSON_PATH, { encoding: 'utf-8' }));

    if (!firebaseJson.hosting) {
        throw Error(`hosting is missing in ${FIREBASE_JSON_PATH}`);
    }

    // TODO: handle hosting.ignore
    const publicDir = join(vscode.workspace.rootPath ?? '', firebaseJson.hosting.public);
    return {
        baseDir: publicDir,
        files: await getAllFiles(publicDir)
    };
}

async function getAllFiles(baseDir: string): Promise<FileToUpload[]> {
    const fileList: FileToUpload[] = [];
    for (const fileOrDirName of readdirSync(baseDir)) {
        const fileOrDirPath = join(baseDir, fileOrDirName);
        const stat = statSync(fileOrDirPath);

        if (stat.isDirectory()) {
            fileList.push(...await getAllFiles(fileOrDirPath));
        } else {
            const gzip = createGzip();
            const source = createReadStream(fileOrDirPath);
            const destination = createWriteStream(`${fileOrDirPath}.gz`);
            await pipe(source, gzip, destination);

            const gzipedFileBuffer = readFileSync(`${fileOrDirPath}.gz`);
            const hashsum = createHash('sha256');
            hashsum.update(gzipedFileBuffer);
            const hex = hashsum.digest('hex');

            fileList.push({
                path: fileOrDirPath,
                hash: hex
            });
        }
    }

    return fileList;
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
    // sites/vscodeplugin/versions/20b7a041dae97b47
    name: string;
    status: VersionStatus;
}

const enum VersionStatus {
    CREATED = 'CREATED',
    FINALIZED = 'FINALIZED'
}

interface FilesToUpload {
    baseDir: string;
    files: FileToUpload[];
}

interface FileToUpload {
    path: string;
    hash: string;
}