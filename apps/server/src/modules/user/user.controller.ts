import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { CreateUserInput } from './create-user.input';
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
  create(@Body() input: CreateUserInput): User {
    return this.userService.create(input);
  }
}
