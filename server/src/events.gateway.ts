import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as pty from 'node-pty';

function spawn(socket: Socket) {
  const term = pty.spawn('zsh', [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    env: process.env,
    cwd: process.env.HOME,
  });

  term.onExit(() => {
    socket.removeAllListeners();
  });
  term.onData((data: string) => {
    socket.emit('output', data);
  });

  socket.on('resize', (size: { cols: number; rows: number }) => {
    term.resize(size.cols, size.rows);
  });
  socket.on('input', (data: string) => {
    term.write(data);
  });

  socket.on('disconnect', () => {
    console.log(`客户端 ${socket.id} 断开连接`);
    term.kill();
  });
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

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
    spawn(socket);
  }
}
