import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as pako from 'pako';
import * as readline from 'readline';
import { AppConfigService } from './app.config.service';
import { EncryptionService } from './encryption/encryption.service';

import { WebSocketService } from './web_socket/web_socket.service';
import { EncryptionKeyModel, MerchandModel } from 'types/merchant';
import { CommandLineEnum } from 'types/commandLine/enum';
import { SocketMessagemodel } from 'types/socket/message';
import { SocketEventEnum } from 'types/event';
import { PeresentDataModel } from 'types/peresentData';
import { ReqUserDataModel } from 'types/user/req';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  private merchantsModel: MerchandModel[] = [];

  constructor(
    @Inject(forwardRef(() => WebSocketService))
    private webSocketService: WebSocketService,
    private encryptionService: EncryptionService,
    private appConfigService: AppConfigService,
  ) {}

  onModuleInit() {
    this.startClient();
  }

  startClient(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    this.logger.debug('Please write a link and press enter');
    this.logger.debug('Listening for command line input...');

    rl.on('line', (line) => this.handleInput(line));
    rl.on('close', () => this.logger.debug('Input stream closed'));
    rl.on('error', (err) => this.logger.error('Error reading input:', err));
  }

  private async handleInput(input: string): Promise<void> {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      this.logger.warn('Received empty input. Please provide a valid link.');
      return;
    }

    const [command, ...args] = trimmedInput.split(' ');

    if (command === CommandLineEnum.scanLink && args.length > 0) {
      Logger.debug('scaned');

      const arg = args[0];
      const decompressedData: MerchandModel =
        this.decompressBase64AndGetUrl(arg);

      if (decompressedData) {
        Logger.debug('decompressedData', decompressedData);
        const indexExist = this.merchantsModel.findIndex(
          (e) => e.socketAddress === decompressedData.socketAddress,
        );

        if (indexExist !== -1) {
          this.merchantsModel.splice(indexExist, 1);
        }

        this.merchantsModel.push(decompressedData);

        //create connection to this merchant
        await this.webSocketService.createWebSocket(
          decompressedData.socketAddress,
        );

        const message: string[] = [
          this.appConfigService.APPLICATION_WEB_SOCKET_CALL_ID,
        ];
        const socketMessage: SocketMessagemodel = {
          id: -1,
          event: SocketEventEnum.PresentApplicationId,
          callId: '',
          message: message,
        };

        this.webSocketService.sendMessage(
          decompressedData.socketAddress,
          JSON.stringify(socketMessage),
        );

        var peresentDataModel: PeresentDataModel = {
          callId: this.appConfigService.APPLICATION_WEB_SOCKET_CALL_ID,
          publicKeyHex: decompressedData.encryptionKeyModel.publicKeyHex,
          ivHex: decompressedData.encryptionKeyModel.ivHex,
        };
        const encryptMessage: string[] =
          this.encryptionService.encryptMyMessages(
            JSON.stringify(peresentDataModel),
            decompressedData,
          );

        this.webSocketService.sendMessage(
          decompressedData.socketAddress,
          JSON.stringify({
            event: SocketEventEnum.PresentData,
            callId: decompressedData.callId,
            id: decompressedData.id,
            message: encryptMessage,
          }),
        );
      }
    } else if (command === CommandLineEnum.sendSpvData && args.length > 0) {
      const arg = args[0];
      const indexExist = this.merchantsModel.findIndex(
        (e) => e.socketAddress === arg,
      );
      if (indexExist !== -1) {
        const decompressedData: MerchandModel = this.merchantsModel[indexExist];

        //sample data
        const reqUserData: ReqUserDataModel = {
          currentTx:
            '01000000021e5c40c99782a21bd883257051a7a0d65718343bd274696c9e510a266ca715fd010000006a47304402202bd80afb693f58f6ccfbc4b5ea3503c7f79c20b018e3c3641d52267bc7536ec202204aee8c487dc915371d9f3d17b9367d9cc465301f680d5ea47d4f1a1caebf966c41210332bab562e27571e9f1300c931719efe63effe043657c17bec5eb1ec3366d41ecffffffff497328dc1d23081982fab4a621d2c632ffddbdd3d68e2d88f132be5b7c63e155010000006a473044022034edd26fba029329d991fef741a0557eade788299cd93db1bc08cf144ec8080f02200d958d64d1c40f5fe5e486755869843f9a929c37bae46d285602362e111f1a7c4121028e1ed6d9ba2c826509ab93736545f71c6aea35bb4c565ef26c30c65575fa2dc4ffffffff03783a0000000000001976a914bef97caeed22745ee4d1e4a939eead976b11c86988aca8130000000000001976a9140776e6736a41e2dced194742580d0c7784ea1bc988acf9580100000000001976a91468171e69d40236c21bbb54fc1f468b46ad12a48388ac00000000',
          inputs: [
            {
              rawTx:
                '0100000002ed011714db5889dbaa1716cba92f5adf251ccd605203dbf22bb9dfe099a04d50020000006a47304402204f79d61dd3c248175e13bdd94c6d4195cbea061e9f8fb5ad5bad3d70aece9c01022077e6d2d5f0158fd7f680f99d1dfb97820323b94cddc6ecf339cfc9e83fc17d49412102952651759da1f2d61d43db2452d6a72f93cc78d1fe86309d1f718b6eab51b6c6ffffffffbcd0a9c5fed8f5581627cb19844423efc3c0843b6647781ab8a78b8257f1f30a010000006a4730440220267a5f9ff452248a3b76dd7941b8c24c44d934280f8099d07fec51646eee37870220595bb567bbcd0c5a0f6c1c507fe77b11f2ad9df06f51e0e970183741f89616d6412103223f43f48edb87974af647c1d4ac1da9a495e36e9e43351c2702be72bc3f0cd3ffffffff05ee260000000000001976a914ebc5ce00bdde51e0bc2b4e0644a42a407173d5c288ac204e0000000000001976a9145547a5933e30f636ed3b0e809761d926bf775c4a88ac204e0000000000001976a914dc57167fb74c3735cee5dcd2ee12b8238cff00e088ac22000000000000001976a914c317251882f3981aa1f43cf8575889db56d31fb988ac45000000000000001976a9146d62c09adfba7e024f9effdbd40f33a756bdc4ff88ac00000000',
              blockheight: 839106,
              branch: [
                {
                  pos: 'L',
                  hash: '61b593f70db43df19f3d9cfce1ea408909c3fca233589422caddc46eed2d36bc',
                },
                {
                  pos: 'R',
                  hash: '3cd37cc0d561c92a436b7574ea5509cb3c815b6f65168d0a2f0025d6fa5f9134',
                },
                {
                  pos: 'L',
                  hash: '2d83ff90121ebbc6d93eb95359f550a55e5e1494afc227677f99b9a743287197',
                },
                {
                  pos: 'L',
                  hash: '8a0f5cb3c9b5ff3a2628fd5dff411de8040359457dd1054e9c92790fc8b7c4dc',
                },
                {
                  pos: 'L',
                  hash: '317d0c18b37d2f28254d7886f0f03f8732a8c7fa5d7f06ed7414c99544924a64',
                },
                {
                  pos: 'L',
                  hash: '533ded203d88ea603782bb493bd900f6c6a1d4a86d057c0bffeed631d0e5ebfa',
                },
                {
                  pos: 'R',
                  hash: '4650a01eae97fe5e2859c1f66d6ae21892a69be92381a11ad8667fb6ffc602c1',
                },
                {
                  pos: 'L',
                  hash: 'a0f44ddd7e655dd1bc4455029154157c37f0a13a3370ec7346fbe192cfe61171',
                },
                {
                  pos: 'R',
                  hash: '2c98cca2ac668a991245b786f23dbfc194bcf097a361c871f509b291b60af24d',
                },
                {
                  pos: 'L',
                  hash: '5e1c35f0dfb7a797a2dab733970c4dfc0720ba588a194abe3a1b9486fd13e36e',
                },
                {
                  pos: 'R',
                  hash: '056a252030368641db6f9c787c666bb50ac0013b18447e86e9c6467c104414c5',
                },
                {
                  pos: 'R',
                  hash: '55080d183e75add3b51c9e7102787b91ff390b117f01fe053605c838821f5b18',
                },
              ],
            },
            {
              rawTx:
                '0100000002c05b7628c8f68e1a4051cd464c27e54107008d7eeb6778be4cc507c39db20106000000006a47304402207f3827064f939d0fe0a20d2ddb50b8e72104b8c4f59994f459183c106368d99002202f9e5c9f49af1da4ac06d458a4c2b474b71dfb254689273b1b903b5d00c64022412103d0e8a1192502e840464b5eaf703e31c963bc1066fdbaf0492642c8cdc0f03c1cffffffffcc9763f10f989739725aa4ce91b18c3da77359d7d2b5a8fae981e0d6aab9e2e4010000006a473044022001d3caad25999967493828b6b7cfd514bd3ce5524118a33500294cd20a76d2cc02202590ae5102dd35d4710a7fcc344eb5cd96b2a80557b48004ce92a07fed95c622412103e6e3cf0e722b59af69a13ae2d1d06db4fdb3e1f526a1d1aaddb60daa8ae1e4b2ffffffff0201000000000000001976a91475734a41b4ad9844800c0218a3389c74aa5c144b88acfa580100000000001976a914f6a3319047c5ae6c9f2e65d3085c45b9b78e0b5888ac00000000',
              blockheight: 842104,
              branch: [
                {
                  pos: 'L',
                  hash: 'dbcd579cc3e3057cc48a6b699f1475a8e2b42907b91c1534b389ff546c86a23a',
                },
                {
                  pos: 'R',
                  hash: 'da0b087f34e6caed3c361938b0f95c3c224416a5d9623d76254114830cacf43c',
                },
                {
                  pos: 'L',
                  hash: 'f46557be4bc8675bb6f0484872d42c2c57c2511867948cbdc5a587323aab9084',
                },
                {
                  pos: 'R',
                  hash: '44344de6758d16df23eab98857258399035cd50af71f4fbdfb81aa7224365c6f',
                },
                {
                  pos: 'L',
                  hash: 'b8514081df84a278b154b136b5de60080d5726e1129d9a82c6aa65a3f6f921bc',
                },
                {
                  pos: 'R',
                  hash: 'f66161ab9f4f1654884d32141be237f1317f3551b8b0020137582fd863a3f95b',
                },
                {
                  pos: 'R',
                  hash: '6df21d3504c1b66565bb91df79826c4d1d3a9d19cc9e6e6c6f8de6cbaf981a3d',
                },
                {
                  pos: 'L',
                  hash: '6642f88188c404d8a90e928c32312772f05d9b9b0d6a7400b51c9ce1d355dcd4',
                },
                {
                  pos: 'R',
                  hash: '83c06ac071d17b901ba50cdf7d93203db8e56a0a31ae96f3cd8aeb6596e22309',
                },
                {
                  pos: 'R',
                  hash: '33035fefd216ee388eaff7233040bccaefbd770d5b38a8db1c2a025f597d7aeb',
                },
                {
                  pos: 'R',
                  hash: '0d350d0d7b104904a4d838d54e5fccab8144794fb2522c53b4043108a81ed4b0',
                },
                {
                  pos: 'R',
                  hash: 'e564b8aef8168a28c9114c74f387578d0c9af7e905778031cb3d9f06334ffa7a',
                },
              ],
            },
          ],
        };

        const encryptMessage: string[] =
          this.encryptionService.encryptMyMessages(
            JSON.stringify(reqUserData),
            decompressedData,
          );
        this.webSocketService.sendMessage(
          decompressedData.socketAddress,
          JSON.stringify({
            event: SocketEventEnum.PresentSpvData,
            callId: decompressedData.callId,
            id: decompressedData.id,
            message: encryptMessage,
          }),
        );

        // this.webSocketService.sendMessage()
      }
    }
  }

  handleInputSocketMessage(socketAddress: string, data: any) {
    const indexExist = this.merchantsModel.findIndex(
      (e) => e.socketAddress === socketAddress,
    );
    if (indexExist == -1) {
      return;
    }
    if (data.event == SocketEventEnum.PresentData) {
      const message = this.encryptionService.decryptMyMessages(
        data.message,
        this.merchantsModel[indexExist],
      );
      Logger.log(message);
    }
  }

  decompressBase64AndGetUrl(
    compressedBase64: string,
  ): MerchandModel | undefined {
    try {
      const compressedData = Buffer.from(compressedBase64, 'base64');
      const decompressedData = pako.inflate(compressedData, { to: 'string' });

      const queryString = decompressedData.split('?')[1];

      const urlParams = new URLSearchParams(queryString);

      const socketAddress = urlParams.get('socketAddress');

      if (socketAddress) {
        const encryptionKeyModel: EncryptionKeyModel =
          this.encryptionService.generateEncryptionKey();
        return {
          socketAddress,
          callId: urlParams.get('callId') || '',
          secondPartyivHex: urlParams.get('ivHex') || '',
          id: parseInt(urlParams.get('id') || '0', 10),
          name: urlParams.get('name') || '',
          encryptionKeyModel: {
            privateKeyHex: encryptionKeyModel.privateKeyHex,
            publicKeyHex: encryptionKeyModel.publicKeyHex,
            ivHex: encryptionKeyModel.ivHex,
          },
          secondPartyPublicKeyHex: urlParams.get('publicKeyHex') || '',
        };
      }
    } catch (error) {
      this.logger.error('Failed to decompress and parse the input:', error);
    }

    return undefined;
  }
}
