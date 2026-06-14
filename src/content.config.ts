import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const metadataDefinition = () =>
  z
    .object({
      title: z.string().optional(),
      ignoreTitleTemplate: z.boolean().optional(),
      canonical: z.url().optional(),
      robots: z
        .object({
          index: z.boolean().optional(),
          follow: z.boolean().optional(),
        })
        .optional(),
      description: z.string().optional(),
      openGraph: z
        .object({
          url: z.string().optional(),
          siteName: z.string().optional(),
          images: z
            .array(
              z.object({
                url: z.string(),
                width: z.number().optional(),
                height: z.number().optional(),
              })
            )
            .optional(),
          locale: z.string().optional(),
          type: z.string().optional(),
        })
        .optional(),
      twitter: z
        .object({
          handle: z.string().optional(),
          site: z.string().optional(),
          cardType: z.string().optional(),
        })
        .optional(),
    })
    .optional();

const serviceCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    finishType: z.string(),
    image: z.string().optional(),
    order: z.number().optional(),
    metadata: metadataDefinition(),
  }),
});

const projectCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
    metadata: metadataDefinition(),
  }),
});

const serviceAreaCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/service-areas' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishWhenConfirmed: z.boolean().default(false),
    metadata: metadataDefinition(),
  }),
});

export const collections = {
  services: serviceCollection,
  projects: projectCollection,
  serviceAreas: serviceAreaCollection,
};
