import { Injectable, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

type Room = {
  id: string;
  //   键值对
  users: Map<string, Socket>;
};

@Injectable()
export class SignalService implements OnModuleInit {
  private rooms: Room | object = {};

  onModuleInit() {
    // 初始化 WebSocket 服务
  }

  handleConnection(socket: Socket) {
    // 加入房间
    socket.on('join-room', (roomId: string, userId: string) => {
      console.log('join-room', roomId, userId);
      if (!this.rooms[roomId]) {
        this.rooms[roomId] = { id: roomId, users: new Map() };
      }

      const room = this.rooms[roomId];
      room.users.set(userId, socket);

      // 将客户端用户加入指定的房间
      socket.join(roomId);
      //先房间用户广播消息
      socket.to(roomId).emit('user-connected', userId);
    });

    // 处理 WebRTC 信令
    socket.on('offer', this.handleOffer.bind(this));
    socket.on('answer', this.handleAnswer.bind(this));
    socket.on('ice-candidate', this.handleIceCandidate.bind(this));

    // 断开连接
    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }
  // 处理 Offer
  private async handleOffer(data: { roomId: string; offer: RTCSessionDescription; userId: string }) {
    const { roomId, offer, userId } = data;

    // 查找需要转发offer的用户
    // recipient为key
    const recipient = Array.from(this.rooms[roomId].users.keys()).filter(id => id !== userId)[0];

    if (recipient) {
      // recipientSocket是socket
      const recipientSocket = this.rooms[roomId].users.get(recipient);
      //   转发sdp
      recipientSocket.emit('offer', {
        sdp: offer.sdp,
        userId,
      });
    }
  }

  // 处理 Answer
  private async handleAnswer(data: { roomId: string; answer: RTCSessionDescription; userId: string }) {
    const { roomId, answer, userId } = data;

    //
    const recipient = Array.from(this.rooms[roomId].users.keys()).filter(id => id !== userId)[0];

    if (recipient) {
      const recipientSocket = this.rooms[roomId].users.get(recipient);
      recipientSocket.emit('answer', {
        sdp: answer.sdp,
        userId,
      });
    }
  }

  // 处理 ICE 候选
  private async handleIceCandidate(data: { roomId: string; candidate: RTCIceCandidate; userId: string }) {
    console.log('handleIceCandidate', data);
    const { roomId, candidate, userId } = data;
    const recipients = Array.from(this.rooms[roomId].users.keys()).filter(id => id !== userId);

    recipients.forEach(recipientId => {
      const recipientSocket = this.rooms[roomId].users.get(recipientId);
      recipientSocket.emit('ice-candidate', {
        candidate: candidate.candidate,
        userId,
      });
    });
  }

  // 处理断开连接
  handleDisconnect(socket: Socket) {
    Object.values(this.rooms).forEach(room => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        socket.to(room.id).emit('user-disconnected', socket.id);
      }
    });
  }
}
