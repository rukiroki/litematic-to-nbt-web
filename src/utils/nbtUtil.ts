import pako from 'pako';
import type { Tag } from '@/types/nbt';
import {
  CompoundTag, ListTag, StringTag,
  TAG_COMPOUND, TAG_BYTE, TAG_SHORT, TAG_INT, TAG_LONG,
  TAG_FLOAT, TAG_DOUBLE, TAG_BYTE_ARRAY, TAG_STRING,
  TAG_LIST, TAG_INT_ARRAY, TAG_LONG_ARRAY
} from '@/types/nbt';

export class NbtException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NbtException';
  }
}

// Calculate the size needed for writing a tag
function calculateTagSize(tag: Tag): number {
  const type = tag.getType();
  
  switch (type) {
    case TAG_BYTE: return 1;
    case TAG_SHORT: return 2;
    case TAG_INT: return 4;
    case TAG_LONG: return 8;
    case TAG_FLOAT: return 4;
    case TAG_DOUBLE: return 8;
    case TAG_BYTE_ARRAY: {
      const t = tag as import('@/types/nbt').ByteArrayTag;
      return 4 + t.values.length;
    }
    case TAG_STRING: {
      const t = tag as StringTag;
      const encoder = new TextEncoder();
      const bytes = encoder.encode(t.value);
      return 2 + bytes.length;
    }
    case TAG_LIST: {
      const t = tag as ListTag;
      let size = 1 + 4; // type + length
      for (const child of t) {
        size += calculateTagSize(child);
      }
      return size;
    }
    case TAG_COMPOUND: {
      const t = tag as CompoundTag;
      let size = 0;
      const encoder = new TextEncoder();
      for (const key of t.keySet()) {
        const child = t.get(key)!;
        size += 1; // type
        const keyBytes = encoder.encode(key);
        size += 2 + keyBytes.length; // key length + key
        size += calculateTagSize(child);
      }
      size += 1; // TAG_END
      return size;
    }
    case TAG_INT_ARRAY: {
      const t = tag as import('@/types/nbt').IntArrayTag;
      return 4 + t.values.length * 4;
    }
    case TAG_LONG_ARRAY: {
      const t = tag as import('@/types/nbt').LongArrayTag;
      return 4 + t.values.length * 8;
    }
    default:
      throw new NbtException(`Unknown tag type: ${type}`);
  }
}

// Read NBT from decompressed data
export function readNbt(data: Uint8Array): CompoundTag {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const offset = { value: 0 };
  
  const type = view.getInt8(offset.value);
  offset.value += 1;
  
  if (type !== TAG_COMPOUND) {
    throw new NbtException('File isn\'t in NBT format');
  }
  
  // Skip root name
  const nameSize = view.getUint16(offset.value, false);
  offset.value += 2 + nameSize;
  
  return CompoundTag.readContents(view, offset);
}

// Write NBT to buffer
export function writeNbt(tag: CompoundTag): Uint8Array {
  // Calculate total size: type (1) + name length (2) + name (0) + tag content
  const tagSize = calculateTagSize(tag);
  const totalSize = 1 + 2 + 0 + tagSize;
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const offset = { value: 0 };
  
  // Write type
  view.setInt8(offset.value, TAG_COMPOUND);
  offset.value += 1;
  
  // Write empty name
  view.setUint16(offset.value, 0, false);
  offset.value += 2;
  
  // Write tag content
  tag.writeContents(view, offset);
  
  return new Uint8Array(buffer);
}

// Read NBT from gzip compressed file
export function readNbtGzipped(data: Uint8Array): CompoundTag {
  const decompressed = pako.inflate(data);
  return readNbt(decompressed);
}

// Write NBT to gzip compressed buffer
export function writeNbtGzipped(tag: CompoundTag): Uint8Array {
  const uncompressed = writeNbt(tag);
  return pako.gzip(uncompressed);
}

// Convert block string to CompoundTag
export function convertFromBlockString(block: string): CompoundTag {
  const tag = new CompoundTag();
  
  if (block.includes('[')) {
    const name = block.substring(0, block.indexOf('['));
    tag.put('Name', new StringTag(name));
    
    const propertiesStr = block.substring(block.indexOf('[') + 1, block.indexOf(']'));
    const properties = new CompoundTag();
    
    for (const property of propertiesStr.split(',')) {
      const [key, value] = property.split('=');
      properties.put(key, new StringTag(value));
    }
    
    tag.put('Properties', properties);
  } else {
    tag.put('Name', new StringTag(block));
  }
  
  return tag;
}

// Convert CompoundTag to block string
export function convertToBlockString(entry: CompoundTag): string {
  const sb: string[] = [];
  sb.push(entry.getString('Name'));
  
  if (entry.contains('Properties', TAG_COMPOUND)) {
    const properties = entry.getCompound('Properties');
    sb.push('[');
    
    const keys = Array.from(properties.keySet());
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      sb.push(key);
      sb.push('=');
      sb.push(properties.getString(key));
      if (i < keys.length - 1) {
        sb.push(',');
      }
    }
    sb.push(']');
  }
  
  return sb.join('');
}
