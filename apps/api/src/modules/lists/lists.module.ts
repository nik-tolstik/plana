import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { ListsController } from "./lists.controller";
import { ListsService } from "./lists.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {}
