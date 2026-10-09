import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { FoldersController } from "./folders.controller";
import { FoldersService } from "./folders.service";

@Module({
  imports: [DatabaseModule],
  controllers: [FoldersController],
  providers: [FoldersService],
})
export class FoldersModule {}
