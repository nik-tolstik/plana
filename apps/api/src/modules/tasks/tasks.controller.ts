import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type {
  BatchResultDto,
  BatchTasksDto,
  CreateTaskDto,
  ParsedQuickAddDto,
  ParseQuickAddRequestDto,
  PatchTaskDto,
  TaskDto,
  TaskListDto,
  TasksQuery,
} from "@plana/shared";
import {
  batchTasksSchema,
  createTaskSchema,
  parseQuickAddRequestSchema,
  patchTaskSchema,
  tasksQuerySchema,
} from "@plana/shared";
import { CurrentUserId } from "../../common/current-user-id.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { TasksService } from "./tasks.service";

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get("tasks")
  findMany(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(tasksQuerySchema)) query: TasksQuery,
  ): Promise<TaskListDto> {
    return this.tasksService.findMany(userId, query);
  }

  @Post("tasks")
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createTaskSchema)) dto: CreateTaskDto,
  ): Promise<TaskDto> {
    return this.tasksService.create(userId, dto);
  }

  @Post("tasks/parse")
  parse(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(parseQuickAddRequestSchema)) dto: ParseQuickAddRequestDto,
  ): Promise<ParsedQuickAddDto> {
    return this.tasksService.parse(userId, dto.text);
  }

  @Post("tasks/batch")
  @HttpCode(200)
  batch(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(batchTasksSchema)) dto: BatchTasksDto,
  ): Promise<BatchResultDto> {
    return this.tasksService.batch(userId, dto);
  }

  @Get("tasks/:id")
  findOne(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) taskId: string,
  ): Promise<TaskDto> {
    return this.tasksService.findOne(userId, taskId);
  }

  @Patch("tasks/:id")
  update(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) taskId: string,
    @Body(new ZodValidationPipe(patchTaskSchema)) dto: PatchTaskDto,
  ): Promise<TaskDto> {
    return this.tasksService.update(userId, taskId, dto);
  }

  @Delete("tasks/:id")
  @HttpCode(204)
  async trash(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) taskId: string,
    @Query("purge", new ParseBoolPipe({ optional: true })) purge?: boolean,
  ): Promise<void> {
    if (purge) {
      await this.tasksService.purge(userId, taskId);
      return;
    }
    await this.tasksService.trash(userId, taskId);
  }

  @Post("tasks/:id/restore")
  @HttpCode(200)
  restore(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) taskId: string,
  ): Promise<TaskDto> {
    return this.tasksService.restore(userId, taskId);
  }

  @Post("tasks/:id/complete")
  @HttpCode(200)
  complete(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) taskId: string,
  ): Promise<TaskDto> {
    return this.tasksService.complete(userId, taskId);
  }

  @Post("tasks/:id/uncomplete")
  @HttpCode(200)
  uncomplete(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) taskId: string,
  ): Promise<TaskDto> {
    return this.tasksService.uncomplete(userId, taskId);
  }
}
