import { IConfig } from '../global';
import { File } from './File';

export class Config extends File {
  readonly data: IConfig;

  private static readonly defaultData: IConfig = {
    general: {
      updateIntervalInSeconds: 90
    },

    mail: {
      host: 'localhost',
      port: 465,
      secure: true,
      requireTLS: true,

      auth: {
        user: 'no-reply@localhost',
        pass: 's3cr3t'
      },

      from: {
        name: 'HEMS-Notifier',
        address: 'no-reply@localhost'
      }
    },

    RabbitMQ: {
      protocol: 'amqp',
      hostname: 'localhost',
      port: 5672,
      username: 'guest',
      password: 'guest',
      frameMax: 0,
      heartbeat: 0,
      vhost: '/'
    },

    urls: [
      {
        id: 'Startseite',
        name: 'Startseite',
        url: 'http://hems.de/hemshome/'
      },
      {
        id: 'BG',
        name: 'Berufliche Gymnasium',
        url: 'http://bg.hems.de/aktuell/wichtige-informationen/'
      },
      {
        id: 'FOS',
        name: 'Fachoberschule',
        url: 'http://hems.de/schulform/fachoberschule-fos/aktuelles/'
      },
      {
        id: 'FS',
        name: 'Fachschule',
        url: 'http://hems.de/schulform/fachschule-fs/'
      },
      {
        id: 'BFS',
        name: 'Berufsfachschule',
        url: 'http://hems.de/schulform/berufsfachschule-bfs/aktuell/'
      },
      {
        id: 'BS',
        name: 'Berufsschule',
        url: 'http://hems.de/schulform/berufsschule-bs/berufsschule-allgemeines/'
      },
      {
        id: 'BFI',
        name: 'Höhere Berufsfachschule',
        url: 'http://hems.de/schulform/berufsschule-bs/berufsschule-allgemeines/'
      },
      {
        id: 'BzB',
        name: 'Berufsvorbereitung',
        url: 'http://hems.de/schulform/berufsvorbereitung-bzb/'
      },
      {
        id: 'InteA',
        name: 'Integration durch Anschluss und Abschluss',
        url: 'http://hems.de/schulform/intea/'
      }
    ]
  };

  constructor() {
    super(File.getPath('config.json'), Config.defaultData);

    this.data = super.load() as IConfig;

    // Write current config (+ missing default values) into file
    this.save();
  }

  getData(): object {
    return this.data;
  }
}
