import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../db/database.module";
import { SubtasksController } from "./subtasks.controller";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [DatabaseModule],
  controllers: [TasksController, SubtasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
