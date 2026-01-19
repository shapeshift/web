import { z } from "zod";

export const booleanFromString = z.preprocess(
  (val) => (val === "true" ? true : val === "false" ? false : val),
  z.boolean(),
);
