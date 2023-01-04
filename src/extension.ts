import * as vscode from 'vscode';
import * as nearAPI from "near-api-js";

import AuthSettings from "./auth";
import { BN } from 'bn.js';

const CONTRACT_ID = "dev-1672841246759-15086107589495";

const cats = {
	'Coding Cat': 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif'
};


const indexes = new Map<string, number>();
let nearAuthSettings: AuthSettings;
let extensionContext: vscode.ExtensionContext;
let findCommand: vscode.Disposable, debugCommand: vscode.Disposable, debugStopCommand: vscode.Disposable;

export function activate(context: vscode.ExtensionContext) {
	extensionContext = context;
	AuthSettings.init(context);
	nearAuthSettings = AuthSettings.instance;

	vscode.commands.registerCommand("catCoding.setToken", async () => {
		const tokenInput = await vscode.window.showInputBox();
		await nearAuthSettings.storeAuthData(tokenInput);
	});

	vscode.commands.registerCommand("catCoding.getToken", async () => {
		const tokenOutput = await nearAuthSettings.getAuthData();
		console.log(tokenOutput);
	});


	context.subscriptions.push(
		vscode.commands.registerCommand('catCoding.start', () => {
			CatCodingPanel.createOrShow(context.extensionUri);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('editor.action.commentLine', () => {
			if (CatCodingPanel.currentPanel) {
				CatCodingPanel.currentPanel.addCommentLine("Comment toggled");
			}
		})
	);

	debugCommand = vscode.commands.registerCommand('workbench.action.debug.start', () => {
		if (CatCodingPanel.currentPanel) {
			return CatCodingPanel.currentPanel.addCommentLine("Debug Started");
		}
	});
	context.subscriptions.push(debugCommand);

	context.subscriptions.push(
		vscode.commands.registerCommand('type', (args) => {
			if (CatCodingPanel.currentPanel) {
				CatCodingPanel.currentPanel.addCommentLine(JSON.stringify(args));
			}
			return vscode.commands.executeCommand('default:type', args);
		})
	);




	debugStopCommand = vscode.commands.registerCommand('workbench.action.debug.stop', () => {
		if (CatCodingPanel.currentPanel) {
			CatCodingPanel.currentPanel.addCommentLine("Debug Stopped");
		}
	});
	context.subscriptions.push(debugStopCommand);

	context.subscriptions.push(
		vscode.commands.registerCommand('catCoding.doRefactor', () => {
			if (CatCodingPanel.currentPanel) {
				CatCodingPanel.currentPanel.doRefactor();
			}
		})
	);

	//indexes.set('workbench.action.findInFiles', context.subscriptions.length);


	findCommand = vscode.commands.registerCommand('workbench.action.findInFiles', () => {
		console.log("FindInFiles");
		if (CatCodingPanel.currentPanel) {
			CatCodingPanel.currentPanel.addCommentLine("Find in Files");
			//findCommand.dispose();

		}
	});
	context.subscriptions.push(findCommand);

	/*
			context.subscriptions.push(
				vscode.commands.registerCommand('workbench.action.findInFiles', () => {
					console.log("FindInFiles");
					if (CatCodingPanel.currentPanel) {
						CatCodingPanel.currentPanel.addCommentLine("Find in Files");
					}
				})
			);*/



	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(CatCodingPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				CatCodingPanel.revive(webviewPanel, context.extensionUri);
			}
		});
	}
}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
	};
}

/**
 * Manages cat coding webview panels
 */
class CatCodingPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: CatCodingPanel | undefined;

	public static readonly viewType = 'catCoding';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.ViewColumn.Two; /*vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;*/

		// If we already have a panel, show it.
		if (CatCodingPanel.currentPanel) {
			CatCodingPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			CatCodingPanel.viewType,
			'Cat Coding',
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);

		CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showInformationMessage(message.text);
						return;
					case 'comment':
						vscode.commands.executeCommand('editor.action.addCommentLine');
						return;
					case 'quote':
						this.quoteCode();
						return;
					case 'login':
						this.NearSignin("testnet", CONTRACT_ID);
						return;
					case 'get-key':
						this.GetKey();
						return;
					case 'delete-key':
						this.DeleteKey();
						return;
					case 'near-call':
						this.NearCall("testnet", "test_alice.testnet", CONTRACT_ID, "increment", {}, "30000000000000", "0");
						return;
					case 'near-view':
						this.NearView("testnet", CONTRACT_ID, "get_num", {})
							.then(resp => {
								vscode.window.showInformationMessage(`Value: ${resp}`);
								console.log(resp);
							});
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public async NearCall(network: string, accountId: string, contractId: string, method: string, args: object, gas: string, attachedDeposit: string) {
		const privateKey = await nearAuthSettings.getValue("private_key");
		const keyPair = nearAPI.utils.KeyPair.fromString(privateKey ?? "");
		const keyStore = new nearAPI.keyStores.InMemoryKeyStore();
		keyStore.setKey("default", accountId, keyPair);
		const near = await nearAPI.connect({
			networkId: "default",
			keyStore,
			masterAccount: accountId,
			nodeUrl: `https://rpc.${network}.near.org`
		});

		const account = await near.account(accountId);

		const call = await account.functionCall({
			contractId,
			methodName: method,
			args,
			gas: new BN(gas),
			attachedDeposit: new BN(attachedDeposit)
		}
		);
		console.log(call);
	}

	public async NearView(network: string, contractId: string, methodName: string, args: object): Promise<any> {
		const near = await nearAPI.connect({
			networkId: "default",
			keyStore: undefined,
			masterAccount: undefined,
			nodeUrl: `https://rpc.${network}.near.org`
		});

		const account = await near.account(contractId);

		return await account.viewFunction({
			contractId,
			methodName,
			args
		});
	}


	public async GetKey() {
		const privateKey = await nearAuthSettings.getValue("private_key");
		const publicKey = await nearAuthSettings.getValue("public_key");
		console.log("privateKey read", privateKey);

		this._panel.webview.postMessage({ command: 'add-comment-line', text: publicKey ? `${publicKey} : ${privateKey}` : "Key not found" });
	}

	public async DeleteKey() {
		await nearAuthSettings.storeValue("public_key", "");
		await nearAuthSettings.storeValue("private_key", "");
	}

	public async NearSignin(network: string, contractId: string) {
		const keyPair = nearAuthSettings.getKeyPair();
		await nearAuthSettings.storeValue("public_key", keyPair.publicKey.toString());
		console.log("privateKey stored", keyPair.publicKey.toString());
		await nearAuthSettings.storeValue("private_key", keyPair.secretKey.toString());

		nearAuthSettings.getLoginLink(network, keyPair.publicKey.toString(), "Ext", contractId).
			then(url => vscode.env.openExternal(vscode.Uri.parse(url)));
	}

	public quoteCode() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		this._panel.webview.postMessage({
			command: 'quote-code',
			text: JSON.stringify(editor.document.getText(editor.selection))
		}
		);
	}

	public addCommentLine(text: string) {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'add-comment-line', text });


		if (text === "Debug Started") {
			debugCommand.dispose();
			vscode.commands.executeCommand('workbench.action.debug.start');

			debugCommand = vscode.commands.registerCommand('workbench.action.debug.start', () => {
				if (CatCodingPanel.currentPanel) {
					CatCodingPanel.currentPanel.addCommentLine("Debug Started");
				}
			});
			extensionContext.subscriptions.push(debugCommand);

		}
		else if (text === "Debug Stopped") {
			debugStopCommand.dispose();
			vscode.commands.executeCommand('workbench.action.debug.stop');

			debugStopCommand = vscode.commands.registerCommand('workbench.action.debug.stop', () => {
				if (CatCodingPanel.currentPanel) {
					CatCodingPanel.currentPanel.addCommentLine("Debug Stodded");
				}
			});
			extensionContext.subscriptions.push(debugStopCommand);

		}
		else if (text === "Find in Files") {
			findCommand.dispose();
			vscode.commands.executeCommand('workbench.action.findInFiles');

			findCommand = vscode.commands.registerCommand('workbench.action.findInFiles', () => {
				if (CatCodingPanel.currentPanel) {
					CatCodingPanel.currentPanel.addCommentLine("Find in Files");
				}
			});
			extensionContext.subscriptions.push(findCommand);
		}
	}


	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}


	public dispose() {
		CatCodingPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {

		const webview = this._panel.webview;
		this._updateForCat(webview, 'Coding Cat');
	}

	private _updateForCat(webview: vscode.Webview, catName: keyof typeof cats) {
		this._panel.title = catName;
		this._panel.webview.html = this._getHtmlForWebview(webview, cats[catName]);
	}

	private _getHtmlForWebview(webview: vscode.Webview, catGifPath: string) {
		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');

		// And the uri we use to load this script in the webview
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

		// Local path to css styles
		const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
		const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');

		// Uri to load styles into webview
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.					
				-->
				
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${stylesResetUri}" rel="stylesheet">
				<link href="${stylesMainUri}" rel="stylesheet">

				<title>Cat Coding</title>
			</head>
			<body>		
				<img src="${catGifPath}" width="300" />

				<div>
					<input type="button" value="Comment currnet line" id="comment-button" />
				</div>	

				<div>
					<input type="button" value="Quote code" id="quote-button" />
				</div>		
				
				<div>
					<input type="button" value="Clear" id="clear-button" />
				</div>				
				
				<div>
					<input type="button" value="Near Login" id="login-button" />
				</div>						

				<div>
					<input type="button" value="Get Key" id="get-key-button" />
				</div>				
				
				<div>
					<input type="button" value="Delete Key" id="delete-key-button" />
				</div>	
				
				<div>
					<input type="button" value="Near Call" id="near-call-button" />
				</div>			

				<div>
					<input type="button" value="Near View" id="near-view-button" />
				</div>					

				<h1>Counter: <span id="lines-of-code-counter">0</span></h1>

				<div>
					<span id="message"></span>
				</div>

				<div>
					<pre><span id="code"></span></pre>
				</div>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
