import { Body, Controller, Delete, HttpCode, Param, ParseUUIDPipe, Patch } from "@nestjs/common";
import type { PatchSectionDto, SectionDto } from "@plana/shared";
import { patchSectionSchema } from "@plana/shared";
import { CurrentUserId } from "../../common/current-user-id.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SectionsService } from "./sections.service";

@Controller("sections")
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Patch(":id")
  update(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) sectionId: string,
    @Body(new ZodValidationPipe(patchSectionSchema)) dto: PatchSectionDto,
  ): Promise<SectionDto> {
    return this.sectionsService.update(userId, sectionId, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @CurrentUserId() userId: string,
    @Param("id", ParseUUIDPipe) sectionId: string,
  ): Promise<void> {
    await this.sectionsService.remove(userId, sectionId);
  }
}
