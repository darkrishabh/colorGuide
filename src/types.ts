export type TypographySpec = {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
};

export type Colors = {
  accent: string;
  background: string;
  text: string;
};

export type SpacingScale = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
};

export type ShadowScale = {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  inner: string;
};

export type ComponentStyles = Record<string, string>;

export type StyleGuide = {
  url: string;
  mode: "light" | "dark";
  colors: Colors;
  typography: {
    h1: TypographySpec;
    h2: TypographySpec;
    h3: TypographySpec;
    h4: TypographySpec;
    p: TypographySpec;
  };
  spacing: SpacingScale;
  shadows: ShadowScale;
  tokens: Record<string, string>;
  components: {
    button: {
      primary: ComponentStyles;
      secondary: ComponentStyles;
      link: ComponentStyles;
    };
    card: ComponentStyles;
  };
};

export type ExtractParams = {
  url?: string;
  domain?: string;
};

export type ScrapeParams = ExtractParams & {
  format?: "html" | "text";
};

export type ScrapeResult = {
  url: string;
  title: string;
  description: string;
  content: string;
  links: string[];
  headings: Array<{ tag: "h1" | "h2" | "h3"; text: string }>;
};

export type SitemapResult = {
  url: string;
  urls: string[];
};

export type ContextResult = {
  url: string;
  title: string;
  description: string;
  styleGuide: StyleGuide;
  links: string[];
  headings: Array<{ tag: "h1" | "h2" | "h3"; text: string }>;
};
