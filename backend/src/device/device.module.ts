import { Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { ProtocolModule } from 'src/protocol/protocol.module';


@Module({
  imports: [ProtocolModule],
  controllers: [DeviceController],
  providers: [DeviceService],
})
export class DeviceModule {}
