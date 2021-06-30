import * as vscode from 'vscode';
import * as portfinder from 'portfinder';
import * as http from 'http';
import { URL, URLSearchParams } from 'url'
import fetch from 'node-fetch';
import * as jwt from 'jsonwebtoken';

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

export let accountInfo: AccountInfo | null = null;
let server: http.Server | null = null;

export async function login(): Promise<AccountInfo> {
    const availablePort = await portfinder.getPortPromise({ port: 9999 });
    const redirectUrl = `http://localhost:${availablePort}`;

    return new Promise((resolve, reject) => {
        server = http.createServer(async (req, res) => {
            const url = new URL(`${redirectUrl}${req.url}`);
            const query = url.searchParams;

            if (query.get('state') === NOUNCE && typeof query.get('code') === 'string') {
                try {
                    const accountTokens = await getTokenFromAuthorizationCode(query.get('code')!, redirectUrl);
                    console.log('got tokens', accountTokens);
                    const userInfo = jwt.decode(accountTokens.id_token) as UserInformation;

                    accountInfo = {
                        tokens: accountTokens,
                        user: userInfo
                    };
                    resolve(accountInfo);

                    respond(req, res, 200, '');
                } catch (err) {
                    console.error(err);
                    reject(err);
                }
            } else {
                console.log('something went wrong');
                reject();
            }

            server!.close();
            server = null;
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

        server.on('error', err => {
            console.log('server error', err);
            reject(err);
        });
    });
}

export function cancelLogin() {
    if (server) {
        server.close();
        server = null;
    }
}

async function getTokenFromAuthorizationCode(code: string, redirectUrl: string): Promise<AccountTokens> {
    const reqParamsMap = {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUrl
    };
    const reqParams = new URLSearchParams(reqParamsMap);
    // for (const [key, value] of Object.values(reqParamsMap)) {
    //     reqParams.append(key, value);
    // }

    const response = await fetch(EXCHANGE_END_POINT, { method: 'POST', body: reqParams });
    const responseInJson: AccountTokens = await response.json();

    return responseInJson;
}

async function respond(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    statusCode: number,
    content: string
): Promise<void> {

    res.writeHead(statusCode, {
        'Content-Length': content.length,
        'Content-Type': 'text/html'
    });
    res.end(content);
    req.socket.destroy();
}


export interface AccountInfo {
    tokens: AccountTokens;
    user: UserInformation;
}

export interface AccountTokens {
    access_token: string,
    expires_in: number,
    token_type: string,
    scope: string,
    refresh_token: string,
    id_token: string
}

export interface UserInformation {
    email: string;
}