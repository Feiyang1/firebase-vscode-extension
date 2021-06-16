// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { AppsProvider, initializeFirebase, isFirebaseProjectInitialized, loadProjectList, ProjectsProvider } from './firebase';
import { NodeDependenciesProvider } from './providers';

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
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		
		if (isFirebaseProjectInitialized()) {
			vscode.window.showInformationMessage('loading apps!');
			const projects = loadProjectList();

			// list apps for the default project
			appsProvider.setProjectId(projects['default']);
		} else {
			vscode.window.showInformationMessage('no project found!');
		}
	});

	context.subscriptions.push(disposable);

	let disposable1 = vscode.commands.registerCommand('theofficialfirebase.selectProject', (projectId) => {
		vscode.window.showInformationMessage(`selected project ${projectId}`);
		appsProvider.setProjectId(projectId);
	});

	let disposable2 = vscode.commands.registerCommand('theofficialfirebase.initializeFirebase', async () => {
		vscode.window.showInformationMessage(`initializing a Firebase project`);
		await initializeFirebase();
	});

	vscode.commands.registerCommand('theofficialfirebase.refreshProjects', async () => {
		projectsProvider.refresh();
	});

	context.subscriptions.push(disposable1);

	const nodeDependenciesProvider = new NodeDependenciesProvider(vscode.workspace.rootPath!);
	vscode.window.registerTreeDataProvider('nodeDependencies', nodeDependenciesProvider);

	vscode.commands.registerCommand('nodeDependencies.refreshEntry', ()=> {
		nodeDependenciesProvider.refresh();
	})

	console.log(AppsProvider)
	const appsProvider = new AppsProvider();
	vscode.window.registerTreeDataProvider('apps', appsProvider);

	const projectsProvider = new ProjectsProvider();
	vscode.window.registerTreeDataProvider('projects', projectsProvider);
}

// this method is called when your extension is deactivated
export function deactivate() {}
