# GET /api/v1/documents/:documentId

## Method

- GET

## URL

- `/api/v1/documents/:documentId`

## Params

- `documentId`: string

## Query params

From the handler (`request.nextUrl.searchParams`):

- `include`: string
  - If it contains `sections`, the response includes root sections with nested subsections.

## Input validation schema (Zod)

This endpoint does not accept a JSON request body.

```ts
import { z } from 'zod';

export const InputSchema = z.void();
```

## Output validation schema (Zod)

Returns a document. If `include` contains `sections`, the response includes `sections` (root sections only) with `subsections`.

The handler uses `createSuccessResponse`, so the request id is set via the `X-Request-ID` response header (not in the JSON body).

Note: the handler normalizes:

- `type`: DB `ux_design` is returned as `ux-design`.
- `status`: DB `in_progress` is returned as `in-progress` (underscores replaced with hyphens).

```ts
import { z } from 'zod';

export const DocumentStatusSchema = z.enum([
  'draft',
  'in-progress',
  'in-review',
  'approved',
  'locked',
  'archived',
]);

export const DocumentTypeSchema = z.enum([
  'prd',
  'architecture',
  'ux-design',
  'product-brief',
  'project-context',
  'research',
  'brainstorming',
  'tech-spec',
  'test-plan',
  'test-design',
  'project-docs',
  'retrospective',
]);

export const DocumentSectionSchema = z
  .object({
    id: z.string(),
    documentId: z.string(),
    sectionKey: z.string(),
    title: z.string(),
    content: z.string(),
    order: z.number().int(),
    parentSectionId: z.string().nullable().optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
    subsections: z.array(z.any()).optional(),
  })
  .passthrough();

export const DocumentSchema = z
  .object({
    id: z.string(),
    type: DocumentTypeSchema,
    title: z.string(),
    status: DocumentStatusSchema,
    metadata: z.record(z.string(), z.any()).optional(),
    sections: z.array(DocumentSectionSchema).optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
  })
  .passthrough();

export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: DocumentSchema,
  message: z.string().optional(),
  meta: z.any().optional(),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
}).passthrough();

export const ResponseSchema = z.union([SuccessResponseSchema, ErrorResponseSchema]);
```

## Authentication restriction

From the handler:

- Requires authentication (cookie session or `Authorization: Bearer <token>`).
- If using an API token (`oit_*`), it must include scope `documents:read`.
