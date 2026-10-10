import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
} from "@nestjs/common";
import type { PatchTagDto, TagDto } from "@plana/shared";
import { patchTagSchema } from "@plana/shared";
import { CurrentUserId } from "../../common/current-user-id.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { TagsService } from "./tags.service";

@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get("tags")
  findAll(@CurrentUserId() userId: string): Promise<TagDto[]> {
    return this.tagsService.findAll(userId);
  }

  @Patch("tags/:id")
  update(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) tagId: string,
    @Body(new ZodValidationPipe(patchTagSchema)) dto: PatchTagDto,
  ): Promise<TagDto> {
    return this.tagsService.update(userId, tagId, dto);
  }

  @Delete("tags/:id")
  @HttpCode(204)
  async remove(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) tagId: string,
  ): Promise<void> {
    await this.tagsService.remove(userId, tagId);
  }
}
