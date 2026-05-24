import { Module } from '@nestjs/common';
import { ProtocolModule } from 'src/protocol/protocol.module';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';

@Module({
  imports: [ProtocolModule],
  controllers: [ManagerController],
  providers: [ManagerService],
})
export class ManagerModule {}
