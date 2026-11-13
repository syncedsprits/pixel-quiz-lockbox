import { queryOptions } from "@tanstack/react-query";

import { getAccessStatus } from "./access-client";

export const accessStatusQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["project-access", projectId],
    queryFn: () => getAccessStatus({ data: { projectId } }),
    staleTime: 0,
  });
