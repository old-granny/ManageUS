import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// =============================================================================
// TimelineController
//
// POST /timeline/send
//   Accepts a multipart/form-data POST with a single field named "file"
//   containing the timeline.zip built by the React frontend.
//
//   The ZIP is saved to  uploads/timeline.zip  (relative to the process cwd,
//   which is /app inside the Docker container).
//
//   The Raspberry Pi can then retrieve it via:
//     GET /timeline/download   (not yet implemented — Pi can also poll /timeline/send
//                               or be triggered via SSH / WebSocket in the future)
// =============================================================================

@Controller('timeline')
export class TimelineController {

  @Post('send')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination(_req, _file, cb) {
          // Create the uploads/ directory if it doesn't exist yet
          const dir = path.join(process.cwd(), 'uploads');
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename(_req, _file, cb) {
          // Always overwrite with the same name so the Pi always fetches the latest
          cb(null, 'timeline.zip');
        },
      }),
      // Limit to 100 MB — large enough for any stage media package
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  receiveSend(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    console.log(`[Timeline] Saved ${file.size} bytes → ${file.path}`);
    return { ok: true, savedTo: file.path, sizeBytes: file.size };
  }
}
