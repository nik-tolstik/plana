import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import type { CreateSubtaskDto, PatchSubtaskDto, SubtaskDto, TaskDto } from "@plana/shared";
import { createSubtaskSchema, patchSubtaskSchema } from "@plana/shared";
import { CurrentUserId } from "../../common/current-user-id.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { TasksService } from "./tasks.service";

/** Подзадачи — часть агрегата задачи (docs/architecture/api.md). */
@Controller()
export class SubtasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post("tasks/:taskId/subtasks")
  create(
    @CurrentUserId() userId: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body(new ZodValidationPipe(createSubtaskSchema)) dto: CreateSubtaskDto,
  ): Promise<SubtaskDto> {
    return this.tasksService.createSubtask(userId, taskId, dto);
  }

  /** Подзадача становится отдельной задачей сразу после родительской. */
  @Post("subtasks/:id/promote")
  @HttpCode(200)
  promote(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) subtaskId: string,
  ): Promise<TaskDto> {
    return this.tasksService.promoteSubtask(userId, subtaskId);
  }

  @Patch("subtasks/:id")
  update(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) subtaskId: string,
    @Body(new ZodValidationPipe(patchSubtaskSchema)) dto: PatchSubtaskDto,
  ): Promise<SubtaskDto> {
    return this.tasksService.updateSubtask(userId, subtaskId, dto);
  }

  @Delete("subtasks/:id")
  @HttpCode(204)
  async remove(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) subtaskId: string,
  ): Promise<void> {
    await this.tasksService.removeSubtask(userId, subtaskId);
  }
}
