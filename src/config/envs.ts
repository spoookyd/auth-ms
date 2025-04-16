import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  NATS_SERVERS: string[];
  DATABASE_URL: string;
  JWT_SECRET: string;
}

const envsSchema = joi
  .object({
    NATS_SERVERS: joi.array().required(),
    DATABASE_URL: joi.string().required(),
    JWT_SECRET: joi.string().required(),
  })
  .unknown(true);

const validationSchema = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});
const error: joi.ValidationError | undefined = validationSchema.error;
const value: EnvVars = validationSchema.value as EnvVars;
if (error) {
  throw new Error('Config Validation error: ' + error.message);
}

const envVars: EnvVars = value;

export const envs = {
  nats_servers: envVars.NATS_SERVERS,
  database_url: envVars.DATABASE_URL,
  jwt_secret: envVars.JWT_SECRET,
};
