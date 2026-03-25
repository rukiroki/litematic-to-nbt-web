// NBT Tag Type Constants
export const TAG_END = 0;
export const TAG_BYTE = 1;
export const TAG_SHORT = 2;
export const TAG_INT = 3;
export const TAG_LONG = 4;
export const TAG_FLOAT = 5;
export const TAG_DOUBLE = 6;
export const TAG_BYTE_ARRAY = 7;
export const TAG_STRING = 8;
export const TAG_LIST = 9;
export const TAG_COMPOUND = 10;
export const TAG_INT_ARRAY = 11;
export const TAG_LONG_ARRAY = 12;

// NBT Tag Interfaces
export interface Tag {
  getType(): number;
  writeContents(view: DataView, offset: { value: number }): void;
}

// Byte Tag
export class ByteTag implements Tag {
  value: number;
  
  constructor(value: number) {
    this.value = value;
  }
  
  getType(): number { return TAG_BYTE; }
  
  writeContents(view: DataView, offset: { value: number }): void {
    view.setInt8(offset.value, this.value);
    offset.value += 1;
  }
  
  static readContents(view: DataView, offset: { value: number }): ByteTag {
    const value = view.getInt8(offset.value);
    offset.value += 1;
    return new ByteTag(value);
  }
}

// Short Tag
export class ShortTag implements Tag {
  value: number;
  
  constructor(value: number) {
    this.value = value;
  }
  
  getType(): number { return TAG_SHORT; }
  
  writeContents(view: DataView, offset: { value: number }): void {
    view.setInt16(offset.value, this.value, false);
    offset.value += 2;
  }
  
  static readContents(view: DataView, offset: { value: number }): ShortTag {
    const value = view.getInt16(offset.value, false);
    offset.value += 2;
    return new ShortTag(value);
  }
}

// Int Tag
export class IntTag implements Tag {
  value: number;
  
  constructor(value: number) {
    this.value = value;
  }
  
  getType(): number { return TAG_INT; }
  
  writeContents(view: DataView, offset: { value: number }): void {
    view.setInt32(offset.value, this.value, false);
    offset.value += 4;
  }
  
  static readContents(view: DataView, offset: { value: number }): IntTag {
    const value = view.getInt32(offset.value, false);
    offset.value += 4;
    return new IntTag(value);
  }
}

// Long Tag
export class LongTag implements Tag {
  value: bigint;
  
  constructor(value: bigint) {
    this.value = value;
  }
  
  getType(): number { return TAG_LONG; }
  
  writeContents(view: DataView, offset: { value: number }): void {
    view.setBigInt64(offset.value, this.value, false);
    offset.value += 8;
  }
  
  static readContents(view: DataView, offset: { value: number }): LongTag {
    const value = view.getBigInt64(offset.value, false);
    offset.value += 8;
    return new LongTag(value);
  }
}

// Float Tag
export class FloatTag implements Tag {
  value: number;
  
  constructor(value: number) {
    this.value = value;
  }
  
  getType(): number { return TAG_FLOAT; }
  
  writeContents(view: DataView, offset: { value: number }): void {
    view.setFloat32(offset.value, this.value, false);
    offset.value += 4;
  }
  
  static readContents(view: DataView, offset: { value: number }): FloatTag {
    const value = view.getFloat32(offset.value, false);
    offset.value += 4;
    return new FloatTag(value);
  }
}

// Double Tag
export class DoubleTag implements Tag {
  value: number;
  
  constructor(value: number) {
    this.value = value;
  }
  
  getType(): number { return TAG_DOUBLE; }
  
  writeContents(view: DataView, offset: { value: number }): void {
    view.setFloat64(offset.value, this.value, false);
    offset.value += 8;
  }
  
  static readContents(view: DataView, offset: { value: number }): DoubleTag {
    const value = view.getFloat64(offset.value, false);
    offset.value += 8;
    return new DoubleTag(value);
  }
}

// Byte Array Tag
export class ByteArrayTag implements Tag {
  values: Int8Array;
  
  constructor(values: Int8Array) {
    this.values = values;
  }
  
  getType(): number { return TAG_BYTE_ARRAY; }
  
  writeContents(view: DataView, offset: { value: number }): void {
    view.setInt32(offset.value, this.values.length, false);
    offset.value += 4;
    for (let i = 0; i < this.values.length; i++) {
      view.setInt8(offset.value + i, this.values[i]);
    }
    offset.value += this.values.length;
  }
  
  static readContents(view: DataView, offset: { value: number }): ByteArrayTag {
    const size = view.getInt32(offset.value, false);
    offset.value += 4;
    const values = new Int8Array(size);
    for (let i = 0; i < size; i++) {
      values[i] = view.getInt8(offset.value + i);
    }
    offset.value += size;
    return new ByteArrayTag(values);
  }
}

// String Tag
export class StringTag implements Tag {
  value: string;
  
  constructor(value: string) {
    this.value = value;
  }
  
  getType(): number { return TAG_STRING; }
  
  writeContents(view: DataView, offset: { value: number }): void {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(this.value);
    view.setUint16(offset.value, bytes.length, false);
    offset.value += 2;
    for (let i = 0; i < bytes.length; i++) {
      view.setUint8(offset.value + i, bytes[i]);
    }
    offset.value += bytes.length;
  }
  
  static readContents(view: DataView, offset: { value: number }): StringTag {
    const size = view.getUint16(offset.value, false);
    offset.value += 2;
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      bytes[i] = view.getUint8(offset.value + i);
    }
    offset.value += size;
    const decoder = new TextDecoder('UTF-8');
    return new StringTag(decoder.decode(bytes));
  }
}

// List Tag
export class ListTag implements Tag, Iterable<Tag> {
  private tags: Tag[] = [];
  elementType: number;
  
  constructor(elementType: number) {
    this.elementType = elementType;
  }
  
  getType(): number { return TAG_LIST; }
  
  add(tag: Tag): void {
    if (tag.getType() !== this.elementType) {
      throw new Error(`Type mismatch: Attempted to insert tag of type ${tag.getType()} into list of type ${this.elementType}`);
    }
    this.tags.push(tag);
  }
  
  size(): number {
    return this.tags.length;
  }
  
  get(index: number): Tag {
    return this.tags[index];
  }
  
  *[Symbol.iterator](): Iterator<Tag> {
    yield* this.tags;
  }
  
  writeContents(view: DataView, offset: { value: number }): void {
    view.setInt8(offset.value, this.elementType);
    offset.value += 1;
    view.setInt32(offset.value, this.tags.length, false);
    offset.value += 4;
    for (const tag of this.tags) {
      tag.writeContents(view, offset);
    }
  }
  
  static readContents(view: DataView, offset: { value: number }): ListTag {
    const type = view.getInt8(offset.value);
    offset.value += 1;
    const size = view.getInt32(offset.value, false);
    offset.value += 4;
    const list = new ListTag(type);
    for (let i = 0; i < size; i++) {
      list.add(readTagByType(type, view, offset));
    }
    return list;
  }
}

// Compound Tag
export class CompoundTag implements Tag {
  private tags: Map<string, Tag> = new Map();
  
  getType(): number { return TAG_COMPOUND; }
  
  put(key: string, tag: Tag): void {
    this.tags.set(key, tag);
  }
  
  get(key: string): Tag | undefined {
    return this.tags.get(key);
  }
  
  contains(key: string, type?: number): boolean {
    const tag = this.tags.get(key);
    if (type === undefined) return tag !== undefined;
    return tag !== undefined && tag.getType() === type;
  }
  
  keySet(): IterableIterator<string> {
    return this.tags.keys();
  }
  
  getByte(key: string): number {
    return (this.tags.get(key) as ByteTag).value;
  }
  
  getShort(key: string): number {
    return (this.tags.get(key) as ShortTag).value;
  }
  
  getInt(key: string): number {
    return (this.tags.get(key) as IntTag).value;
  }
  
  getLong(key: string): bigint {
    return (this.tags.get(key) as LongTag).value;
  }
  
  getFloat(key: string): number {
    return (this.tags.get(key) as FloatTag).value;
  }
  
  getDouble(key: string): number {
    return (this.tags.get(key) as DoubleTag).value;
  }
  
  getString(key: string): string {
    return (this.tags.get(key) as StringTag).value;
  }
  
  getByteArray(key: string): Int8Array {
    return (this.tags.get(key) as ByteArrayTag).values;
  }
  
  getIntArray(key: string): Int32Array {
    return (this.tags.get(key) as IntArrayTag).values;
  }
  
  getLongArray(key: string): BigInt64Array {
    return (this.tags.get(key) as LongArrayTag).values;
  }
  
  getList(key: string): ListTag {
    return this.tags.get(key) as ListTag;
  }
  
  getCompound(key: string): CompoundTag {
    return this.tags.get(key) as CompoundTag;
  }
  
  remove(key: string): void {
    this.tags.delete(key);
  }
  
  writeContents(view: DataView, offset: { value: number }): void {
    for (const [key, tag] of this.tags) {
      view.setInt8(offset.value, tag.getType());
      offset.value += 1;
      const encoder = new TextEncoder();
      const bytes = encoder.encode(key);
      view.setUint16(offset.value, bytes.length, false);
      offset.value += 2;
      for (let i = 0; i < bytes.length; i++) {
        view.setUint8(offset.value + i, bytes[i]);
      }
      offset.value += bytes.length;
      tag.writeContents(view, offset);
    }
    view.setInt8(offset.value, TAG_END);
    offset.value += 1;
  }
  
  static readContents(view: DataView, offset: { value: number }): CompoundTag {
    const result = new CompoundTag();
    while (true) {
      const type = view.getInt8(offset.value);
      offset.value += 1;
      if (type === TAG_END) break;
      const keySize = view.getUint16(offset.value, false);
      offset.value += 2;
      const bytes = new Uint8Array(keySize);
      for (let i = 0; i < keySize; i++) {
        bytes[i] = view.getUint8(offset.value + i);
      }
      offset.value += keySize;
      const decoder = new TextDecoder('UTF-8');
      const key = decoder.decode(bytes);
      result.put(key, readTagByType(type, view, offset));
    }
    return result;
  }
}

// Int Array Tag
export class IntArrayTag implements Tag {
  values: Int32Array;
  
  constructor(values: Int32Array) {
    this.values = values;
  }
  
  getType(): number { return TAG_INT_ARRAY; }
  
  writeContents(view: DataView, offset: { value: number }): void {
    view.setInt32(offset.value, this.values.length, false);
    offset.value += 4;
    for (let i = 0; i < this.values.length; i++) {
      view.setInt32(offset.value + i * 4, this.values[i], false);
    }
    offset.value += this.values.length * 4;
  }
  
  static readContents(view: DataView, offset: { value: number }): IntArrayTag {
    const size = view.getInt32(offset.value, false);
    offset.value += 4;
    const values = new Int32Array(size);
    for (let i = 0; i < size; i++) {
      values[i] = view.getInt32(offset.value + i * 4, false);
    }
    offset.value += size * 4;
    return new IntArrayTag(values);
  }
}

// Long Array Tag
export class LongArrayTag implements Tag {
  values: BigInt64Array;
  
  constructor(values: BigInt64Array) {
    this.values = values;
  }
  
  getType(): number { return TAG_LONG_ARRAY; }
  
  writeContents(view: DataView, offset: { value: number }): void {
    view.setInt32(offset.value, this.values.length, false);
    offset.value += 4;
    for (let i = 0; i < this.values.length; i++) {
      view.setBigInt64(offset.value + i * 8, this.values[i], false);
    }
    offset.value += this.values.length * 8;
  }
  
  static readContents(view: DataView, offset: { value: number }): LongArrayTag {
    const size = view.getInt32(offset.value, false);
    offset.value += 4;
    const values = new BigInt64Array(size);
    for (let i = 0; i < size; i++) {
      values[i] = view.getBigInt64(offset.value + i * 8, false);
    }
    offset.value += size * 8;
    return new LongArrayTag(values);
  }
}

// End Tag
export class EndTag implements Tag {
  static INSTANCE = new EndTag();
  
  getType(): number { return TAG_END; }
  
  writeContents(_view: DataView, _offset: { value: number }): void {
    // Nothing to write
  }
}

// Read tag by type
export function readTagByType(type: number, view: DataView, offset: { value: number }): Tag {
  switch (type) {
    case TAG_END: return EndTag.INSTANCE;
    case TAG_BYTE: return ByteTag.readContents(view, offset);
    case TAG_SHORT: return ShortTag.readContents(view, offset);
    case TAG_INT: return IntTag.readContents(view, offset);
    case TAG_LONG: return LongTag.readContents(view, offset);
    case TAG_FLOAT: return FloatTag.readContents(view, offset);
    case TAG_DOUBLE: return DoubleTag.readContents(view, offset);
    case TAG_BYTE_ARRAY: return ByteArrayTag.readContents(view, offset);
    case TAG_STRING: return StringTag.readContents(view, offset);
    case TAG_LIST: return ListTag.readContents(view, offset);
    case TAG_COMPOUND: return CompoundTag.readContents(view, offset);
    case TAG_INT_ARRAY: return IntArrayTag.readContents(view, offset);
    case TAG_LONG_ARRAY: return LongArrayTag.readContents(view, offset);
    default: throw new Error(`Unknown tag type: ${type}`);
  }
}
