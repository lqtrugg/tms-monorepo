import passport from 'passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';

import config from '../config.js';
import { AppDataSource } from '../data-source.js';
import { Teacher } from '../entities/index.js';
import type { AuthTokenPayload } from '../types/auth.types.js';

export function configurePassport(): typeof passport {
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.auth.jwtSecret,
        issuer: config.auth.jwtIssuer,
        audience: config.auth.jwtAudience,
      },
      async (payload: AuthTokenPayload, done) => {
        try {
          const teacher = await AppDataSource.getRepository(Teacher).findOneBy({
            id: payload.sub,
          });

          if (!teacher) {
            return done(null, false);
          }

          return done(null, teacher);
        } catch (error) {
          return done(error, false);
        }
      },
    ),
  );

  return passport;
}
