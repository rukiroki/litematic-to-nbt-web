import { useState, useCallback } from 'react';
import { 
  Upload, FileJson, FileType, ArrowRight, 
  CheckCircle, XCircle, Box,
  Download, Trash2, FileUp, Blocks
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { convertLitematicToNbt, downloadFile } from '@/utils/converter';
import type { ConversionResult } from '@/utils/converter';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ConvertedFile {
  id: string;
  result: ConversionResult;
  originalName: string;
}

function App() {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Handle file conversion
  const convertFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.litematic')) {
      const errorResult: ConvertedFile = {
        id: Math.random().toString(36).substr(2, 9),
        originalName: file.name,
        result: {
          success: false,
          error: '仅支持 .litematic 格式'
        }
      };
      setFiles(prev => [errorResult, ...prev]);
      return;
    }

    setIsConverting(true);
    const result = await convertLitematicToNbt(file);
    setIsConverting(false);

    const convertedFile: ConvertedFile = {
      id: Math.random().toString(36).substr(2, 9),
      originalName: file.name,
      result
    };

    setFiles(prev => [convertedFile, ...prev]);
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(convertFile);
  }, [convertFile]);

  // Handle file input change
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(convertFile);
    e.target.value = ''; // Reset input
  }, [convertFile]);

  // Handle download
  const handleDownload = useCallback((file: ConvertedFile) => {
    if (file.result.success && file.result.data && file.result.fileName) {
      downloadFile(file.result.data, file.result.fileName);
    }
  }, []);

  // Handle remove file from list
  const handleRemove = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Clear all files
  const handleClearAll = useCallback(() => {
    setFiles([]);
  }, []);

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Download all successful conversions
  const handleDownloadAll = useCallback(() => {
    files.forEach(file => {
      if (file.result.success) {
        handleDownload(file);
      }
    });
  }, [files, handleDownload]);

  const successfulConversions = files.filter(f => f.result.success);
  const failedConversions = files.filter(f => !f.result.success);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Blocks className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                litematic to nbt 转换器
              </h1>
              <p className="text-xs text-slate-400">将 .litematic 文件转换为 .nbt 格式</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              No Size Limit
            </Badge> */}
            <Badge variant="secondary" className="bg-slate-700/50 text-slate-300">
              v1.0.0
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            转换 .litematic 文件为 .nbt 格式
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            直接在您的浏览器中将 Litematic 文件转换为 NBT 格式。无需上传服务器——所有操作均在本地完成。
          </p>
        </div>

        {/* Upload Area */}
        <Card className={cn(
          "mb-8 border-2 border-dashed transition-all duration-200 bg-slate-800/50",
          isDragging 
            ? "border-emerald-500 bg-emerald-500/5" 
            : "border-slate-600 hover:border-slate-500"
        )}>
          <CardContent className="p-8">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className="text-center"
            >
              <input
                type="file"
                accept=".litematic"
                onChange={handleFileInput}
                multiple
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer block"
              >
                <div className={cn(
                  "w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all duration-200",
                  isDragging 
                    ? "bg-emerald-500/20 scale-110" 
                    : "bg-slate-700/50"
                )}>
                  {isConverting ? (
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className={cn(
                      "w-8 h-8 transition-colors",
                      isDragging ? "text-emerald-400" : "text-slate-400"
                    )} />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-300">
                  {isDragging ? '放到此处' : '拖放 .litematic 文件到此处'}
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  或点击浏览文件
                </p>
                <Button 
                  variant="outline" 
                  className="border-slate-600 bg-slate-200 hover:bg-slate-700"
                  disabled={isConverting}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  选择文件
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Stats Bar */}
        {files.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                {files.length} 个文件
              </span>
              {successfulConversions.length > 0 && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {successfulConversions.length} 成功
                </Badge>
              )}
              {failedConversions.length > 0 && (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                  <XCircle className="w-3 h-3 mr-1" />
                  {failedConversions.length} 失败
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {successfulConversions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  className="border-emerald-500/30 text-emerald-600 bg-slate-300 hover:bg-emerald-500/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  全部下载
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="border-slate-600 text-slate-400 bg-slate-300 hover:bg-slate-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清除
              </Button>
            </div>
          </div>
        )}

        {/* File List */}
        <div className="space-y-3">
          {files.map((file) => (
            <Card 
              key={file.id}
              className={cn(
                "border transition-all duration-200",
                file.result.success 
                  ? "bg-slate-800/50 border-slate-700" 
                  : "bg-red-950/20 border-red-500/30"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    file.result.success 
                      ? "bg-emerald-500/10" 
                      : "bg-red-500/10"
                  )}>
                    {file.result.success ? (
                      <FileJson className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate text-gray-300">
                        {file.originalName}
                      </span>
                      {file.result.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                    
                    {file.result.success && file.result.info ? (
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Box className="w-3 h-3" />
                          {file.result.info.size.join(' × ')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Blocks className="w-3 h-3" />
                          {file.result.info.blockCount.toLocaleString()} 个方块
                        </span>
                        <span className="flex items-center gap-1">
                          <Box className="w-3 h-3" />
                          {file.result.info.paletteSize} 种
                        </span>
                      </div>
                    ) : file.result.error ? (
                      <p className="text-xs text-red-400">{file.result.error}</p>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {file.result.success && file.result.data && (
                      <Button
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        下载
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(file.id)}
                      className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Output Filename */}
                {file.result.success && file.result.fileName && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                      <FileType className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">{file.result.fileName}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {files.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 mx-auto mb-4 flex items-center justify-center">
              <Blocks className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-500">暂无文件</p>
            <p className="text-sm text-slate-600 mt-1">
              拖拽 .litematic 文件开始转换
            </p>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-12">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                <Box className="w-5 h-5 text-blue-400" />
              </div>
              <CardTitle className="text-sm text-gray-300">无大小限制</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">
                本转换器无 48×48×48 block 限制。过大文件可能转换失败（取决于浏览器性能）。
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
                <Blocks className="w-5 h-5 text-purple-400" />
              </div>
              <CardTitle className="text-sm text-gray-300">纯前端处理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">
                所有处理都在您的浏览器中进行。文件永远不会上传到任何服务器。
              </p>
            </CardContent>
          </Card>

          {/* <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-2">
                <FileJson className="w-5 h-5 text-orange-400" />
              </div>
              <CardTitle className="text-sm text-gray-300">基于 SchemConvert</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">
                Uses the same conversion logic as the original Java SchemConvert project.
              </p>
            </CardContent>
          </Card> */}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
            <a href="https://github.com/rukiroki/litematic-to-nbt-web" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">litematic-to-nbt-web</a>  基于 <a href="https://github.com/PiTheGuy/SchemConvert" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">SchemConvert</a>
            </p>
            <p className="text-sm text-slate-500">
              React + TypeScript + Vite
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
