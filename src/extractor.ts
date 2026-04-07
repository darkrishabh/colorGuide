import type { Browser } from "playwright";
import { chromium } from "playwright";
import type { StyleGuide, TypographySpec } from "./types.js";

const FALLBACK_TYPOGRAPHY: TypographySpec = {
  fontFamily: "system-ui",
  fontSize: "16px",
  fontWeight: "400",
  lineHeight: "normal",
  letterSpacing: "normal"
};

const FALLBACK_STYLE_GUIDE = (url: string): StyleGuide => ({
  url,
  mode: "light",
  colors: {
    accent: "#3b82f6",
    background: "#ffffff",
    text: "#111111"
  },
  typography: {
    h1: { ...FALLBACK_TYPOGRAPHY, fontSize: "48px", fontWeight: "700" },
    h2: { ...FALLBACK_TYPOGRAPHY, fontSize: "36px", fontWeight: "700" },
    h3: { ...FALLBACK_TYPOGRAPHY, fontSize: "30px", fontWeight: "600" },
    h4: { ...FALLBACK_TYPOGRAPHY, fontSize: "24px", fontWeight: "600" },
    p: { ...FALLBACK_TYPOGRAPHY }
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px"
  },
  shadows: {
    sm: "none",
    md: "none",
    lg: "none",
    xl: "none",
    inner: "none"
  },
  tokens: {},
  components: {
    button: {
      primary: {},
      secondary: {},
      link: {}
    },
    card: {}
  }
});

type RawExtracted = {
  typography: Record<string, TypographySpec | null>;
  colors: { background: string; text: string; accent: string };
  shadows: string[];
  spacingValues: number[];
  components: {
    button: {
      primary: Record<string, string>;
      secondary: Record<string, string>;
      link: Record<string, string>;
    };
    card: Record<string, string>;
  };
  tokens: Record<string, string>;
};

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance) return browserInstance;
  browserInstance = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"]
  });
  return browserInstance;
}

const COLOR_NAMES: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  transparent: "#ffffff"
};

function normalizeUrl(url?: string, domain?: string): string {
  if (url) {
    return new URL(url).toString();
  }
  if (!domain) {
    throw new Error("Either url or domain must be provided");
  }
  const normalizedDomain = domain.replace(/^https?:\/\//i, "").trim();
  return new URL(`https://${normalizedDomain}`).toString();
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r1, g1, b1] = [0, 0, 0];
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp >= 1 && hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp >= 2 && hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp >= 3 && hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp >= 4 && hp < 5) [r1, g1, b1] = [x, 0, c];
  else if (hp >= 5 && hp < 6) [r1, g1, b1] = [c, 0, x];
  const m = light - c / 2;
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

function normalizeColor(input: string): string {
  const value = input.trim().toLowerCase();
  if (!value) return "#000000";

  if (COLOR_NAMES[value]) return COLOR_NAMES[value];

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      return `#${hex.split("").map((char) => `${char}${char}`).join("")}`;
    }
    if (hex.length === 4) {
      const [r, g, b, a] = hex.split("").map((char) => parseInt(`${char}${char}`, 16));
      return rgbToHex(r * (a / 255) + 255 * (1 - a / 255), g * (a / 255) + 255 * (1 - a / 255), b * (a / 255) + 255 * (1 - a / 255));
    }
    if (hex.length === 6) return `#${hex}`;
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return rgbToHex(r * a + 255 * (1 - a), g * a + 255 * (1 - a), b * a + 255 * (1 - a));
    }
  }

  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const [r, g, b, alpha] = rgbMatch[1].split(",").map((part) => part.trim());
    const rv = Number.parseFloat(r);
    const gv = Number.parseFloat(g);
    const bv = Number.parseFloat(b);
    const av = alpha ? Number.parseFloat(alpha) : 1;
    return rgbToHex(rv * av + 255 * (1 - av), gv * av + 255 * (1 - av), bv * av + 255 * (1 - av));
  }

  const hslMatch = value.match(/^hsla?\(([^)]+)\)$/);
  if (hslMatch) {
    const [h, s, l, alpha] = hslMatch[1].split(",").map((part) => part.trim().replace("%", ""));
    const [r, g, b] = hslToRgb(Number.parseFloat(h), Number.parseFloat(s), Number.parseFloat(l));
    const av = alpha ? Number.parseFloat(alpha) : 1;
    return rgbToHex(r * av + 255 * (1 - av), g * av + 255 * (1 - av), b * av + 255 * (1 - av));
  }

  return "#000000";
}

function luminance(hex: string): number {
  const color = hex.replace("#", "");
  const channels = [0, 2, 4].map((idx) => Number.parseInt(color.slice(idx, idx + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function buildSpacingScale(values: number[]): StyleGuide["spacing"] {
  const filtered = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  const source = filtered.length ? filtered : [4, 8, 16, 24, 32];
  return {
    xs: `${Math.round(quantile(source, 0.1))}px`,
    sm: `${Math.round(quantile(source, 0.3))}px`,
    md: `${Math.round(quantile(source, 0.5))}px`,
    lg: `${Math.round(quantile(source, 0.75))}px`,
    xl: `${Math.round(quantile(source, 0.95))}px`
  };
}

function buildShadowScale(shadows: string[]): StyleGuide["shadows"] {
  const normalized = shadows.filter(Boolean).filter((shadow) => shadow !== "none");
  const sorted = normalized.sort((a, b) => a.length - b.length);
  return {
    sm: sorted[0] ?? "none",
    md: sorted[Math.min(1, sorted.length - 1)] ?? "none",
    lg: sorted[Math.min(2, sorted.length - 1)] ?? "none",
    xl: sorted[Math.min(3, sorted.length - 1)] ?? "none",
    inner: normalized.find((shadow) => shadow.includes("inset")) ?? "none"
  };
}

export function cacheKeyFromUrl(url: string): string {
  return `style-guide:${new URL(url).hostname.toLowerCase()}`;
}

export async function extractStyleGuide(input: { url?: string; domain?: string }): Promise<StyleGuide> {
  const targetUrl = normalizeUrl(input.url, input.domain);
  const fallback = FALLBACK_STYLE_GUIDE(targetUrl);
  const browser = await getBrowser();

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
      javaScriptEnabled: true
    });
    const page = await context.newPage();

    try {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 10_000 });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await page.waitForTimeout(500);
    } catch {
      // Extraction can still produce partial data from the loaded DOM state.
    }

    const raw = await page
      .evaluate<RawExtracted>(() => {
        const styleSnapshotProps = Array.from(new Set([
          "display",
          "position",
          "color",
          "background",
          "backgroundColor",
          "fontFamily",
          "fontSize",
          "fontWeight",
          "lineHeight",
          "letterSpacing",
          "textDecoration",
          "border",
          "borderColor",
          "borderRadius",
          "padding",
          "paddingTop",
          "paddingRight",
          "paddingBottom",
          "paddingLeft",
          "margin",
          "marginTop",
          "marginRight",
          "marginBottom",
          "marginLeft",
          "boxShadow",
          "opacity",
          "cursor",
          "width",
          "height",
          "minWidth",
          "minHeight",
          "maxWidth",
          "gap",
          "alignItems",
          "justifyContent"
        ]));

        const getTypography = (selector: string) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const style = window.getComputedStyle(el);
          return {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing
          };
        };

        const getSnapshot = (element: Element | null): Record<string, string> => {
          if (!element) return {};
          const style = window.getComputedStyle(element);
          const snapshot: Record<string, string> = {};
          for (const key of styleSnapshotProps) {
            snapshot[key] = style.getPropertyValue(key);
          }
          return snapshot;
        };

        const isVisible = (el: Element): boolean => {
          const rect = el.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return false;
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") return false;
          if (Number.parseFloat(style.opacity || "1") === 0) return false;
          return true;
        };

        const buttonCandidates = Array.from(document.querySelectorAll("button, a[href], [role='button']"))
          .filter(isVisible)
          .map((el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const hasSolidBackground = style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent";
            const score = rect.width * rect.height + Number.parseFloat(style.fontWeight || "400") * 2 + (hasSolidBackground ? 3000 : 0);
            return {
              el,
              style,
              score,
              signature: [
                style.backgroundColor,
                style.color,
                style.borderColor,
                style.borderRadius,
                style.fontSize,
                style.fontWeight
              ].join("|"),
              hasSolidBackground
            };
          })
          .sort((a, b) => b.score - a.score);

        const groupedButtons = new Map<string, typeof buttonCandidates>();
        for (const candidate of buttonCandidates) {
          const group = groupedButtons.get(candidate.signature) ?? [];
          group.push(candidate);
          groupedButtons.set(candidate.signature, group);
        }

        const sortedGroups = Array.from(groupedButtons.values()).sort((a, b) => {
          const avgA = a.reduce((sum, item) => sum + item.score, 0) / a.length;
          const avgB = b.reduce((sum, item) => sum + item.score, 0) / b.length;
          return avgB - avgA;
        });

        const primaryCandidate = sortedGroups.find((group) => group.some((item) => item.hasSolidBackground))?.[0] ?? buttonCandidates[0] ?? null;
        const secondaryCandidate =
          sortedGroups.find((group) => group[0]?.signature !== primaryCandidate?.signature)?.[0] ??
          buttonCandidates.find((button) => button.signature !== primaryCandidate?.signature) ??
          null;
        const linkCandidate =
          buttonCandidates.find((button) => button.el.tagName.toLowerCase() === "a" && !button.hasSolidBackground) ??
          buttonCandidates.find((button) => button.el.tagName.toLowerCase() === "a") ??
          null;

        const rawCardSelectors = [
          "[class*='card' i]",
          "article",
          "section > div",
          "main > div",
          "div"
        ];

        const cardCandidates = rawCardSelectors
          .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
          .filter((el, index, arr) => arr.indexOf(el) === index)
          .filter(isVisible)
          .map((el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const hasCardTraits =
              style.boxShadow !== "none" ||
              Number.parseFloat(style.borderWidth || "0") > 0 ||
              Number.parseFloat(style.borderRadius || "0") > 0;
            return {
              el,
              score:
                rect.width * rect.height +
                (hasCardTraits ? 3500 : 0) +
                Number.parseFloat(style.paddingTop || "0") * 10 +
                Number.parseFloat(style.paddingLeft || "0") * 10,
              style
            };
          })
          .sort((a, b) => b.score - a.score);

        const cardCandidate = cardCandidates[0]?.el ?? null;
        const bodyStyle = window.getComputedStyle(document.body);
        const paragraphStyle = window.getComputedStyle(document.querySelector("p") ?? document.documentElement);

        const spacingValues = new Set<number>();
        for (const source of [cardCandidate, primaryCandidate?.el, secondaryCandidate?.el, document.querySelector("main"), document.querySelector("section")]) {
          if (!source) continue;
          const style = window.getComputedStyle(source);
          const values = [
            style.paddingTop,
            style.paddingRight,
            style.paddingBottom,
            style.paddingLeft,
            style.marginTop,
            style.marginRight,
            style.marginBottom,
            style.marginLeft,
            style.gap
          ];
          values.forEach((value) => {
            const parsed = Number.parseFloat(value);
            if (!Number.isNaN(parsed) && parsed > 0) spacingValues.add(parsed);
          });
        }

        const tokens: Record<string, string> = {};
        const tokenSources = [document.documentElement, ...Array.from(document.querySelectorAll("[data-theme]")).slice(0, 5)];
        for (const source of tokenSources) {
          const style = window.getComputedStyle(source as Element);
          for (const propertyName of style) {
            if (!propertyName.startsWith("--")) continue;
            const tokenValue = style.getPropertyValue(propertyName).trim();
            if (tokenValue) tokens[propertyName] = tokenValue;
          }
        }

        return {
          typography: {
            h1: getTypography("h1"),
            h2: getTypography("h2"),
            h3: getTypography("h3"),
            h4: getTypography("h4"),
            p: getTypography("p")
          },
          colors: {
            background: bodyStyle.backgroundColor || "#ffffff",
            text: paragraphStyle.color || bodyStyle.color || "#111111",
            accent: primaryCandidate?.style.backgroundColor || primaryCandidate?.style.color || "#3b82f6"
          },
          shadows: [
            primaryCandidate?.style.boxShadow || "",
            secondaryCandidate?.style.boxShadow || "",
            linkCandidate?.style.boxShadow || "",
            window.getComputedStyle(cardCandidate ?? document.body).boxShadow || ""
          ].filter(Boolean),
          spacingValues: Array.from(spacingValues),
          components: {
            button: {
              primary: getSnapshot(primaryCandidate?.el ?? null),
              secondary: getSnapshot(secondaryCandidate?.el ?? null),
              link: getSnapshot(linkCandidate?.el ?? null)
            },
            card: getSnapshot(cardCandidate)
          },
          tokens
        };
      })
      .catch(() => null);

    await context.close();

    if (!raw) return fallback;

    const spacing = buildSpacingScale(raw.spacingValues);
    const shadows = buildShadowScale(raw.shadows);
    const background = normalizeColor(raw.colors.background || fallback.colors.background);
    const text = normalizeColor(raw.colors.text || fallback.colors.text);
    const accent = normalizeColor(raw.colors.accent || fallback.colors.accent);
    const mode: "light" | "dark" = luminance(background) < 0.45 ? "dark" : "light";

    return {
      url: targetUrl,
      mode,
      colors: { background, text, accent },
      typography: {
        h1: raw.typography.h1 ?? fallback.typography.h1,
        h2: raw.typography.h2 ?? fallback.typography.h2,
        h3: raw.typography.h3 ?? fallback.typography.h3,
        h4: raw.typography.h4 ?? fallback.typography.h4,
        p: raw.typography.p ?? fallback.typography.p
      },
      spacing,
      shadows,
      tokens: raw.tokens,
      components: raw.components
    };
  } finally {
    // Browser instance is shared for lower latency.
  }
}

export function createFallbackStyleGuide(url: string): StyleGuide {
  return FALLBACK_STYLE_GUIDE(url);
}

export function ensureUrl(input: { url?: string; domain?: string }): string {
  return normalizeUrl(input.url, input.domain);
}

export function hasValidExtractInput(input: { url?: string; domain?: string }): boolean {
  if (!input.url && !input.domain) return false;
  try {
    normalizeUrl(input.url, input.domain);
    return true;
  } catch {
    return false;
  }
}

export function getDomainFromInput(input: { url?: string; domain?: string }): string {
  return new URL(normalizeUrl(input.url, input.domain)).hostname.toLowerCase();
}

export function normalizeStyleGuideColors(styleGuide: StyleGuide): StyleGuide {
  const normalizedTokens = Object.entries(styleGuide.tokens).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = value.includes("rgb") || value.startsWith("#") || value.startsWith("hsl") ? normalizeColor(value) : value;
    return acc;
  }, {});

  return {
    ...styleGuide,
    mode: luminance(normalizeColor(styleGuide.colors.background)) < 0.45 ? "dark" : "light",
    colors: {
      accent: normalizeColor(styleGuide.colors.accent),
      background: normalizeColor(styleGuide.colors.background),
      text: normalizeColor(styleGuide.colors.text)
    },
    tokens: normalizedTokens
  };
}

export async function closeExtractorBrowser(): Promise<void> {
  if (!browserInstance) return;
  await browserInstance.close();
  browserInstance = null;
}
