import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GreetingModule } from './modules/greeting/greeting.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [GreetingModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
