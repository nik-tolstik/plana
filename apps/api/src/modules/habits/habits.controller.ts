import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import type {
  CreateHabitDto,
  HabitEntryDto,
  HabitWithEntriesDto,
  PatchHabitDto,
  SetHabitEntryDto,
} from "@plana/shared";
import {
  createHabitSchema,
  dayStringSchema,
  patchHabitSchema,
  setHabitEntrySchema,
} from "@plana/shared";
import { CurrentUserId } from "../../common/current-user-id.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { HabitsService } from "./habits.service";

@Controller()
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Get("habits")
  findAll(@CurrentUserId() userId: string): Promise<HabitWithEntriesDto[]> {
    return this.habitsService.findAll(userId);
  }

  @Post("habits")
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createHabitSchema)) dto: CreateHabitDto,
  ): Promise<HabitWithEntriesDto> {
    return this.habitsService.create(userId, dto);
  }

  @Patch("habits/:id")
  update(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) habitId: string,
    @Body(new ZodValidationPipe(patchHabitSchema)) dto: PatchHabitDto,
  ): Promise<HabitWithEntriesDto> {
    return this.habitsService.update(userId, habitId, dto);
  }

  @Delete("habits/:id")
  @HttpCode(204)
  async remove(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) habitId: string,
  ): Promise<void> {
    await this.habitsService.remove(userId, habitId);
  }

  @Put("habits/:id/entries/:date")
  setEntry(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) habitId: string,
    @Param("date", new ZodValidationPipe(dayStringSchema)) date: string,
    @Body(new ZodValidationPipe(setHabitEntrySchema)) dto: SetHabitEntryDto,
  ): Promise<HabitEntryDto> {
    return this.habitsService.setEntry(userId, habitId, date, dto);
  }

  @Delete("habits/:id/entries/:date")
  @HttpCode(204)
  async deleteEntry(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) habitId: string,
    @Param("date", new ZodValidationPipe(dayStringSchema)) date: string,
  ): Promise<void> {
    await this.habitsService.deleteEntry(userId, habitId, date);
  }
}
