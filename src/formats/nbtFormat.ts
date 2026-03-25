import { 
  CompoundTag, ListTag, IntTag, DoubleTag, StringTag,
  TAG_COMPOUND, TAG_INT, TAG_DOUBLE
} from '@/types/nbt';
import { Schematic } from '@/types/schematic';
import { writeNbtGzipped, convertFromBlockString } from '@/utils/nbtUtil';

export class ConversionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionException';
  }
}

// Write schematic to NBT format (NO 48x48x48 size limit)
export function writeNbt(schematic: Schematic): Uint8Array {
  const size = schematic.getSize();
  
  // REMOVED: The 48x48x48 size limit check
  // Original code had:
  // if (size[0] > 48 || size[1] > 48 || size[2] > 48)
  //     throw new ConversionException("The NBT schematic format only supports schematics of up to 48x48x48 blocks.");
  
  const tag = new CompoundTag();
  
  // Write size
  const sizeTag = new ListTag(TAG_INT);
  for (const s of size) {
    sizeTag.add(new IntTag(s));
  }
  tag.put('size', sizeTag);
  
  // Write palette
  const paletteTag = new ListTag(TAG_COMPOUND);
  for (const block of schematic.getPalette()) {
    paletteTag.add(convertFromBlockString(block));
  }
  tag.put('palette', paletteTag);
  
  // Write blocks
  const blocksTag = new ListTag(TAG_COMPOUND);
  for (let x = 0; x < size[0]; x++) {
    for (let y = 0; y < size[1]; y++) {
      for (let z = 0; z < size[2]; z++) {
        const state = schematic.getPaletteBlock(x, y, z);
        if (state === -1) continue;
        
        const posTag = new ListTag(TAG_INT);
        posTag.add(new IntTag(x));
        posTag.add(new IntTag(y));
        posTag.add(new IntTag(z));
        
        const entry = new CompoundTag();
        entry.put('pos', posTag);
        entry.put('state', new IntTag(state));
        
        if (schematic.hasBlockEntityAt(x, y, z)) {
          entry.put('nbt', schematic.getBlockEntityAt(x, y, z)!);
        }
        
        blocksTag.add(entry);
      }
    }
  }
  tag.put('blocks', blocksTag);
  
  // Write entities
  const entitiesTag = new ListTag(TAG_COMPOUND);
  for (const entity of schematic.getEntities()) {
    const entityTag = new CompoundTag();
    
    const posTag = new ListTag(TAG_DOUBLE);
    posTag.add(new DoubleTag(entity.x));
    posTag.add(new DoubleTag(entity.y));
    posTag.add(new DoubleTag(entity.z));
    entityTag.put('pos', posTag);
    
    const blockPosTag = new ListTag(TAG_INT);
    blockPosTag.add(new IntTag(Math.floor(entity.x)));
    blockPosTag.add(new IntTag(Math.floor(entity.y)));
    blockPosTag.add(new IntTag(Math.floor(entity.z)));
    entityTag.put('blockPos', blockPosTag);
    
    const nbt = new CompoundTag();
    for (const key of entity.nbt.keySet()) {
      nbt.put(key, entity.nbt.get(key)!);
    }
    nbt.put('id', new StringTag(entity.id));
    entityTag.put('nbt', nbt);
    
    entitiesTag.add(entityTag);
  }
  tag.put('entities', entitiesTag);
  
  // Write data version
  tag.put('DataVersion', new IntTag(schematic.getDataVersion()));
  
  return writeNbtGzipped(tag);
}
