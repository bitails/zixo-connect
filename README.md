# Zixo Connect

This solution enables seamless transactions between merchants and clients using SPV (Simplified Payment Verification) technology on the BSV (Bitcoin SV) network. The system consists of three primary components:

1. **Socket Server**: This component can be hosted by the merchant or through the server hosted by the Zixo team. The server is responsible for keeping track of socket IDs which are used to connect the merchant with the clients.

2. **Merchant Service**: This service connects the clients to the merchant and allows them to send the data and transactions to the merchant directly. It verifies transactions based on predefined criteria before sending them to the server service.

3. **Client**: The client can be implemented as code or as a wallet application. It initiates transactions by connecting to the merchant service, sending necessary data, and receiving responses.

## How It Works

### Transaction Scenario

1. **Merchant Setup**: The merchant sets up the merchant service on their website or application, displaying a QR code for clients to scan.

2. **Client Interaction**: The client scans the QR code displayed by the merchant. This QR code contains the necessary information to connect to the merchant service.

3. **Transaction Creation**: Upon scanning the QR code, the client connects with the merchant service and creates a transaction. The transaction follows SPV principles, ensuring it is lightweight and efficient.

4. **Transaction Submission**: The client sends the SPV-based transaction to the merchant through the connection.

5. **Merchant Verification**: The merchant service verifies the transaction to ensure it meets the requirements. This may include checks for validity, sufficiency of funds, and compliance with any additional criteria the merchant needs.

6. **Transaction Propagation**: The transaction is sent to the BSV network by the merchant for settlement if it meets the merchant's requirements.

## Under the Hood

The merchant generates a QR code that the client scans to obtain the merchant's public key and ivhex for encrypting the messages, and the server address for connecting via socket. The ID is announced to the socket server during setup, and there can be added data in JSON format if needed.

The client scans the QR code and encrypts its public key, ivhex, and ID announced to the socket network in JSON format using the merchant's public key, then sends it to the merchant through the socket.

Upon receiving each message, the server stores the ID and socket related to the presentApplicationID message and sends the message to the client or merchant based on the message ID. The advantage of this method is that the entire process is fully encrypted from the start, eliminating the possibility of data tampering.

## Setup Instructions

First, download the project from the following link:

```bash
git clone https://github.com/Omegachains/zixo-connect.git
```

There are three main folders: `server`, `client`, and `merchant`.

### Setting up the server:

1. Enter the `server` folder.
2. Create a `.env` file based on `.env.sample` and replace the relevant values:
   - `APPLICATION_PORT`: The API port for checking the online/offline status of the client or merchant.
   - `APPLICATION_SOCKET_PORT`: The port for socket communication with the client and merchant.
   - `NGROK_TOKEN`: NGROK token for WSS communication (if a domain is needed).

Then run the following command in the root of the server folder:

```bash
npm run start
```

You will see the assigned domain in the console output.

### Setting up the merchant:

1. Enter the `merchant` folder.
2. Create a `.env` file based on `.env.sample` and replace the relevant values:
   - `FETCH_MERKLE_ROOT_IF_NOT_EXISTS`: Set to 1 to generate local Merkle root; otherwise, it is fetched from the API.
   - `ACCEPT_UNCONFIRMED_UTXOS`: Set to 0 or 1.
   - `REQUIRED_MERKLE_PATH_FROM_CLIENT`: Set to 0 or 1.
   - `WEB_SOCKET_ADDRESS`: The WebSocket address based on the domain obtained when running the server (should be in the format wss://).
   - `APPLICATION_NAME`: The application name that clients can recognize you by.
   - `APPLICATION_PORT`: The port for displaying data in QR code format and accessing swagger.
   - `APPLICATION_WEB_SOCKET_CALL_ID`: A fixed UUID for connecting to the server.

Run the following command in the root of the merchant folder:

```bash
npm run start
```

Wait for the merchant to connect to the server.

### Setting up the client:

1. Enter the `client` folder.
2. Create a `.env` file based on `.env.sample` and replace the relevant values:
   - `APPLICATION_WEB_SOCKET_CALL_ID`: A fixed UUID for connecting to the server.

Run the following command in the root of the client folder:

```bash
npm run start
```

Wait for the client to start without errors. Note that at this stage, the client is not connected to any server.

## Usage Instructions:

If you have followed the instructions, all parts should be running by now. We will now operate to connect and send transaction information from the client and verify it on the merchant side as SPV.

First, go to the merchant's swagger address and generate a QR code. When you scan it, you will get a base64 hashed text, for example:

```
eJyNk9tuGzcURf9Gb4pJntuwgBDkLUHQjyCHHMOwExtW2iR/...
```

Enter the following command in the client's terminal:

````bash
scanLink your_qrcode_scan_result
```ْ
Example:
```bash
scanLink eJyNk9tuGzcURf9Gb4pJntuwgBDkLUHQjyCHHMOwExtW2iR/...
````

The client converts the scanned base64 string into the following model:

```
socketAddress
callId
secondPartyivHex
Id
secondPartyivHex
Name
secondPartyPublicKeyHex
```

These are the data the merchant provides to the client via the QR code.

At this stage, the client encrypts its publicKeyHex, ivHex, and callId using the public key and ivHex provided by the merchant and sends them to the merchant to establish secure communication.

The structure of data sent between the network must be as follows:

```json
{
  "event": "yourEvent",
  "callId": "merchant or client call id",
  "id": "O you on the other side who knows me through it",
  "message": "encrypt message as string"
}
```

### Sending SPV Data

The first SPV data must be encrypted and sent to the merchant. The data structure is as follows:

```json
ReqUserDataModel {
  currentTx: string;
  inputs: Input[];
}
Input {
  rawTx: string;
  branch: BranchModel[];
}
BranchModel {
  pos: 'L' | 'R';
  hash: string;
}
```

These data are encrypted using the merchant's public keys described earlier and sent to the merchant. The merchant decrypts these data, verifies them, performs the SPV operation, and if successful, sends a success message back to the client using the same encryption method.
## Donation
Zixo-Connect is a side project of the Bitails team with no intention of direct financial gain. If you find this project useful and worth working on, ping out the following addresses specified for this project.

BSV: 1Fzt3S751fAaHbVNHVyru83kyzoCUtDFCQ

BTC: bc1q9kdcl5ffvl2jsxn4xdfr7655fmschckz6wsyza
