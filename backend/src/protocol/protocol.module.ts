import { Module }           from '@nestjs/common';
import { ProtocolGateway }  from './protocol.gateway';
import { ProtocolService } from './protocol.service';

@Module({
  providers: [ProtocolGateway, ProtocolService],
  exports: [ProtocolService]
})
export class ProtocolModule {}