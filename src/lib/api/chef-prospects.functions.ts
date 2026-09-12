import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublicChefProspects = createServerFn({ method: "POST" })
  .validator(z.object({}))
  .handler(async () => {
    const { loadPublicChefProspects } = await import("@/lib/chef-prospects.server");
    return loadPublicChefProspects();
  });
