import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DeviceAllowed } from '../auth/auth.guard';

@ApiTags('Drivers - Quản lý & Đăng ký tài xế')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @DeviceAllowed()
  @ApiOperation({ summary: 'Lấy danh sách tất cả tài xế' })
  async getAll(@Req() req) {
    return this.driversService.getAllDrivers(!!req.isDevice);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một tài xế' })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.getDriverById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Đăng ký tài xế mới (kèm face embedding / avatar)' })
  async create(@Body() dto: CreateDriverDto) {
    return this.driversService.createDriver(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin tài xế' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driversService.updateDriver(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài xế' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.deleteDriver(id);
  }
}

