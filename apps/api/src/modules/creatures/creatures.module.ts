import { Module } from '@nestjs/common';
import { CreaturesController } from './creatures.controller';
import { CreaturesService } from './creatures.service';

@Module({
  controllers: [CreaturesController],
  providers: [CreaturesService],
  exports: [CreaturesService],
})
export class CreaturesModule {}
