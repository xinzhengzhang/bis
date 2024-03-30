import * as net from 'net';
import * as http from 'http';

export interface DaemonResponse {
  [key: string]: [string, number];
}

export class DaemonServer {
  constructor(private host: string, private port: number) { }

  public async shutdown(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        host: this.host,
        port: this.port,
        path: '/shutdown',
        method: 'GET',
      };
      const req = http.request(options, (res) => {
        // do not care
      });
      req.end();
    });
  }

  public async checkServer(): Promise<DaemonResponse> {
    if (await this.isServerAvailable()) {
      const response = await this.fetchServerData();
      return response;
    } else {
      return {};
    }
  }

  public isServerAvailable(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(5000); // 5 seconds timeout
      socket.once('error', () => {
        socket.destroy();
        // reject(new Error('Server is not available'));
        resolve(false);
      });
      socket.once('timeout', () => {
        socket.destroy();
        // reject(new Error('Server timeout'));
        resolve(false);
      });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.connect(this.port, this.host);
    });
  }

  private fetchServerData(): Promise<DaemonResponse> {
    return new Promise((resolve, reject) => {
      const options = {
        host: this.host,
        port: this.port,
        method: 'GET',
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const response: DaemonResponse = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error('Error parsing server response'));
          }
        });
      });
      req.on('error', (error) => {
        reject(error);
      });
      req.end();
    });
  }
}
