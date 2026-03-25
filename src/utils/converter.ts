import { readLitematic } from '@/formats/litematicFormat';
import { writeNbt } from '@/formats/nbtFormat';

export interface ConversionResult {
  success: boolean;
  data?: Uint8Array;
  fileName?: string;
  error?: string;
  info?: {
    size: [number, number, number];
    blockCount: number;
    paletteSize: number;
  };
}

export async function convertLitematicToNbt(
  file: File
): Promise<ConversionResult> {
  try {
    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    // Parse litematic file
    const schematic = readLitematic(data, file.name);
    
    // Get info
    const size = schematic.getSize();
    const blockCount = schematic.countNonEmptyBlocks();
    const paletteSize = schematic.getPalette().length;
    
    // Convert to NBT format (without 48x48x48 limit)
    const nbtData = writeNbt(schematic);
    
    // Generate output filename
    const outputFileName = file.name.replace(/\.litematic$/i, '.nbt');
    
    return {
      success: true,
      data: nbtData,
      fileName: outputFileName,
      info: {
        size,
        blockCount,
        paletteSize
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Download data as file
export function downloadFile(data: Uint8Array, fileName: string): void {
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const blob = new Blob([arrayBuffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}
