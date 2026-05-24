import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ManagerService } from './manager.service';

@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post('connect')
  connect(@Body() body: { code: string }): { message: string } {
    return this.managerService.connect(Number(body.code));
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(@UploadedFile() file: Express.Multer.File): { message: string } {
    return this.managerService.uploadZip(file.buffer);
  }

  @Post('send')
  send(): { message: string } {
    return this.managerService.sendZip();
  }

  @Post('start')
  start(): { message: string } {
    return this.managerService.startSequence();
  }

  @Post('stop')
  stop(): { message: string } {
    return this.managerService.stopSequence();
  }

  @Post('reset')
  reset(): { message: string } {
    return this.managerService.reset();
  }
}
