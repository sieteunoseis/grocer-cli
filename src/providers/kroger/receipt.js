/**
 * Kroger receipt email parser.
 *
 * Parses Kroger pickup/delivery receipt emails to extract purchased items.
 * Handles both HTML email content and plain text fallbacks.
 *
 * Since Kroger's email template is proprietary and may change, this parser
 * uses multiple strategies:
 *   1. HTML table parsing (structured data)
 *   2. Plain text line-by-line parsing (text/plain part of email)
 *   3. Regex-based extraction as fallback
 */

/**
 * Parse a Kroger receipt from email content (HTML or plain text).
 * Returns { store, date, items[], subtotal, tax, total, savings }
 */
export function parseReceipt(content) {
  const isHtml = /<\s*html/i.test(content) || /<\s*table/i.test(content);

  if (isHtml) {
    return parseHtmlReceipt(content);
  }
  return parseTextReceipt(content);
}

/**
 * Extract text content from HTML by stripping tags.
 * Handles tables specially: cells become tab-separated within rows.
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    // Table cells: </td> and </th> become tab separator (keep row together)
    .replace(/<\/(?:td|th)\s*>/gi, "\t")
    // Row/block ends become newlines
    .replace(/<\/(?:tr|div|p|li|h[1-6])\s*>/gi, "\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, "")
    // Normalize whitespace within lines (tabs to double-space for pattern matching)
    .replace(/\t+/g, "  ")
    .replace(/ {3,}/g, "  ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parse an HTML receipt email.
 */
function parseHtmlReceipt(html) {
  // Convert to text for easier line-by-line parsing
  const text = stripHtml(html);
  return parseTextReceipt(text);
}

/**
 * Parse a plain-text receipt.
 */
function parseTextReceipt(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const result = {
    store: null,
    date: null,
    items: [],
    subtotal: null,
    tax: null,
    total: null,
    savings: null,
  };

  // Extract store name
  const storeMatch = text.match(
    /(?:picked up at|delivered from|your\s+)(\S+.*?(?:Kroger|Ralphs|Fred Meyer|Harris Teeter|Fry's|QFC|King Soopers|Smith's|Dillons|City Market|Pay Less|Baker's|Gerbes|Jay C|Owen's|Ruler Foods)[^\n]*)/i
  ) || text.match(/((?:Kroger|Ralphs|Fred Meyer|Harris Teeter|Fry's|QFC|King Soopers|Smith's|Dillons|City Market)[^\n]*store[^\n]*)/i);
  if (storeMatch) {
    result.store = storeMatch[1].trim();
  }

  // Extract date
  const dateMatch = text.match(
    /(?:order\s+date|date|placed|purchased|picked up|delivered)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  ) || text.match(
    /(\w+\s+\d{1,2},?\s+\d{4})/
  ) || text.match(
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
  );
  if (dateMatch) {
    result.date = normalizeDate(dateMatch[1]);
  }

  // Extract totals
  const subtotalMatch = text.match(/subtotal[:\s]*\$?([\d,]+\.?\d*)/i);
  if (subtotalMatch) result.subtotal = parsePrice(subtotalMatch[1]);

  const taxMatch = text.match(/(?:sales\s*)?tax[:\s]*\$?([\d,]+\.?\d*)/i);
  if (taxMatch) result.tax = parsePrice(taxMatch[1]);

  const totalMatch = text.match(/(?:order\s+)?(?<!sub)total[:\s]*\$?([\d,]+\.?\d*)/i);
  if (totalMatch) result.total = parsePrice(totalMatch[1]);

  const savingsMatch = text.match(/(?:total\s+)?savings?[:\s]*\$?([\d,]+\.?\d*)/i);
  if (savingsMatch) result.savings = parsePrice(savingsMatch[1]);

  // Extract items - look for patterns like:
  //   "Product Name  $X.XX" or "Product Name  Qty X  $X.XX"
  //   or "Product Name  X × $X.XX  $X.XX"
  const itemPatterns = [
    // "Product Name  2 × $3.99  $7.98" or "Product Name  2x $3.99  $7.98"
    /^(.+?)\s+(\d+)\s*[×xX]\s*\$?([\d,]+\.?\d*)\s+\$?([\d,]+\.?\d*)\s*$/,
    // "Product Name  Qty: 2  $7.98"
    /^(.+?)\s+(?:qty|quantity)[:\s]*(\d+)\s+\$?([\d,]+\.?\d*)\s*$/i,
    // "Product Name  $3.99" (single item)
    /^(.+?)\s{2,}\$?([\d,]+\.?\d+)\s*$/,
  ];

  // Words that indicate non-item lines
  const skipWords = /^(subtotal|tax|total|savings|order|payment|card|visa|mastercard|amex|discover|change|tender|coupon|discount|shipping|delivery|tip|fee|deposit|thank|receipt|date|store|address|phone|email|loyalty|fuel|points|survey|your\s)/i;

  for (const line of lines) {
    if (skipWords.test(line)) continue;

    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match) {
        if (match.length === 5) {
          // qty × unit_price  total_price
          result.items.push({
            productName: match[1].trim(),
            quantity: parseInt(match[2], 10),
            unitPrice: parsePrice(match[3]),
            totalPrice: parsePrice(match[4]),
          });
        } else if (match.length === 4) {
          // Qty: N  total_price
          result.items.push({
            productName: match[1].trim(),
            quantity: parseInt(match[2], 10),
            totalPrice: parsePrice(match[3]),
          });
        } else if (match.length === 3) {
          // product  price
          result.items.push({
            productName: match[1].trim(),
            quantity: 1,
            totalPrice: parsePrice(match[2]),
          });
        }
        break;
      }
    }
  }

  return result;
}

function parsePrice(str) {
  return parseFloat(str.replace(/,/g, "")) || 0;
}

function normalizeDate(dateStr) {
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  // Try MM/DD/YYYY or MM-DD-YYYY
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    let [m, day, y] = parts;
    if (y.length === 2) y = "20" + y;
    return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return dateStr;
}
