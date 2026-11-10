import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeGraphicProps {
  value: string;
  size?: number;
  darkColor?: string;
  lightColor?: string;
  label?: string;
  onGenerated?: (dataUrl: string, svgString: string) => void;
}

export function QrCodeGraphic({
  value,
  size = 200,
  darkColor = '#1A241C',
  lightColor = '#FFFFFF',
  label,
  onGenerated,
}: QrCodeGraphicProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    let active = true;
    async function generate() {
      try {
        const [svg, dataUrl] = await Promise.all([
          QRCode.toString(value, {
            type: 'svg',
            width: size,
            margin: 1,
            color: { dark: darkColor, light: lightColor },
            errorCorrectionLevel: 'M',
          }),
          QRCode.toDataURL(value, {
            width: Math.max(size * 2, 480),
            margin: 2,
            color: { dark: darkColor, light: lightColor },
            errorCorrectionLevel: 'M',
          }),
        ]);
        if (active) {
          setSvgMarkup(svg);
          onGenerated?.(dataUrl, svg);
        }
      } catch (err) {
        console.error('QR generation failed:', err);
      }
    }
    void generate();
    return () => {
      active = false;
    };
  }, [value, size, darkColor, lightColor, onGenerated]);

  if (!svgMarkup) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-xl border border-[rgba(26,36,28,0.12)] bg-white text-xs text-[#525F55]"
      >
        Memuat QR...
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center justify-center rounded-xl border border-[rgba(26,36,28,0.12)] bg-white p-3"
      aria-label={label ?? 'Kode QR'}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
