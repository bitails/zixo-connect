
# Zixo Connect Project

We have created a project similar to Wallet Connect but with more access and configurability. You can easily configure it to meet your needs.

## Sections:
1. Server
2. Merchant
3. Client

## General Description
The merchant generates a QR code that the client scans to obtain the server address to connect via socket, as well as the public key and ivhex for message encryption, and the ID announced to the socket server during setup. You can also add other data in JSON format as needed.

[![QR Code Scan](https://i.postimg.cc/zGcPNK6n/image1.webp)](https://postimg.cc/Wd076F23)

The client scans the QR code and must encrypt its own public key, ivhex, and ID announced to the socket network in JSON format using the merchant's public key, and then send it to the network.

The server, upon receiving each message, stores the ID and socket related to the presentApplicationID message, and if the title is different, it sends the message to the client or merchant based on the message ID.


[![Three Party Communication](https://i.postimg.cc/vT0zGx3R/image.webp)](https://postimg.cc/Zvy3cRGj)

The advantage of this method is that the entire process is fully encrypted from the start, eliminating the possibility of data tampering.

This is a simple sample based on the above description, and you can modify and use it according to your needs.

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
   - `GENEREATE_MERKLE_ROOT_LOCAL`: Set to 1 to generate local merkle root; otherwise, it is fetched from the API.
   - `ACCEPT_UNCONFIRMED_INPUT_TRANSACTION`: Set to 0 or 1.
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
If you have followed the instructions, all parts should be running by now. We will now perform an operation to connect and send transaction information from the client and verify it on the merchant side as SPV.


[![Workflow](https://i.postimg.cc/4Nwvcc6j/image.webp)](https://postimg.cc/tYZVQYmz)

First, go to the merchant's swagger address and generate a QR code. When you scan it, you will get a base64 hashed text, for example:
```
eJyNk9tuGzcURf9Gb4pJntuwgBDkLUHQjyCHHMOwExtW2iR/...
```

Enter the following command in the client's terminal:
```bash
scanLink your_qrcode_scan_result
```ْ
Example:
```bash
scanLink eJyNk9tuGzcURf9Gb4pJntuwgBDkLUHQjyCHHMOwExtW2iR/...
```
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
These are the data provided by the merchant to the client via the QR code.

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
These data are encrypted using the merchant's public keys as described earlier and sent to the merchant. The merchant decrypts these data, verifies them, performs the SPV operation, and if successful, sends a success message back to the client using the same encryption method.