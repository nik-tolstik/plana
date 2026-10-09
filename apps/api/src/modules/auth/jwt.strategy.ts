import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, type JwtFromRequestFunction, Strategy } from "passport-jwt";

export interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() as JwtFromRequestFunction,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "",
    });
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub };
  }
}
