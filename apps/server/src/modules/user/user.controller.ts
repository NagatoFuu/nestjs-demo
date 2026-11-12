import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import type { User } from './user.interface';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(): User[] {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): User {
    return this.userService.findOne(id);
  }

  @Post()
  create(@Body() input: unknown): User {
    return this.userService.create(input);
  }

  @Put(':id')
  replace(@Param('id') id: string, @Body() input: unknown): User {
    return this.userService.replace(id, input);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: unknown): User {
    return this.userService.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): void {
    this.userService.remove(id);
  }
}
