export interface Article {
  readonly id: string;
  readonly sourceUrl: string;

  readonly title: string | null;
  readonly contentPreview: string | null;
  readonly content: string | null;

  readonly imgUrl: string | null;

  readonly didChange: boolean;
}

export interface IConfig {
  readonly general: {
    readonly updateIntervalInSeconds: 90;
  };

  readonly mail: {
    readonly host: string;
    readonly port?: number;

    readonly secure: boolean;
    readonly requireTLS: boolean;

    readonly auth: {
      readonly user: string;
      readonly pass: string;
    }

    readonly from: {
      readonly name: string;
      readonly address: string;
    }
  };

  readonly  RabbitMQ: {
    protocol: string;
    hostname: string;
    port: number;
    username: string;
    password: string;
    frameMax: 0;
    heartbeat: 0;
    vhost: string;
  };

  readonly urls: Array<{ id: string, name: string, url: string }>;
}

export interface IStorage {
  knownArticles: {
    [key: string] /* URL */: { [key: string /* htmlId */]: string /* SHA-256 of lower-case innerHTML */ }
  };
}
