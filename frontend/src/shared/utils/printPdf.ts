export function openPdfForPrint(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank");

  if (!popup) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return;
  }

  const tryPrint = () => {
    try {
      popup.focus();
      popup.print();
    } catch {
      // Some built-in PDF viewers do not expose print immediately.
    }
  };

  popup.addEventListener?.("load", () => setTimeout(tryPrint, 600));
  setTimeout(tryPrint, 1200);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
