"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const cats = {
    'Coding Cat': 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif'
};
const indexes = new Map();
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('catCoding.start', () => {
        CatCodingPanel.createOrShow(context.extensionUri);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('editor.action.commentLine', () => {
        if (CatCodingPanel.currentPanel) {
            CatCodingPanel.currentPanel.addCommentLine("Comment toggled");
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('workbench.action.debug.start', () => {
        if (CatCodingPanel.currentPanel) {
            return CatCodingPanel.currentPanel.addCommentLine("Debug Started");
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('type', (args) => {
        if (CatCodingPanel.currentPanel) {
            CatCodingPanel.currentPanel.addCommentLine(JSON.stringify(args));
        }
        return vscode.commands.executeCommand('default:type', args);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('workbench.action.debug.stop', () => {
        if (CatCodingPanel.currentPanel) {
            CatCodingPanel.currentPanel.addCommentLine("Debug Stopped");
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('catCoding.doRefactor', () => {
        if (CatCodingPanel.currentPanel) {
            CatCodingPanel.currentPanel.doRefactor();
        }
    }));
    //indexes.set('workbench.action.findInFiles', context.subscriptions.length);
    context.subscriptions.push(vscode.commands.registerCommand('workbench.action.findInFiles', () => {
        if (CatCodingPanel.currentPanel) {
            CatCodingPanel.currentPanel.addCommentLine("Find in Files");
        }
    }));
    if (vscode.window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        vscode.window.registerWebviewPanelSerializer(CatCodingPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel, state) {
                console.log(`Got state: ${state}`);
                // Reset the webview options so we use latest uri for `localResourceRoots`.
                webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
                CatCodingPanel.revive(webviewPanel, context.extensionUri);
            }
        });
    }
}
exports.activate = activate;
function getWebviewOptions(extensionUri) {
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
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update the content based on view changes
        this._panel.onDidChangeViewState(e => {
            if (this._panel.visible) {
                this._update();
            }
        }, null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
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
            }
        }, null, this._disposables);
    }
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (CatCodingPanel.currentPanel) {
            CatCodingPanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(CatCodingPanel.viewType, 'Cat Coding', column || vscode.ViewColumn.One, getWebviewOptions(extensionUri));
        CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
    }
    static revive(panel, extensionUri) {
        CatCodingPanel.currentPanel = new CatCodingPanel(panel, extensionUri);
    }
    quoteCode() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        this._panel.webview.postMessage({
            command: 'quote-code',
            text: JSON.stringify(editor.document.getText(editor.selection))
        });
    }
    addCommentLine(text) {
        // Send a message to the webview webview.
        // You can send any JSON serializable data.
        this._panel.webview.postMessage({ command: 'add-comment-line', text });
    }
    doRefactor() {
        // Send a message to the webview webview.
        // You can send any JSON serializable data.
        this._panel.webview.postMessage({ command: 'refactor' });
    }
    dispose() {
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
    _update() {
        const webview = this._panel.webview;
        this._updateForCat(webview, 'Coding Cat');
    }
    _updateForCat(webview, catName) {
        this._panel.title = catName;
        this._panel.webview.html = this._getHtmlForWebview(webview, cats[catName]);
    }
    _getHtmlForWebview(webview, catGifPath) {
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
CatCodingPanel.viewType = 'catCoding';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=extension.js.map