import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";

@Module({
  imports: [DatabaseModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
