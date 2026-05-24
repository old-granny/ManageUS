import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeviceModule } from './device/device.module';
import { ProtocolModule } from './protocol/protocol.module';

@Module({
  imports: [DeviceModule, ProtocolModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
