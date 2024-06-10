import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiService } from './api.service';

@Controller('user')
export class ApiController {
    constructor(private readonly apiService: ApiService) { }

    @ApiTags('user')
    @Get()
    @ApiOperation({ summary: 'Generate QR code from a scan user' })
    async getQRCode(@Res() res: Response): Promise<void> {
        const qrCodeBuffer = await this.apiService.generateQRCode();
        res.setHeader('Content-Type', 'image/png');
        res.send(qrCodeBuffer);
    }
}
