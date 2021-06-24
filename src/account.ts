import * as vscode from 'vscode';
import * as portfinder from 'portfinder';
import * as http from 'http';
import { URL, URLSearchParams } from 'url'
import fetch, { } from 'node-fetch';

const OAUTH_END_POINT = "https://accounts.google.com/o/oauth2/v2/auth";
const EXCHANGE_END_POINT = 'https://oauth2.googleapis.com/token';
const CLIENT_ID = '473315497267-lao4s6es51ljga5m128dqjnli6blmt5p.apps.googleusercontent.com';
const CLIENT_SECRET = '7ETK72M3gLcV6YDk4epKQnws';
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

export let accountTokens: AccountTokens | null = null;

export async function login() {
    const availablePort = await portfinder.getPortPromise({ port: 9999 });
    const redirectUrl = `http://localhost:${availablePort}`;

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url!);
        const query = url.searchParams;

        if (query.get('state') === NOUNCE && typeof query.get('code') === 'string') {
            try {
                accountTokens = await getTokenFromAuthorizationCode(query.get('code')!, redirectUrl);
                console.log('got tokens', accountTokens);
            } catch (err) {
                console.error(err);
            }
        }

        server.close();
    });

    server.listen(availablePort, () => {
        const loginParams: Record<string, string> = {
            client_id: CLIENT_ID,
            scope: SCOPES.join(' '),
            response_type: 'code',
            state: NOUNCE,
            redirect_uri: redirectUrl // TODO: implement redirect
        }
    
        const loginQueryParams = [];
        for (const [key, value] of Object.entries(loginParams)) {
            loginQueryParams.push(`${key}=${value}`);
        }
    
        const loginUrl = OAUTH_END_POINT + '?' + loginQueryParams.join('&');
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(loginUrl));
    });
}

async function getTokenFromAuthorizationCode(code: string, redirectUrl: string): Promise<AccountTokens> {
    const reqParamsMap = {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUrl
    };
    const reqParams = new URLSearchParams();
    for (const [key, value] of Object.values(reqParamsMap)) {
        reqParams.append(key, value);
    }

    const response = await fetch(EXCHANGE_END_POINT, { method: 'POST', body: reqParams });
    const responseInJson: AccountTokens = await response.json();

    return responseInJson;
}

interface AccountTokens {
    access_token: string,
    expires_in: number,
    token_type: string,
    scope: string,
    refresh_token: string
}