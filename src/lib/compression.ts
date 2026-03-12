// Response Compression Utilities
// Reduces payload size for low bandwidth scenarios

import { gzip, deflate } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const deflateAsync = promisify(deflate);

export async function compressResponse(
  data: any,
  acceptEncoding?: string
): Promise<{ data: Buffer | string; encoding?: string }> {
  const jsonString = JSON.stringify(data);
  const size = Buffer.byteLength(jsonString);

  // Only compress if response is larger than 1KB
  if (size < 1024) {
    return { data: jsonString };
  }

  try {
    if (acceptEncoding?.includes('gzip')) {
      const compressed = await gzipAsync(jsonString);
      return { data: compressed, encoding: 'gzip' };
    } else if (acceptEncoding?.includes('deflate')) {
      const compressed = await deflateAsync(jsonString);
      return { data: compressed, encoding: 'deflate' };
    }
  } catch (error) {
    console.error('Compression error:', error);
  }

  return { data: jsonString };
}

// Selective field filtering to reduce payload
export function selectFields<T extends Record<string, any>>(
  data: T | T[],
  fields?: string[]
): Partial<T> | Partial<T>[] {
  if (!fields || fields.length === 0) {
    return data;
  }

  const filterObject = (obj: T): Partial<T> => {
    const filtered: Partial<T> = {};
    fields.forEach((field) => {
      if (field in obj) {
        filtered[field as keyof T] = obj[field];
      }
    });
    return filtered;
  };

  return Array.isArray(data)
    ? data.map(filterObject)
    : filterObject(data);
}
