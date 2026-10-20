import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

/**
 * Confirmation dialog required before every destructive admin action.
 * Set `confirmPhrase` to force the operator to type something explicit.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  confirmPhrase,
  loading = false,
  onConfirm,
}) {
  const [phrase, setPhrase] = useState('');
  const locked = Boolean(confirmPhrase) && phrase.trim() !== confirmPhrase;

  const close = (next) => {
    if (!next) setPhrase('');
    onOpenChange?.(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {destructive ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
                <AlertTriangle className="size-4" />
              </span>
            ) : null}
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription className="mt-1">{description}</DialogDescription> : null}
            </div>
          </div>
        </DialogHeader>

        {confirmPhrase ? (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-phrase">
              Type <span className="font-mono font-semibold">{confirmPhrase}</span> to continue
            </Label>
            <Input
              id="confirm-phrase"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              placeholder={confirmPhrase}
              autoComplete="off"
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'default'}
            disabled={locked || loading}
            onClick={async () => {
              await onConfirm?.();
              setPhrase('');
            }}
          >
            {loading ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDialog;
