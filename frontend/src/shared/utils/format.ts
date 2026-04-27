const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function localDateFromParts(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseDateValue(value: Date | string) {
  if (value instanceof Date) {
    return value;
  }

  if (DATE_ONLY_RE.test(value)) {
    return localDateFromParts(value);
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value.replace(" ", "T"));
  }

  return new Date(value);
}

function parseDateOnlyValue(value: Date | string) {
  if (value instanceof Date) {
    return value;
  }

  if (DATE_ONLY_RE.test(value) || /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/.test(value)) {
    return localDateFromParts(value);
  }

  return parseDateValue(value);
}

export function toLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMoney(value: number | string, symbol = "$") {
  const amount = Number(value) || 0;

  return `${symbol} ${amount.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value: Date | string) {
  return parseDateOnlyValue(value).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value: Date | string) {
  return parseDateValue(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
