import * as vscode from 'vscode';
import * as portfinder from 'portfinder';
import * as http from 'http';
import { URL, parse } from 'url'

const OAUTH_END_POINT = "https://accounts.google.com/o/oauth2/v2/auth";
const CLIENT_ID = '473315497267-lao4s6es51ljga5m128dqjnli6blmt5p.apps.googleusercontent.com';
const SCOPES = [
    // OPENID
    'openid',

    // EMAIL
    'email',

    // CLOUD_PROJECTS_READONLY
    'https://www.googleapis.com/auth/cloudplatformprojects.readonly',

    // FIREBASE_PLATFORM
    'https://www.googleapis.com/auth/firebase',

    // CLOUD_PLATFORM
    'https://www.googleapis.com/auth/cloud-platform'
];

// TODO: generate nounce properly
const NOUNCE = 'nounce123sdaf';

export async function login() {
    const availablePort = await portfinder.getPortPromise({ port: 9999 });

    const server = http.createServer((req, res) => {
        const url = new URL(req.url!);
        const query = url.searchParams;

        if (query.get('state') === NOUNCE && typeof query.get('code') === 'string') {
            
        }
    });
    const loginParams: Record<string, string> = {
        client_id: CLIENT_ID,
        scope: SCOPES.join(' '),
        response_type: 'code',
        state: NOUNCE, 
        redirect_uri: 'http://localhost:8080' // TODO: implement redirect
    }

    const loginQueryParams = [];
    for (const [key, value] of Object.entries(loginParams)) {
        loginQueryParams.push(`${key}=${value}`);
    }

    const loginUrl = OAUTH_END_POINT + '?' + loginQueryParams.join('&');
    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(loginUrl));
}