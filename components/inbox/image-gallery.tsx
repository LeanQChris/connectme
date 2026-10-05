"use client";

import { useState } from "react";
import type { Message } from "@/lib/types";

interface ImageItem {
  id: string;
  url: string;
  text?: string | null;
  createdAt: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  outgoing: boolean;
  onOpenLightbox: (index: number) => void;
}

export default function ImageGallery({
  images,
  outgoing,
  onOpenLightbox,
}: ImageGalleryProps) {
  const count = images.length;

  if (count === 1) {
    const img = images[0];
    return (
      <div className="group/media relative block overflow-hidden rounded-[12px] cursor-pointer bg-black/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt={img.text || "Photo attachment"}
          onClick={() => onOpenLightbox(0)}
          className="max-h-80 w-full object-cover transition-transform duration-200 group-hover/media:scale-[1.01]"
          loading="lazy"
        />
        <div
          onClick={() => onOpenLightbox(0)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/media:bg-black/25"
        >
          <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover/media:opacity-100 flex items-center gap-1.5 backdrop-blur-sm">
            <span>View Full Size</span>
            <span>↗</span>
          </span>
        </div>
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-[12px] max-w-[420px]">
        {images.map((img, idx) => (
          <div
            key={img.id}
            onClick={() => onOpenLightbox(idx)}
            className="group/img relative aspect-square overflow-hidden rounded-[8px] bg-black/10 cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt="Photo"
              className="h-full w-full object-cover transition-transform duration-200 group-hover/img:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover/img:bg-black/20" />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-[12px] max-w-[420px]">
        <div
          onClick={() => onOpenLightbox(0)}
          className="group/img relative col-span-2 h-44 overflow-hidden rounded-[8px] bg-black/10 cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0].url}
            alt="Featured photo"
            className="h-full w-full object-cover transition-transform duration-200 group-hover/img:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover/img:bg-black/20" />
        </div>
        {images.slice(1).map((img, idx) => (
          <div
            key={img.id}
            onClick={() => onOpenLightbox(idx + 1)}
            className="group/img relative aspect-square overflow-hidden rounded-[8px] bg-black/10 cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt="Photo"
              className="h-full w-full object-cover transition-transform duration-200 group-hover/img:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover/img:bg-black/20" />
          </div>
        ))}
      </div>
    );
  }

  // 4 or more images: 2x2 grid with +N on 4th image
  const displayImages = images.slice(0, 4);
  const remainingCount = count - 4;

  return (
    <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-[12px] max-w-[420px]">
      {displayImages.map((img, idx) => {
        const isLastAndHasMore = idx === 3 && remainingCount > 0;
        return (
          <div
            key={img.id}
            onClick={() => onOpenLightbox(idx)}
            className="group/img relative aspect-square overflow-hidden rounded-[8px] bg-black/10 cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt="Photo"
              className="h-full w-full object-cover transition-transform duration-200 group-hover/img:scale-105"
              loading="lazy"
            />
            {isLastAndHasMore ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-colors group-hover/img:bg-black/70">
                <span className="text-[20px] font-bold text-white tracking-wide">
                  +{remainingCount}
                </span>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover/img:bg-black/20" />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface LightboxProps {
  images: ImageItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function Lightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: LightboxProps) {
  const current = images[currentIndex];
  if (!current) return null;

  const hasMultiple = images.length > 1;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
    if (e.key === "ArrowRight" && currentIndex < images.length - 1)
      onNavigate(currentIndex + 1);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md focus:outline-none select-none"
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <div
        className="absolute top-4 inset-x-6 flex items-center justify-between text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[12px] font-medium backdrop-blur-md">
          {currentIndex + 1} / {images.length}
        </span>

        <div className="flex items-center gap-2">
          <a
            href={current.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12px] font-medium text-white transition-colors hover:bg-white/20 backdrop-blur-md"
            title="Download original image"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span className="hidden sm:inline">Download</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 backdrop-blur-md"
            aria-label="Close image"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {hasMultiple && currentIndex > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-transform hover:scale-110 hover:bg-white/25 backdrop-blur-md cursor-pointer"
          aria-label="Previous image"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {hasMultiple && currentIndex < images.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-transform hover:scale-110 hover:bg-white/25 backdrop-blur-md cursor-pointer"
          aria-label="Next image"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main Image Display */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt="Full size view"
        className="max-h-[85vh] max-w-[88vw] rounded-[10px] object-contain shadow-2xl transition-all duration-150"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
