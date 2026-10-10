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
} from "@nestjs/common";
import type {
  CreateListDto,
  CreateSectionDto,
  ListDto,
  PatchListDto,
  SectionDto,
} from "@plana/shared";
import { createListSchema, createSectionSchema, patchListSchema } from "@plana/shared";
import { CurrentUserId } from "../../common/current-user-id.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ListsService } from "./lists.service";

@Controller()
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post("lists")
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createListSchema)) dto: CreateListDto,
  ): Promise<ListDto> {
    return this.listsService.create(userId, dto);
  }

  @Patch("lists/:id")
  update(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) listId: string,
    @Body(new ZodValidationPipe(patchListSchema)) dto: PatchListDto,
  ): Promise<ListDto> {
    return this.listsService.update(userId, listId, dto);
  }

  @Delete("lists/:id")
  @HttpCode(204)
  async trash(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) listId: string,
  ): Promise<void> {
    await this.listsService.trash(userId, listId);
  }

  @Post("lists/:id/restore")
  @HttpCode(200)
  restore(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) listId: string,
  ): Promise<ListDto> {
    return this.listsService.restore(userId, listId);
  }

  @Post("lists/:id/sections")
  createSection(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) listId: string,
    @Body(new ZodValidationPipe(createSectionSchema)) dto: CreateSectionDto,
  ): Promise<SectionDto> {
    return this.listsService.createSection(userId, listId, dto);
  }

  @Get("lists/:id/sections")
  listSections(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) listId: string,
  ): Promise<SectionDto[]> {
    return this.listsService.listSections(userId, listId);
  }
}
