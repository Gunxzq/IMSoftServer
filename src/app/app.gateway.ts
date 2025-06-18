import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SignalService } from 'src/signal/signal.service';

interface UserSession {
  userId: string;
  socketId: string;
}

// 配置
@WebSocketGateway({
  cors: {
    // 允许任何源
    origin: '*',
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private signalService: SignalService) {}

  @WebSocketServer()
  server: Server;
  private users: UserSession[] = [];
  // 实现基类的建立连接方法
  handleConnection(client: Socket) {
    // 存储在线的用户的信息
    const userId = client.handshake.auth.userId as string;
    this.users.push({ userId: userId, socketId: client.id });
    // 发送当前在线用户列表
    client.emit(
      'user-list',
      this.users.map(u => u.userId),
    );
    //console.log(`用户${userId}连接: ${client.id}`);
    //console.log(`当前在线用户:${this.users.map(u => u.socketId)}`);

    // WebRTC内容
    this.signalService.handleConnection(client);
  }

  // 实现基类的断开连接方法
  handleDisconnect(client: Socket) {
    this.users = this.users.filter(user => user.socketId !== client.id);
    this.signalService.handleDisconnect(client);
  }

  // 监听了message，回应触发事件的用户
  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any): string {
    //console.log('收到 消息:', payload);
    // return `Server received: ${payload}`;

    // 显示指定事件名称
    client.emit('message', `Server received: ${payload}`);
    return '';
  }

  @SubscribeMessage('message')
  sendToUser(targetUserId: string, message: string) {
    // 定向发送
    //console.log(this.users);
    const targetUser = this.users.find(user => user.userId === '1');
    if (targetUser) {
      this.server.to(targetUser.socketId).emit('private-message', message);
    }
    //console.log(`消息发往${targetUser?.userId}`);
  }
}
