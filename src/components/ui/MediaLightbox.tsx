"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import "./media-lightbox.css";

/** Shared enlarged-media dialog: centered, rounded, blurred backdrop, original colour.
 * Close with Esc, the close button, or a click outside the media. Focus returns to the opener. */
export function MediaLightbox({ open, onClose, label, children }: {
  open: boolean; onClose: () => void; label: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="media-lightbox" aria-label={label} onClose={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      {open && <div className="media-lightbox-frame">
        <button type="button" className="media-lightbox-close" onClick={onClose} aria-label="Close">×</button>
        {children}
      </div>}
    </dialog>
  );
}

/** An inline (black-and-white) photo that opens full size, in colour, when clicked. */
export function ZoomableImage({ src, alt, sizes, className = "", priority = false }: {
  src: string; alt: string; sizes: string; className?: string; priority?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); opener.current?.focus({ preventScroll: true }); };
  return (
    <>
      <button ref={opener} type="button" className="media-zoom-trigger" onClick={() => setOpen(true)} aria-label={`View full size: ${alt}`}>
        <Image src={src} alt={alt} width={0} height={0} sizes={sizes} priority={priority} className={className} />
        <span className="media-zoom-hint" aria-hidden="true">⤢</span>
      </button>
      <MediaLightbox open={open} onClose={close} label={alt}>
        {/* Plain img at full resolution; data-full-color lifts the site-wide grayscale. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} data-full-color className="media-lightbox-media" />
      </MediaLightbox>
    </>
  );
}
