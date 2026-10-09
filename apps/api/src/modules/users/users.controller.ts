import { Body, Controller, Get, Patch } from "@nestjs/common";
import { patchMeSchema, type PatchMeDto, type UserDto } from "@plana/shared";
import { CurrentUserId } from "../../common/current-user-id.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { toUserDto, UsersService } from "./users.service";

@Controller("me")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getMe(@CurrentUserId() userId: string): Promise<UserDto> {
    return toUserDto(await this.usersService.getById(userId));
  }

  @Patch()
  async patchMe(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(patchMeSchema)) dto: PatchMeDto,
  ): Promise<UserDto> {
    return this.usersService.updateProfile(userId, dto);
  }
}
