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

        /*
        if (Math.random() < Math.min(0.001 * currentCount, 0.05)) {
            // Send a message back to the extension
            vscode.postMessage({
                command: 'alert',
                text: 'Random alert from the extension'
            });
        }*/
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

    const loginButton = /** @type {HTMLElement} */ (document.getElementById('login-button'));
    loginButton.addEventListener('click', async e => {
        vscode.postMessage({
            command: 'login'
        });
    });

    const getKeyButton = /** @type {HTMLElement} */ (document.getElementById('get-key-button'));
    getKeyButton.addEventListener('click', async e => {
        vscode.postMessage({
            command: 'get-key'
        });
    });

    const deleteKeyButton = /** @type {HTMLElement} */ (document.getElementById('delete-key-button'));
    deleteKeyButton.addEventListener('click', async e => {
        vscode.postMessage({
            command: 'delete-key'
        });
    });



    const nearCallButton = /** @type {HTMLElement} */ (document.getElementById('near-call-button'));
    nearCallButton.addEventListener('click', async e => {
        vscode.postMessage({
            command: 'near-call'
        });
    });


    const nearViewButton = /** @type {HTMLElement} */ (document.getElementById('near-view-button'));
    nearViewButton.addEventListener('click', async e => {
        vscode.postMessage({
            command: 'near-view'
        });
    });

    /*
    console.log("nearLogin");
    const { keyStores, KeyPair } = nearAPI;
    const myKeyStore = new keyStores.InMemoryKeyStore();
    console.log(myKeyStore);
    const PRIVATE_KEY =
    "Jq1hR95q9WFem7SNMFYosorTh76uyq4iBhJ37JGxb2p4HtXLwPpH7aQQ6HNJUN3hhEkyJfwFztCvq9jzVYwKrQF";
    // creates a public / private key pair using the provided private key
    const keyPair = KeyPair.fromString(PRIVATE_KEY);
    console.log(keyPair);
    // adds the keyPair you created to keyStore
    await myKeyStore.setKey("testnet", "example-account.testnet", keyPair);

    const connectionConfig = {
        networkId: "testnet",
        keyStore: myKeyStore, // first create a key store 
        nodeUrl: "https://rpc.testnet.near.org",
        walletUrl: "https://wallet.testnet.near.org",
        helperUrl: "https://helper.testnet.near.org",
        explorerUrl: "https://explorer.testnet.near.org",		  
    };
    const nearConnection = await nearAPI.connect(connectionConfig);

    console.log("nearConnection", nearConnection);

    // create wallet connection
    const walletConnection = new nearAPI.WalletConnection(nearConnection, "vscode_");

    console.log("walletConnection", walletConnection);

    return walletConnection.requestSignIn( {
        contractId: "example-contract.testnet", // contract requesting access
        methodNames: [], 
        successUrl: "http://YOUR-URL.com/success", // optional redirect URL on success
        failureUrl: "http://YOUR-URL.com/failure" // optional redirect URL on failure
    });
    */
    //});    


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
