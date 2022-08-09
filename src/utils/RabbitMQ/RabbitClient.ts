import amqp from 'amqplib';
import { IConfig } from '../../global';
import { HttpMessage, MailMessage, Queues } from './RabbitMQ';

export class RabbitClient {
  private readonly cfg: IConfig['RabbitMQ'];

  private connection: amqp.Connection | null = null;
  private connectionBlocked = false;
  private channels: { [key: string]: amqp.Channel } = {};

  private reconnectTimeout?: number;

  constructor(cfg: IConfig['RabbitMQ']) {
    this.cfg = cfg;

    // Try connecting to RabbitMQ
    this.getConnection()
        .catch(console.error);
  }

  async queueHttpOutgoing(data: HttpMessage) {
    return this.send('http.outgoing', JSON.stringify(data));
  }

  async queueMailOutgoing(data: MailMessage) {
    return this.send('mail.outgoing', JSON.stringify(data));
  }

  private async send(queue: Queues, msg: string) {
    const channel = await this.getChannel(queue);

    await channel.assertQueue(queue, {durable: true});
    await channel.sendToQueue(queue, Buffer.from(msg), {persistent: true});
  }

  isAvailable() {
    return this.connection != null && !this.connectionBlocked;
  }

  async shutdown() {
    for (const cKey in this.channels) {
      const channel = this.channels[cKey];

      try {
        await channel.close();
      } catch (ignore) { // Already closed
      }
    }

    if (this.connection) {
      await this.connection.close();
    }

    this.connection = null;
    this.connectionBlocked = false;
    this.channels = {};
  }

  private async getConnection(): Promise<amqp.Connection> {
    if (this.connection == null) {
      if ((this.reconnectTimeout ?? 0) > Date.now()) throw new Error(`Could not connect to RabbitMQ (waiting for reconnect timeout)`);

      await this.shutdown();

      try {
        this.connection = await amqp.connect(this.cfg);

        this.connection.on('blocked', () => {
          this.connectionBlocked = true;
        });
        this.connection.on('unblocked', () => {
          this.connectionBlocked = false;
        });

        this.connection.on('error', (err) => {
          console.log('[RabbitClient] Client errored:', err);

          this.connection?.close()
              .catch((ignore) => {
              });

          this.connection = null;
        });

        this.connection.on('close', () => {
          console.log('[RabbitClient] Client disconnected.');
          this.connection = null;
        });
      } catch (err) {
        this.reconnectTimeout = Date.now() + 3000;  // 3 second timeout

        await this.shutdown();

        throw err;
      }
    }

    return this.connection;
  }

  private async getChannel(queue: Queues): Promise<amqp.Channel> {
    if (!this.channels[queue]) {
      const channel = await (await this.getConnection()).createChannel();
      this.channels[queue] = channel;

      channel.on('error', (err) => {
        channel.close().catch((ignore) => {
        });
        delete this.channels[queue];

        console.error('[RabbitClient] Channel errored:', err);
      });

      channel.on('close', () => {
        delete this.channels[queue];

        console.log('[RabbitClient] Closed channel');
      });
    }

    return this.channels[queue];
  }
}
