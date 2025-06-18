import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppGateway } from './app/app.gateway';
import { SignalService } from './signal/signal.service';

@Module({
  imports: [],
  // 控制器
  controllers: [AppController],
  // 提供器
  providers: [AppService, AppGateway, SignalService],
})
export class AppModule {}
