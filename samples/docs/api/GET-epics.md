# GET /api/v1/epics

## Method

- GET

## URL

- `/api/v1/epics`

## Params

- None

## Query params

- None

## Input validation schema (Zod)

This endpoint does not accept a JSON request body.

```ts
import { z } from 'zod';

export const InputSchema = z.void();
```

## Output validation schema (Zod)

Based on the response constructed by the handler (envelope `{ success: true, data: [...] }`).

```ts
import { z } from 'zod';

export const EpicListItemSchema = z.object({
  id: z.string(),
  friendlyId: z.string(),
  title: z.string(),
  projectId: z.string(),
  projectName: z.string(),
});

export const ResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(EpicListItemSchema),
});
```

## Authentication restriction

From the handler:

- Requires authentication (cookie session or `Authorization: Bearer <token>`).
- If using an API access token (`oit_*`), it must include scope `epics:read`.
