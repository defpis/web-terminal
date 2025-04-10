import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(client: Socket, message: string) {
    console.log(`客户端 ${client.id} 发送: ${message}`);
    client.emit('message', message);
    return { status: 'success' };
  }

  handleConnection(client: Socket) {
    console.log(`客户端 ${client.id} 连接`);
  }
}
