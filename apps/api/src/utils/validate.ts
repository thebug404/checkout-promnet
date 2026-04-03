import { validate } from 'class-validator';

type ClassConstructor<T> = new (data?: Record<string, unknown>) => T;

export async function validateDto<T extends object>(
  DtoClass: ClassConstructor<T>,
  body: unknown
): Promise<string[] | null> {
  const instance = new DtoClass(body as Record<string, unknown>);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
    validationError: { target: false, value: false },
  });

  if (errors.length === 0) return null;

  const messages: string[] = [];
  for (const err of errors) {
    if (err.constraints) {
      messages.push(...Object.values(err.constraints));
    }
    if (err.children && err.children.length > 0) {
      for (const child of err.children) {
        if (child.constraints) {
          messages.push(...Object.values(child.constraints));
        }
        if (child.children && child.children.length > 0) {
          for (const grandchild of child.children) {
            if (grandchild.constraints) {
              messages.push(...Object.values(grandchild.constraints));
            }
          }
        }
      }
    }
  }

  return messages;
}
