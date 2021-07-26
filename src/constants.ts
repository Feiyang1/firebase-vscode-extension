import * as path from 'path';
import * as vscode from 'vscode';

export const FIREBASE_JSON_PATH = path.join(vscode.workspace.rootPath ?? '', 'firebase.json');