import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { SectionsController } from "./sections.controller";
import { SectionsService } from "./sections.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SectionsController],
  providers: [SectionsService],
})
export class SectionsModule {}
