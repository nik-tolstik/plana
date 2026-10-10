import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { HabitsController } from "./habits.controller";
import { HabitsService } from "./habits.service";

@Module({
  imports: [DatabaseModule],
  controllers: [HabitsController],
  providers: [HabitsService],
})
export class HabitsModule {}
