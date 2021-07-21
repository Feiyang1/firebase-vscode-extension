// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { accountInfo, AccountTokens, cancelLogin, login } from './account';
import { AccountProvider, AppsProvider, initializeFirebase, ProjectsProvider } from './firebase';
import { deploySite, SiteItem, SitesProvider } from './hosting';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "theofficialfirebase" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('theofficialfirebase.helloWorld', () => {
		vscode.window.showInformationMessage('helloworld logging');
	});

	context.subscriptions.push(disposable);

	let disposable1 = vscode.commands.registerCommand('theofficialfirebase.selectProject', (projectId) => {
		vscode.window.showInformationMessage(`selected project ${projectId}`);
		appsProvider.setProjectId(projectId);
		sitesProvider.setProjectId(projectId);
	});

	vscode.commands.registerCommand('theofficialfirebase.selectSite', siteId => {
		vscode.window.showInformationMessage(`selected site ${siteId}`);
	});

	let disposable2 = vscode.commands.registerCommand('theofficialfirebase.initializeFirebase', async () => {
		vscode.window.showInformationMessage(`initializing a Firebase project`);
		await initializeFirebase();
	});

	vscode.commands.registerCommand('theofficialfirebase.refreshProjects', async () => {
		projectsProvider.refresh();
	});

	vscode.commands.registerCommand('theofficialfirebase.login', async () => {
		vscode.window.showInformationMessage('logging');

		const accountInfo = await vscode.window.withProgress({
			title: 'Waiting for login to complete',
			location: vscode.ProgressLocation.Notification,
			cancellable: true
		},
			(_, cancelationToken) => {
				cancelationToken.onCancellationRequested(() => {
					cancelLogin();
				});
				return login();
			});

		console.log("got tokens successfully", accountInfo);
		accountProvider.updateAccount(accountInfo);
		accountProvider.refresh();
	});

	vscode.commands.registerCommand('theofficialfirebase.deploySite', async (node: SiteItem) => {
		if (!accountInfo) {
			vscode.window.showInformationMessage('no account info found, please login first');
			return;
		}

		deploySite(node.siteId, accountInfo.tokens.access_token);
	});

	context.subscriptions.push(disposable1);

	console.log(AppsProvider)
	const appsProvider = new AppsProvider();
	vscode.window.registerTreeDataProvider('apps', appsProvider);

	const projectsProvider = new ProjectsProvider();
	vscode.window.registerTreeDataProvider('projects', projectsProvider);

	const accountProvider = new AccountProvider();
	vscode.window.registerTreeDataProvider('account', accountProvider);

	const sitesProvider = new SitesProvider();
	vscode.window.registerTreeDataProvider('sites', sitesProvider);
}

// this method is called when your extension is deactivated
export function deactivate() { }
