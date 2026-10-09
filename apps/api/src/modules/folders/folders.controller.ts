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
import type { CreateFolderDto, FolderDto, PatchFolderDto, SidebarDto } from "@plana/shared";
import { createFolderSchema, patchFolderSchema } from "@plana/shared";
import { CurrentUserId } from "../../common/current-user-id.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { FoldersService } from "./folders.service";

@Controller("folders")
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  /** Дерево сайдбара: папки со списками + списки без папки + Inbox (см. api.md). */
  @Get()
  getSidebar(@CurrentUserId() userId: string): Promise<SidebarDto> {
    return this.foldersService.getSidebar(userId);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createFolderSchema)) dto: CreateFolderDto,
  ): Promise<FolderDto> {
    return this.foldersService.create(userId, dto);
  }

  @Patch(":id")
  update(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) folderId: string,
    @Body(new ZodValidationPipe(patchFolderSchema)) dto: PatchFolderDto,
  ): Promise<FolderDto> {
    return this.foldersService.update(userId, folderId, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) folderId: string,
  ): Promise<void> {
    await this.foldersService.remove(userId, folderId);
  }
}
