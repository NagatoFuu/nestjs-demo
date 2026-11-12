import { Module } from '@nestjs/common';
import { InMemoryUserRepository } from './in-memory-user.repository';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, InMemoryUserRepository],
})
export class UserModule {}
