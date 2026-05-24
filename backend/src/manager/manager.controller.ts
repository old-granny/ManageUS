import {Body, Controller, Post, UploadedFile, UseInterceptors,} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ManagerService } from './manager.service';


// nom du controller
@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post('connect') // La route pour post un connect, contient seulement un hello
  connect(@Body() body: { code: string }): { message: string } {
    return this.managerService.connect(Number(body.code));
  }

  // Ici on passe un fichier en multer
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(@UploadedFile() file: Express.Multer.File): { message: string } {
    return this.managerService.uploadZip(file.buffer);
  }

  // Send pour comfirmer l'envoie du zip
  @Post('send')
  send(): { message: string } {
    return this.managerService.sendZip();
  }

  // Start pour lancer la sequence du fichier .zip
  @Post('start')
  start(): { message: string } {
    return this.managerService.startSequence();
  }


  // stopper la sequence de la timeline
  @Post('stop')
  stop(): { message: string } {
    return this.managerService.stopSequence();
  }

  // Reset la timeline
  @Post('reset')
  reset(): { message: string } {
    return this.managerService.reset();
  }
}
