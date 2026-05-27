import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CLIENT_AVATAR_COLORS } from '@/lib/clientAvatarColors';
import { CLIENT_AVATAR_SHELL, getClientAvatarAppearance } from '@/lib/clientAvatarStyles';

type ClientLogoEditorProps = {
  previewUrl: string | null;
  onPreviewChange: (url: string | null) => void;
  selectedColor: string;
  onSelectedColorChange: (color: string) => void;
  fallbackName: string;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
};

export function ClientLogoEditor({
  previewUrl,
  onPreviewChange,
  selectedColor,
  onSelectedColorChange,
  fallbackName,
  fileInputRef: externalFileInputRef,
}: ClientLogoEditorProps) {
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef ?? internalFileInputRef;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Client logo (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Shown next to the client name and on proposals. Counts toward storage.
        </p>
        <div className="flex items-center gap-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className={cn('h-12 w-12 object-cover object-center bg-white', CLIENT_AVATAR_SHELL)}
            />
          ) : (
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center text-sm font-medium',
                CLIENT_AVATAR_SHELL,
              )}
              style={getClientAvatarAppearance(selectedColor)}
            >
              {fallbackName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onPreviewChange(URL.createObjectURL(file));
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              {previewUrl ? 'Change logo' : 'Upload logo'}
            </Button>
            {previewUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  onPreviewChange(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Avatar color (when no logo)</Label>
        <div className="flex flex-wrap gap-2">
          {CLIENT_AVATAR_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`h-8 w-8 rounded-full transition-all ${
                selectedColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onSelectedColorChange(color)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
