'use client';

/**
 * TRANG THAY THẾ ĐỐI TƯỢNG (OBJECT REPLACEMENT WITH SAM)
 * --------------------------------------------------
 * Chức năng:
 * - Hỗ trợ 2 chế độ tạo mask: Vẽ tay (Brush) và Tự động (SAM - Segment Anything Model).
 * - Người dùng tải ảnh lên, vẽ hoặc click chọn vật thể muốn thay thế.
 * - Mô tả đối tượng mới thông qua văn bản để hệ thống AI tự động thay thế vật thể.
 */

import React, { useRef, useState, useEffect } from 'react';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import { useFormik } from 'formik';
import Container from '@/components/layouts/Container/Container';
import Button from '@/components/ui/Button';
import LoaderDotsCommon from '@/components/LoaderDots.common';
import { CREATED, FAILED, PENDING, SUCCESSFUL } from '@/constant';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import { replaceObjectApiCall } from '@/apiCalls/ai-demos/replaceObjectApiCall';
import { segmentSamApiCall } from '@/apiCalls/ai-demos/segmentSamApiCall';
import Image from 'next/image';
import Icon from '@/components/icon/Icon';

const ChatPhotoClient = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const hiddenContextRef = useRef<CanvasRenderingContext2D | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [lineWidth, setLineWidth] = useState(30); // Brush size
    const [prompt, setPrompt] = useState(""); // Prompt text
    const [askGptApiStatus, setAskGptApiStatus] = useState(CREATED);

    // SAM states
    const [segmentMode, setSegmentMode] = useState<'brush' | 'sam'>('brush');
    const [originalImageBase64, setOriginalImageBase64] = useState<string | null>(null);
    const [isLoadingSam, setIsLoadingSam] = useState(false);

    // History stack for undo support (stores state of hiddenCanvas and visibleCanvas)
    const [history, setHistory] = useState<{
        visibleDataUrl: string;
        hiddenDataUrl: string;
    }[]>([]);

    const saveHistory = () => {
        const canvas = canvasRef.current;
        const hiddenCanvas = hiddenCanvasRef.current;
        if (canvas && hiddenCanvas) {
            const visibleDataUrl = canvas.toDataURL();
            const hiddenDataUrl = hiddenCanvas.toDataURL();
            setHistory((prev) => [...prev, { visibleDataUrl, hiddenDataUrl }]);
        }
    };

    const undoLastAction = () => {
        if (history.length === 0) return;
        
        const newHistory = [...history];
        const lastState = newHistory.pop(); // Remove current state
        setHistory(newHistory);

        const canvas = canvasRef.current;
        const hiddenCanvas = hiddenCanvasRef.current;
        const context = contextRef.current;
        const hiddenContext = hiddenContextRef.current;

        if (canvas && hiddenCanvas && context && hiddenContext) {
            const scale = window.devicePixelRatio || 1;
            
            if (newHistory.length === 0) {
                // If no history left, restore clean original state
                clearCanvas();
                return;
            }

            const prevState = newHistory[newHistory.length - 1];

            // Restore visible canvas
            const visibleImg = new window.Image();
            visibleImg.src = prevState.visibleDataUrl;
            visibleImg.onload = () => {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(visibleImg, 0, 0, canvas.width / scale, canvas.height / scale);
            };

            // Restore hidden canvas
            const hiddenImg = new window.Image();
            hiddenImg.src = prevState.hiddenDataUrl;
            hiddenImg.onload = () => {
                hiddenContext.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
                hiddenContext.drawImage(hiddenImg, 0, 0, hiddenCanvas.width / scale, hiddenCanvas.height / scale);
            };
        }
    };

    // Initialize canvases
    useEffect(() => {
        const canvas = canvasRef.current;
        const hiddenCanvas = hiddenCanvasRef.current;
        if (canvas && hiddenCanvas) {
            const parent = canvas.parentElement;
            if (parent) {
                const style = getComputedStyle(parent);
                const width = parseInt(style.width, 10) || 500;
                const height = parseInt(style.height, 10) || 400;

                const scale = window.devicePixelRatio || 1;
                canvas.width = width * scale;
                canvas.height = height * scale;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;

                hiddenCanvas.width = width * scale;
                hiddenCanvas.height = height * scale;
                hiddenCanvas.style.width = `${width}px`;
                hiddenCanvas.style.height = `${height}px`;

                const context = canvas.getContext('2d');
                const hiddenContext = hiddenCanvas.getContext('2d');
                if (context && hiddenContext) {
                    context.scale(scale, scale);
                    context.lineCap = 'round';
                    context.lineJoin = 'round';
                    context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    context.lineWidth = lineWidth;
                    
                    // Initial canvas setup
                    if (!originalImageBase64) {
                        context.fillStyle = '#1e293b'; // slate-800
                        context.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
                    }

                    hiddenContext.scale(scale, scale);
                    hiddenContext.lineCap = 'round';
                    hiddenContext.lineJoin = 'round';
                    hiddenContext.strokeStyle = 'white';
                    hiddenContext.lineWidth = lineWidth;
                    hiddenContext.fillStyle = 'black';
                    hiddenContext.fillRect(0, 0, hiddenCanvas.width / scale, hiddenCanvas.height / scale);

                    contextRef.current = context;
                    hiddenContextRef.current = hiddenContext;
                }
            }
        }
    }, []);

    // Redraw image and mask setup when switching modes
    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.lineWidth = lineWidth;
        }
        if (hiddenContextRef.current) {
            hiddenContextRef.current.lineWidth = lineWidth;
        }
    }, [lineWidth]);

    const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!originalImageBase64) return;
        
        if (segmentMode === 'sam') {
            handleSamClick(event);
            return;
        }

        saveHistory();

        const { offsetX, offsetY } = event.nativeEvent;
        contextRef.current?.beginPath();
        contextRef.current?.moveTo(offsetX, offsetY);

        hiddenContextRef.current?.beginPath();
        hiddenContextRef.current?.moveTo(offsetX, offsetY);

        setIsDrawing(true);
    };

    const finishDrawing = () => {
        if (segmentMode === 'sam') return;
        contextRef.current?.closePath();
        hiddenContextRef.current?.closePath();
        setIsDrawing(false);
    };

    const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (segmentMode === 'sam') return;
        if (!isDrawing) return;
        
        const { offsetX, offsetY } = event.nativeEvent;
        
        // Draw white lines on visible canvas (brush effect)
        if (contextRef.current) {
            contextRef.current.globalCompositeOperation = 'source-over';
            contextRef.current.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            contextRef.current.lineTo(offsetX, offsetY);
            contextRef.current.stroke();
        }

        // Draw white lines on black background in hidden canvas (pure mask)
        if (hiddenContextRef.current) {
            hiddenContextRef.current.globalCompositeOperation = 'source-over';
            hiddenContextRef.current.strokeStyle = 'white';
            hiddenContextRef.current.lineTo(offsetX, offsetY);
            hiddenContextRef.current.stroke();
        }
    };

    const handleSamClick = async (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!originalImageBase64) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const displayWidth = rect.width;
        const displayHeight = rect.height;

        console.log("[SAM CLIENT] Click screen coordinate:", event.clientX, event.clientY);
        console.log("[SAM CLIENT] Canvas bounding rect:", rect.left, rect.top, rect.width, rect.height);
        console.log("[SAM CLIENT] Relative x, y:", x, y);

        setIsLoadingSam(true);
        try {
            const response = await segmentSamApiCall({
                dataToPost: {
                    image: originalImageBase64,
                    x,
                    y,
                    display_width: displayWidth,
                    display_height: displayHeight,
                }
            });

            if (response.status === 200 && response.data.mask) {
                applySamMask(response.data.mask);
            }
        } catch (error) {
            console.error("Failed to run SAM:", error);
            alert("Không thể phân vùng tự động. Vui lòng kiểm tra lại backend.");
        } finally {
            setIsLoadingSam(false);
        }
    };

    const applySamMask = (maskBase64: string) => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        const hiddenCanvas = hiddenCanvasRef.current;
        const hiddenContext = hiddenContextRef.current;
        if (!canvas || !context || !hiddenCanvas || !hiddenContext || !originalImageBase64) return;

        saveHistory();

        const scale = window.devicePixelRatio || 1;

        // Load and draw the mask
        const maskImage = new window.Image();
        maskImage.src = `data:image/png;base64,${maskBase64}`;
        maskImage.onload = () => {
            // 1. Draw white mask directly on existing hidden canvas content (accumulating)
            hiddenContext.drawImage(maskImage, 0, 0, hiddenCanvas.width / scale, hiddenCanvas.height / scale);

            // 2. Draw semi-transparent overlay on visible canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.drawImage(maskImage, 0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.globalCompositeOperation = 'source-in';
                tempCtx.fillStyle = 'rgba(99, 102, 241, 0.5)'; // Indigo-500 with 50% opacity
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                // Overlay it on the visible canvas
                context.drawImage(tempCanvas, 0, 0, canvas.width / scale, canvas.height / scale);
            }
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        const hiddenCanvas = hiddenCanvasRef.current;
        const hiddenContext = hiddenContextRef.current;
        if (canvas && context && hiddenCanvas && hiddenContext) {
            const scale = window.devicePixelRatio || 1;
            
            // Clear hidden canvas to black
            hiddenContext.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
            hiddenContext.fillStyle = 'black';
            hiddenContext.fillRect(0, 0, hiddenCanvas.width / scale, hiddenCanvas.height / scale);
            
            if (originalImageBase64) {
                // Redraw original clean image
                const img = new window.Image();
                img.src = `data:image/png;base64,${originalImageBase64}`;
                img.onload = () => {
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(img, 0, 0, canvas.width / scale, canvas.height / scale);
                    setHistory([]);
                };
            } else {
                setHistory([]);
                // Draw default background
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = '#1e293b';
                context.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
            }
        }
    };

    const canvasToBase64 = (canvas: HTMLCanvasElement | null): string | undefined => {
        if (canvas) {
            return canvas.toDataURL('image/png').split(',')[1];
        }
    };

    const sendImageToAPI = async () => {
        if (!originalImageBase64) {
            alert("Vui lòng tải ảnh lên trước.");
            return;
        }
        if (!prompt.trim()) {
            alert("Vui lòng nhập mô tả đối tượng thay thế.");
            return;
        }

        const hiddenCanvas = hiddenCanvasRef.current;
        const base64MaskedImage = canvasToBase64(hiddenCanvas);

        if (originalImageBase64 && base64MaskedImage) {
            setAskGptApiStatus(PENDING);
            try {
                const response = await replaceObjectApiCall({
                    dataToPost: {
                        base64Original: originalImageBase64,
                        base64Masked: base64MaskedImage,
                        prompt: prompt
                    },
                });
                if (response.data && response.data.image) {
                    setGeneratedImage(response.data.image);
                    setAskGptApiStatus(SUCCESSFUL);
                } else {
                    setAskGptApiStatus(FAILED);
                }
            } catch (error) {
                console.error("API call failed:", error);
                setAskGptApiStatus(FAILED);
            }
        }
    };

    const loadImageToCanvas = (file: File) => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        const hiddenCanvas = hiddenCanvasRef.current;
        const hiddenContext = hiddenContextRef.current;
        const reader = new FileReader();
    
        reader.onload = (event) => {
            const image = new window.Image();
            image.src = event.target?.result as string;
            image.onload = () => {
                if (canvas && context && hiddenCanvas && hiddenContext) {
                    const parent = canvas.parentElement;
                    if (parent) {
                        const style = getComputedStyle(parent);
                        const parentWidth = parseInt(style.width, 10) || 500;
                        const parentHeight = parseInt(style.height, 10) || 400;

                        // Calculate aspect ratio to fit image inside parent
                        const imgRatio = image.width / image.height;
                        const parentRatio = parentWidth / parentHeight;
                        
                        let displayWidth = parentWidth;
                        let displayHeight = parentHeight;
                        
                        if (imgRatio > parentRatio) {
                            displayHeight = parentWidth / imgRatio;
                        } else {
                            displayWidth = parentHeight * imgRatio;
                        }

                        const scale = window.devicePixelRatio || 1;
                        
                        canvas.width = displayWidth * scale;
                        canvas.height = displayHeight * scale;
                        canvas.style.width = `${displayWidth}px`;
                        canvas.style.height = `${displayHeight}px`;

                        hiddenCanvas.width = displayWidth * scale;
                        hiddenCanvas.height = displayHeight * scale;
                        hiddenCanvas.style.width = `${displayWidth}px`;
                        hiddenCanvas.style.height = `${displayHeight}px`;

                        context.scale(scale, scale);
                        context.lineCap = 'round';
                        context.lineJoin = 'round';
                        context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                        context.lineWidth = lineWidth;

                        hiddenContext.scale(scale, scale);
                        hiddenContext.lineCap = 'round';
                        hiddenContext.lineJoin = 'round';
                        hiddenContext.strokeStyle = 'white';
                        hiddenContext.lineWidth = lineWidth;
                        hiddenContext.fillStyle = 'black';
                        hiddenContext.fillRect(0, 0, displayWidth, displayHeight);

                        context.clearRect(0, 0, displayWidth, displayHeight);
                        context.drawImage(image, 0, 0, displayWidth, displayHeight);
                        
                        setHistory([]);
                    }
                }
            };
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Str = (e.target?.result as string).split(',')[1];
                setOriginalImageBase64(base64Str);
                setGeneratedImage(null);
            };
            reader.readAsDataURL(file);
            loadImageToCanvas(file);
        }
    };

    const handleDownloadImage = () => {
        if (generatedImage) {
            const link = document.createElement('a');
            link.href = `data:image/png;base64,${generatedImage}`;
            link.download = 'replaced-object.png';
            link.click();
        }
    };

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <span className='font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
                        Thay thế vật thể (Object Replacement)
                        <span className='text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center gap-1'>
                            <Icon icon='HeroSparkles' size='text-xs' />
                            Powered by SAM
                        </span>
                    </span>
                </SubheaderLeft>
                <SubheaderRight>
                    <button
                        onClick={() => {
                            setOriginalImageBase64(null);
                            setGeneratedImage(null);
                            setPrompt("");
                            clearCanvas();
                            if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-semibold rounded-xl transition-all duration-200">
                        <Icon icon='HeroArrowPath' size='text-lg' />
                        <span>Reset</span>
                    </button>
                </SubheaderRight>
            </Subheader>

            <Container className='flex shrink-0 grow basis-auto flex-col pb-6 max-w-7xl mx-auto'>
                {/* Main grid */}
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mb-6'>
                    {/* Left Canvas Panel */}
                    <div className='flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm relative min-h-[480px]'>
                        <div className='flex items-center justify-between mb-4'>
                            <span className='text-sm font-semibold text-zinc-800 dark:text-zinc-200'>Hình ảnh & Mặt nạ</span>
                            
                            {originalImageBase64 && (
                                <div className='flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50'>
                                    <button
                                        type='button'
                                        onClick={() => setSegmentMode('brush')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${segmentMode === 'brush' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>
                                        Vẽ tay (Brush)
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setSegmentMode('sam')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${segmentMode === 'sam' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}>
                                        Tự động (SAM)
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Drawing Canvas Area */}
                        <div className='flex-1 relative flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200/60 dark:border-zinc-850/80 min-h-[350px]'>
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseUp={finishDrawing}
                                onMouseMove={draw}
                                className={`max-w-full max-h-full object-contain ${originalImageBase64 ? 'cursor-crosshair' : 'hidden'}`}
                            />
                            
                            <canvas
                                ref={hiddenCanvasRef}
                                style={{ display: 'none' }}
                            />

                            {/* SAM Loading overlay */}
                            {isLoadingSam && (
                                <div className='absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-3 z-10 transition-all'>
                                    <LoaderDotsCommon />
                                    <span className='text-xs font-medium text-zinc-300'>SAM đang tính toán phân vùng...</span>
                                </div>
                            )}

                            {/* Empty upload zone */}
                            {!originalImageBase64 && (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className='absolute inset-4 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/5 transition-all duration-300 group'>
                                    <div className='p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-855 rounded-2xl group-hover:scale-110 transition-all shadow-sm'>
                                        <Icon icon='HeroPlus' size='text-2xl' className='text-zinc-400 group-hover:text-indigo-500 transition-colors' />
                                    </div>
                                    <div className='text-center'>
                                        <p className='text-sm font-semibold text-zinc-700 dark:text-zinc-300'>Tải hình ảnh của bạn lên</p>
                                        <p className='text-xs text-zinc-400 dark:text-zinc-500 mt-1'>Hỗ trợ PNG, JPG, JPEG</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Controls underneath canvas */}
                        {originalImageBase64 && (
                            <div className='mt-4 flex items-center justify-between gap-4'>
                                <div className='flex items-center gap-2'>
                                    <Button
                                        color='red'
                                        variant='solid'
                                        size='sm'
                                        onClick={clearCanvas}
                                        icon='HeroTrash'>
                                        Xóa Mask
                                    </Button>

                                    <button
                                        type='button'
                                        onClick={undoLastAction}
                                        disabled={history.length === 0}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${history.length === 0 ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed' : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`}>
                                        <Icon icon='HeroArrowUturnLeft' size='text-sm' className='rtl:rotate-180' />
                                        <span>Quay lại</span>
                                    </button>
                                </div>

                                {segmentMode === 'brush' && (
                                    <div className='flex items-center gap-3 flex-1 max-w-[280px]'>
                                        <span className='text-xs text-zinc-500 whitespace-nowrap'>Cỡ cọ: {lineWidth}px</span>
                                        <input
                                            type="range"
                                            min="5"
                                            max="80"
                                            value={lineWidth}
                                            onChange={(e) => setLineWidth(Number(e.target.value))}
                                            className="w-full h-1 bg-zinc-200 dark:bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Output Panel */}
                    <div className='flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm min-h-[480px]'>
                        <div className='flex items-center justify-between mb-4'>
                            <span className='text-sm font-semibold text-zinc-800 dark:text-zinc-200'>Kết quả sinh từ AI</span>
                            
                            {generatedImage && (
                                <Button
                                    icon='HeroArrowDownTray'
                                    variant='outline'
                                    size='sm'
                                    onClick={handleDownloadImage}>
                                    Tải ảnh về
                                </Button>
                            )}
                        </div>

                        {/* Image Output Area */}
                        <div className='flex-1 relative flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-200/60 dark:border-zinc-855/80 min-h-[350px]'>
                            {generatedImage ? (
                                <img
                                    src={`data:image/png;base64,${generatedImage}`}
                                    alt="Generated from AI"
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : askGptApiStatus === PENDING ? (
                                <div className='flex flex-col items-center gap-3 text-zinc-400'>
                                    <LoaderDotsCommon />
                                    <span className='text-xs'>AI đang tiến hành vẽ lại vật thể...</span>
                                </div>
                            ) : (
                                <div className='flex flex-col items-center gap-2 text-zinc-400 text-center p-6'>
                                    <Icon icon='HeroPhoto' size='text-3xl' className='text-zinc-300 dark:text-zinc-700' />
                                    <p className='text-xs font-semibold text-zinc-500'>Chưa có ảnh kết quả</p>
                                    <p className='text-[10px] text-zinc-400 max-w-[200px] mt-0.5'>Chọn phân vùng và mô tả vật thể mới để bắt đầu tạo</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Input Area */}
                {originalImageBase64 && (
                    <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-4 shadow-lg flex items-center gap-3 focus-within:border-indigo-500/80 transition-all'>
                        <div className='flex-1 flex items-center gap-2 px-3 py-1 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-850 focus-within:border-indigo-500/80 transition-all'>
                            <Icon icon='HeroSparkles' size='text-lg' className='text-indigo-500' />
                            <input
                                type="text"
                                placeholder={segmentMode === 'sam' ? "Mô tả vật thể mới bạn muốn đặt vào vùng đã click..." : "Mô tả vật thể mới để vẽ đè lên vùng đã tô..."}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && prompt && askGptApiStatus !== PENDING) {
                                        sendImageToAPI();
                                    }
                                }}
                                className='w-full bg-transparent border-0 outline-none focus:ring-0 text-sm py-2 px-1 text-zinc-800 dark:text-zinc-200'
                            />
                        </div>

                        <Button
                            variant='solid'
                            onClick={sendImageToAPI}
                            disabled={askGptApiStatus === PENDING || !prompt.trim()}
                            className='!rounded-2xl !py-3 !px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-650 text-white font-semibold flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0'>
                            {askGptApiStatus === PENDING ? 'Đang tạo...' : 'Tạo ảnh'}
                            <Icon icon='HeroPaperAirplane' size='text-sm' />
                        </Button>
                    </div>
                )}

                {/* Hidden input element */}
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </Container>
        </PageWrapper>
    );
};

export default ChatPhotoClient;
