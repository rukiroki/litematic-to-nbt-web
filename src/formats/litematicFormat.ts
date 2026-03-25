import { 
  CompoundTag, ListTag, IntTag, LongArrayTag, StringTag, LongTag, DoubleTag,
  TAG_COMPOUND, TAG_DOUBLE
} from '@/types/nbt';
import { Schematic, SchematicBuilder } from '@/types/schematic';
import { readNbtGzipped, convertToBlockString } from '@/utils/nbtUtil';

export class ConversionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionException';
  }
}

// BitSet implementation for JavaScript
class BitSet {
  private bits: boolean[] = [];

  set(index: number, value: boolean = true): void {
    this.bits[index] = value;
  }

  get(index: number): boolean {
    return this.bits[index] || false;
  }

  toLongArray(): bigint[] {
    const longs: bigint[] = [];
    const numLongs = Math.ceil(this.bits.length / 64);
    
    for (let i = 0; i < numLongs; i++) {
      let value = BigInt(0);
      for (let j = 0; j < 64; j++) {
        const bitIndex = i * 64 + j;
        if (this.bits[bitIndex]) {
          value |= BigInt(1) << BigInt(j);
        }
      }
      longs.push(value);
    }
    
    return longs;
  }

  static fromLongArray(longs: BigInt64Array, totalBits: number): BitSet {
    const bits = new BitSet();
    
    for (let i = 0; i < longs.length; i++) {
      const longValue = longs[i];
      for (let j = 0; j < 64 && i * 64 + j < totalBits; j++) {
        if ((longValue & (BigInt(1) << BigInt(j))) !== BigInt(0)) {
          bits.set(i * 64 + j, true);
        }
      }
    }
    
    return bits;
  }
}

// BlockStateContainer for packing/unpacking block states
class BlockStateContainer {
  private bits: BitSet;
  private bitsPerValue: number;
  private numBits: number;

  constructor(bits: BitSet, bitsPerValue: number, numBits: number) {
    this.bits = bits;
    this.bitsPerValue = bitsPerValue;
    this.numBits = numBits;
  }

  static fromPaletteSize(paletteSize: number): BlockStateContainer {
    const bitsPerValue = Math.max(2, 32 - Math.clz32(paletteSize - 1));
    return new BlockStateContainer(new BitSet(), bitsPerValue, 0);
  }

  static fromLongArray(longs: BigInt64Array, size: [number, number, number], paletteSize: number): BlockStateContainer {
    const bitsPerValue = Math.max(2, 32 - Math.clz32(paletteSize - 1));
    const totalValues = size[0] * size[1] * size[2];
    const totalBits = totalValues * bitsPerValue;
    
    const bits = BitSet.fromLongArray(longs, totalBits);
    return new BlockStateContainer(bits, bitsPerValue, totalBits);
  }

  addBlockState(blockState: number): void {
    for (let i = 0; i < this.bitsPerValue; i++) {
      if ((blockState & (1 << i)) !== 0) {
        this.bits.set(this.numBits + i, true);
      } else {
        this.bits.set(this.numBits + i, false);
      }
    }
    this.numBits += this.bitsPerValue;
  }

  getBlockStates(): number[] {
    const totalValues = Math.floor(this.numBits / this.bitsPerValue);
    const blockStates: number[] = [];
    
    for (let i = 0; i < totalValues; i++) {
      let value = 0;
      for (let j = 0; j < this.bitsPerValue; j++) {
        if (this.bits.get(i * this.bitsPerValue + j)) {
          value |= 1 << j;
        }
      }
      blockStates.push(value);
    }
    
    return blockStates;
  }

  toLongArray(): BigInt64Array {
    const longs = this.bits.toLongArray();
    return new BigInt64Array(longs.map(v => BigInt.asIntN(64, v)));
  }
}

// Read Litematic file
export function readLitematic(data: Uint8Array, fileName: string): Schematic {
  const tag = readNbtGzipped(data);
  
  const regions = tag.getCompound('Regions');
  const regionKeys = Array.from(regions.keySet());
  
  if (regionKeys.length > 1) {
    throw new ConversionException('不支持多区域 .litematic 文件');
  }
  
  const region = regions.getCompound(regionKeys[0]);
  const paletteTag = region.getList('BlockStatePalette');
  const sizeTag = region.getCompound('Size');
  
  const size: [number, number, number] = [
    Math.abs(sizeTag.getInt('x')),
    Math.abs(sizeTag.getInt('y')),
    Math.abs(sizeTag.getInt('z'))
  ];
  
  const regionPosTag = region.getCompound('Position');
  const regionX = regionPosTag.getInt('x');
  const regionY = regionPosTag.getInt('y');
  const regionZ = regionPosTag.getInt('z');
  
  const palette: string[] = [];
  for (let i = 0; i < paletteTag.size(); i++) {
    palette.push(convertToBlockString(paletteTag.get(i) as CompoundTag));
  }
  
  const minecraftDataVersion = tag.getInt('MinecraftDataVersion');
  const builder = new SchematicBuilder(fileName, minecraftDataVersion, ...size);
  
  const blockStatesLongArray = region.getLongArray('BlockStates');
  const blockStates = unpackBlockStates(blockStatesLongArray, size, palette);
  
  // Check if zero-indexed
  const zeroIndexed = blockStates.some(state => state === 0);
  
  let index = 0;
  for (let y = 0; y < size[1]; y++) {
    for (let z = 0; z < size[2]; z++) {
      for (let x = 0; x < size[0]; x++) {
        const stateIndex = zeroIndexed ? blockStates[index++] : blockStates[index++] - 1;
        if (stateIndex >= 0 && stateIndex < palette.length) {
          builder.setBlockAt(x, y, z, palette[stateIndex]);
        }
      }
    }
  }
  
  // Read tile entities (block entities)
  if (region.contains('TileEntities', TAG_COMPOUND)) {
    const tileEntitiesTag = region.getList('TileEntities');
    for (const value of tileEntitiesTag) {
      const entityTag = value as CompoundTag;
      const x = entityTag.getInt('x');
      const y = entityTag.getInt('y');
      const z = entityTag.getInt('z');
      
      // Create a copy and remove position
      const entityCopy = new CompoundTag();
      for (const key of entityTag.keySet()) {
        if (key !== 'x' && key !== 'y' && key !== 'z') {
          entityCopy.put(key, entityTag.get(key)!);
        }
      }
      
      builder.addBlockEntity(x, y, z, entityCopy);
    }
  }
  
  // Read entities
  if (region.contains('Entities', TAG_COMPOUND)) {
    const entitiesTag = region.getList('Entities');
    for (const value of entitiesTag) {
      const entityTag = value as CompoundTag;
      const posTag = entityTag.getList('Pos');
      const pos: number[] = [];
      for (let i = 0; i < 3; i++) {
        pos.push((posTag.get(i) as import('@/types/nbt').DoubleTag).value);
      }
      
      builder.addEntity(
        entityTag.getString('id'),
        pos[0] + regionX,
        pos[1] + regionY,
        pos[2] + regionZ,
        entityTag
      );
    }
  }
  
  return builder.build();
}

// Unpack block states from long array
function unpackBlockStates(blockStates: BigInt64Array, size: [number, number, number], palette: string[]): number[] {
  const container = BlockStateContainer.fromLongArray(blockStates, size, palette.length);
  return container.getBlockStates();
}

// Pack block states to long array
function packBlockStates(states: number[], palette: string[]): BigInt64Array {
  const container = BlockStateContainer.fromPaletteSize(palette.length);
  for (const state of states) {
    container.addBlockState(state);
  }
  return container.toLongArray();
}

// Write Litematic file (not needed for this converter but included for completeness)
export function writeLitematic(schematic: Schematic): Uint8Array {
  const tag = new CompoundTag();
  const regions = new CompoundTag();
  const region = new CompoundTag();
  
  const paletteTag = new ListTag(TAG_COMPOUND);
  const palette = schematic.getPalette();
  
  for (const entry of palette) {
    paletteTag.add(convertFromBlockString(entry));
  }
  region.put('BlockStatePalette', paletteTag);
  
  const size = schematic.getSize();
  const sizeTag = new CompoundTag();
  sizeTag.put('x', new IntTag(size[0]));
  sizeTag.put('y', new IntTag(size[1]));
  sizeTag.put('z', new IntTag(size[2]));
  region.put('Size', sizeTag);
  
  const blockStates: number[] = [];
  for (let y = 0; y < size[1]; y++) {
    for (let z = 0; z < size[2]; z++) {
      for (let x = 0; x < size[0]; x++) {
        blockStates.push(schematic.getPaletteBlock(x, y, z) + 1);
      }
    }
  }
  
  const blockStatesTag = new LongArrayTag(packBlockStates(blockStates, palette));
  region.put('BlockStates', blockStatesTag);
  
  const posTag = new CompoundTag();
  posTag.put('x', new IntTag(0));
  posTag.put('y', new IntTag(0));
  posTag.put('z', new IntTag(0));
  region.put('Position', posTag);
  
  const tileEntitiesTag = new ListTag(TAG_COMPOUND);
  for (const [key, entity] of schematic.getBlockEntities()) {
    const [x, y, z] = key.split(',').map(Number);
    const entityWithPos = new CompoundTag();
    for (const k of entity.keySet()) {
      entityWithPos.put(k, entity.get(k)!);
    }
    entityWithPos.put('x', new IntTag(x));
    entityWithPos.put('y', new IntTag(y));
    entityWithPos.put('z', new IntTag(z));
    tileEntitiesTag.add(entityWithPos);
  }
  region.put('TileEntities', tileEntitiesTag);
  
  const entitiesTag = new ListTag(TAG_COMPOUND);
  for (const entity of schematic.getEntities()) {
    const entityTag = entity.nbt;
    const entityPosTag = new ListTag(TAG_DOUBLE);
    entityPosTag.add(new DoubleTag(entity.x));
    entityPosTag.add(new DoubleTag(entity.y));
    entityPosTag.add(new DoubleTag(entity.z));
    entityTag.put('Pos', entityPosTag);
    entitiesTag.add(entityTag);
  }
  region.put('Entities', entitiesTag);
  
  regions.put(schematic.getSourceFileName().replace(/\.[^/.]+$/, ''), region);
  tag.put('Regions', regions);
  tag.put('MinecraftDataVersion', new IntTag(schematic.getDataVersion()));
  tag.put('Version', new IntTag(6));
  
  const metadataTag = new CompoundTag();
  metadataTag.put('EnclosingSize', sizeTag);
  metadataTag.put('Name', new StringTag(schematic.getSourceFileName()));
  metadataTag.put('TimeCreated', new LongTag(BigInt(Date.now())));
  metadataTag.put('TimeModified', new LongTag(BigInt(Date.now())));
  metadataTag.put('TotalVolume', new IntTag(size[0] * size[1] * size[2]));
  metadataTag.put('RegionCount', new IntTag(1));
  tag.put('Metadata', metadataTag);
  
  return writeNbtGzipped(tag);
}

// Helper function to convert block string to CompoundTag
function convertFromBlockString(block: string): CompoundTag {
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

// Need to import this here to avoid circular dependency
import { writeNbtGzipped } from '@/utils/nbtUtil';
