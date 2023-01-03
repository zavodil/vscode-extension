// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
    const vscode = acquireVsCodeApi();

    const oldState = /** @type {{ count: number, code: string, comment: string} | undefined} */ (vscode.getState());

    const counter = /** @type {HTMLElement} */ (document.getElementById('lines-of-code-counter'));
    const messageBox = /** @type {HTMLElement} */ (document.getElementById('message'));
    const codeBox = /** @type {HTMLElement} */ (document.getElementById('code'));

    console.log('Initial state', oldState);

    let currentCount = (oldState && oldState.count) || 0;
    counter.textContent = `${currentCount}`;
    codeBox.textContent = `${oldState?.code ?? ""}`;
    messageBox.textContent = `${oldState?.comment ?? ""}`;

    setInterval(() => {
        counter.textContent = `${currentCount++} `;

        // Update state
        vscode.setState({ count: currentCount, code: oldState?.code, comment: oldState?.comment });

        // Alert the extension when the cat introduces a bug
        if (Math.random() < Math.min(0.001 * currentCount, 0.05)) {
            // Send a message back to the extension
            vscode.postMessage({
                command: 'alert',
                text: 'Random alert from the extension'
            });
        }
    }, 800);


    const commentButton = /** @type {HTMLElement} */ (document.getElementById('comment-button'));
    commentButton.addEventListener('click', e => {
        vscode.postMessage({
            command: 'alert',
            text: 'Add comment'
        });
        vscode.postMessage({
            command: 'comment'
        });
    });

    const quoteButton = /** @type {HTMLElement} */ (document.getElementById('quote-button'));
    quoteButton.addEventListener('click', e => {
        vscode.postMessage({
            command: 'quote'
        });

    });

    const clearButton = /** @type {HTMLElement} */ (document.getElementById('clear-button'));
    clearButton.addEventListener('click', e => {
        currentCount = 0;
        vscode.setState({ count: currentCount, code: "", comment: "" });
        counter.textContent = `0`;
        codeBox.textContent = "";
        messageBox.textContent = "";
    });


    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case 'refactor':
                currentCount = Math.ceil(currentCount * 0.5);
                counter.textContent = `${currentCount}`;
                break;

            case 'add-comment-line':
                messageBox.textContent = `${message.text}`;
                vscode.setState({ count: currentCount, code: oldState?.code, comment: message.text });
                break;

            case 'quote-code':
                codeBox.textContent = `${JSON.parse(message.text) ?? oldState?.code ?? ""}`;
                vscode.setState({ count: currentCount, code: JSON.parse(message.text), comment: oldState?.comment });
                break;
        }
    });
}());
