import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Client } from 'ssh2';

function spawn(socket: Socket, conn: Client) {
  conn
    .on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          socket.emit('output', `sftp error: ${err.message}\r\n`);
          return;
        }

        socket.on('sftp-list', (path: string) => {
          sftp.readdir(path, (err, list) => {
            if (err) {
              socket.emit('output', `sftp-list: ${err.message}\r\n`);
              return;
            }
            socket.emit('sftp', list.map((item) => item.filename).join('\r\n'));
          });
        });

        socket.on('sftp-read', (remotePath: string) => {
          let data = '';
          const stream = sftp.createReadStream(remotePath);

          stream.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });

          stream.on('end', () => {
            socket.emit('sftp', data);
          });

          stream.on('error', (err) => {
            socket.emit('output', `sftp-read: ${err.message}\r\n`);
          });
        });
      });

      conn.shell({ term: 'xterm-color' }, (err, stream) => {
        if (err) {
          socket.emit('output', `shell error: ${err.message}\r\n`);
          return;
        }

        stream.on('data', (data: Buffer) => {
          socket.emit('output', data.toString());
        });
        stream.on('finish', () => {});

        // --------------------

        socket.on('input', (data: string) => {
          stream.write(data);
        });

        socket.on('disconnect', () => {
          conn.end();
        });
      });
    })
    .on('error', (err) => {
      socket.emit('output', `ssh error: ${err.message}\r\n`);
    });

  conn.connect({
    host: 'localhost',
    port: 2222,
    username: 'test',
    password: 'test',
  });
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  private conn: Client;

  constructor() {
    this.conn = new Client();
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() message: string,
  ) {
    console.log(`客户端 ${socket.id} 发送: ${message}`);
    socket.emit('message', message);
    return { status: 'success' };
  }

  handleConnection(@ConnectedSocket() socket: Socket) {
    console.log(`客户端 ${socket.id} 连接`);
    spawn(socket, this.conn);
  }
}
