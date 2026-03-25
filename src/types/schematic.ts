import { CompoundTag } from '@/types/nbt';

export interface Pos {
  x: number;
  y: number;
  z: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  z: number;
  nbt: CompoundTag;
}

export class Schematic {
  private blocks: (string | null)[][][];
  private palette: string[];
  private blockEntities: Map<string, CompoundTag>;
  private entities: Entity[];
  private dataVersion: number;
  private sourceFileName: string;

  constructor(
    blocks: (string | null)[][][],
    palette: string[],
    blockEntities: Map<string, CompoundTag>,
    entities: Entity[],
    dataVersion: number,
    sourceFileName: string
  ) {
    this.blocks = blocks;
    this.palette = palette;
    this.blockEntities = blockEntities;
    this.entities = entities;
    this.dataVersion = dataVersion;
    this.sourceFileName = sourceFileName;
  }

  getSize(): [number, number, number] {
    return [
      this.blocks.length,
      this.blocks[0]?.length || 0,
      this.blocks[0]?.[0]?.length || 0
    ];
  }

  getBlock(x: number, y: number, z: number): string | null {
    return this.blocks[x]?.[y]?.[z] ?? null;
  }

  getPaletteBlock(x: number, y: number, z: number): number {
    const block = this.getBlock(x, y, z);
    if (block === null) return -1;
    return this.palette.indexOf(block);
  }

  getPalette(): string[] {
    return this.palette;
  }

  getBlockEntities(): Map<string, CompoundTag> {
    return this.blockEntities;
  }

  hasBlockEntityAt(x: number, y: number, z: number): boolean {
    return this.blockEntities.has(`${x},${y},${z}`);
  }

  getBlockEntityAt(x: number, y: number, z: number): CompoundTag | undefined {
    return this.blockEntities.get(`${x},${y},${z}`);
  }

  getEntities(): Entity[] {
    return this.entities;
  }

  getDataVersion(): number {
    return this.dataVersion;
  }

  getSourceFileName(): string {
    return this.sourceFileName;
  }

  countNonEmptyBlocks(): number {
    let count = 0;
    for (const layer of this.blocks) {
      for (const column of layer) {
        for (const block of column) {
          if (!isEmpty(block)) count++;
        }
      }
    }
    return count;
  }

  static isEmpty(block: string | null): boolean {
    return isEmpty(block);
  }
}

function isEmpty(block: string | null): boolean {
  return block === null || block === 'minecraft:air' || block === 'minecraft:structure_void';
}

export class SchematicBuilder {
  private blocks: (string | null)[][][];
  private palette: Set<string>;
  private blockEntities: Map<string, CompoundTag>;
  private entities: Entity[];
  private sourceFileName: string;
  private dataVersion: number;

  constructor(sourceFileName: string, dataVersion: number, xSize: number, ySize: number, zSize: number) {
    this.blocks = Array(xSize).fill(null).map(() => 
      Array(ySize).fill(null).map(() => 
        Array(zSize).fill(null)
      )
    );
    this.palette = new Set();
    this.blockEntities = new Map();
    this.entities = [];
    this.sourceFileName = sourceFileName;
    this.dataVersion = dataVersion;
  }

  setBlockAt(x: number, y: number, z: number, block: string): void {
    if (x >= 0 && x < this.blocks.length &&
        y >= 0 && y < this.blocks[0].length &&
        z >= 0 && z < this.blocks[0][0].length) {
      this.blocks[x][y][z] = block;
      this.palette.add(block);
    }
  }

  addBlockEntity(x: number, y: number, z: number, entity: CompoundTag): void {
    this.blockEntities.set(`${x},${y},${z}`, entity);
  }

  addEntity(id: string, x: number, y: number, z: number, nbt: CompoundTag): void {
    this.entities.push({ id, x, y, z, nbt });
  }

  build(): Schematic {
    return new Schematic(
      this.blocks,
      Array.from(this.palette),
      this.blockEntities,
      this.entities,
      this.dataVersion,
      this.sourceFileName
    );
  }
}
