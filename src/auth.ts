import { ExtensionContext, SecretStorage } from "vscode";
import * as nearAPI from "near-api-js";
import { BN } from "bn.js";

export default class AuthSettings {
	private static _instance: AuthSettings;

	constructor(private secretStorage: SecretStorage) { }

	static init(context: ExtensionContext): void {
		/*
		Create instance of new AuthSettings.
		*/
		AuthSettings._instance = new AuthSettings(context.secrets);
	}

	static get instance(): AuthSettings {
		/*
		Getter of our AuthSettings existing instance.
		*/
		return AuthSettings._instance;
	}

	async storeValue(key: string, value?: string): Promise<void> {
		this.secretStorage.store(key, value ?? "");
	}

	async getValue(key: string): Promise<string | undefined> {
		return await this.secretStorage.get(key);
	}

	async storeAuthData(token?: string): Promise<void> {
		/*
		Update values in bugout_auth secret storage.
		*/
		if (token) {
			this.secretStorage.store("fancycolor_token", token);
		}
	}

	async getAuthData(): Promise<string | undefined> {
		/*
		Retrieve data from secret storage.
		*/
		return await this.secretStorage.get("fancycolor_token");
	}

	getKeyPair(): nearAPI.utils.KeyPairEd25519 {
		return nearAPI.utils.KeyPairEd25519.fromRandom();

		// return ({public: keypair.publicKey, private: keypair.secretKey});
	}

	async getLoginLink(network: string, publicKey: string, appName: string | null, contractName: string | null) {
		const contractNameRequest = contractName ? `&contract_id=${contractName.toLowerCase()}` : "";

		return `https://wallet.${network}.near.org/login/?title=${appName}&public_key=${encodeURIComponent(publicKey)}${contractNameRequest}`;
	}

	async nearGetSignUrl(account_id: string, method: string, params: [], deposit: string | number, gas: string | number, receiver_id: string, meta: string | null, callback_url: string | null, network: string): Promise<string> {


		if (!network)
			network = "mainnet";

		let actions = [];

		const deposit_value = typeof deposit == 'string' ? deposit : nearAPI.utils.format.parseNearAmount('' + deposit) ?? 0;
		actions = [nearAPI.transactions.functionCall(method, Buffer.from(JSON.stringify(params)), new BN(gas), new BN(deposit_value))];


		const keypair = nearAPI.utils.KeyPair.fromRandom('ed25519');
		const provider = new nearAPI.providers.JsonRpcProvider({ url: 'https://rpc.' + network + '.near.org' });
		const block = await provider.block({ finality: 'final' });

		const txs = [nearAPI.transactions.createTransaction(account_id, keypair.getPublicKey(), receiver_id, 1, actions, nearAPI.utils.serialize.base_decode(block.header.hash))];

		const newUrl = new URL('sign', 'https://wallet.' + network + '.near.org/');
		newUrl.searchParams.set('transactions', txs
			.map(transaction => nearAPI.utils.serialize.serialize(nearAPI.transactions.SCHEMA, transaction))
			.map(serialized => Buffer.from(serialized).toString('base64'))
			.join(','));
		newUrl.searchParams.set('callbackUrl', callback_url ?? "");
		if (meta)
			newUrl.searchParams.set('meta', meta);
		return newUrl.href;

	}

	async nearLogin(): Promise<void> {
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

		// использовать логин как в типботе

		return walletConnection.requestSignIn({
			contractId: "example-contract.testnet", // contract requesting access
			methodNames: [],
			successUrl: "http://YOUR-URL.com/success", // optional redirect URL on success
			failureUrl: "http://YOUR-URL.com/failure" // optional redirect URL on failure
		});
	}
}