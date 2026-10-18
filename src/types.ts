export type ReadingTheme = "light" | "sepia" | "dark" | "nord";
export type FontSize = "sm" | "md" | "lg" | "xl";

export interface ReadingSettings {
  theme: ReadingTheme;
  fontSize: FontSize;
  lineHeight: "normal" | "relaxed" | "loose";
  maxWidth: "narrow" | "medium" | "wide" | "full";
  showDiagrams: boolean;
  highlightSearchTerms: boolean;
}

export interface CalloutBox {
  type: "info" | "definition" | "case-study" | "warning" | "tip";
  title: string;
  content: string;
  sourcePage?: number;
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
  caption?: string;
  interactiveType?: "billing-calculator" | "comparison-matrix" | "storage-matrix";
}

export interface CodeBlock {
  language: string;
  code: string;
  description?: string;
}

export interface DiagramData {
  id: string;
  figureNumber: string;
  title: string;
  description: string;
  type: 
    | "data-centers-map"
    | "onprem-vs-aws"
    | "webshop-cdn-lb"
    | "java-ee-vpc"
    | "backup-storage"
    | "fault-tolerant-az"
    | "aws-service-layers"
    | "interaction-spectrum"
    | "ec2-console-sim"
    | "cli-terminal-sim"
    | "blueprint-code"
    | "signup-walkthrough";
  interactiveData?: any;
}

export interface NoteSection {
  id: string;
  pageNumber: number;
  title: string;
  subtitle?: string;
  contentMarkdown: string;
  speakerNotes?: string;
  slideImageUrl?: string;
  callouts?: CalloutBox[];
  tables?: TableData[];
  diagrams?: DiagramData[];
  codeBlocks?: CodeBlock[];
}

export type AppPortalMode = "student" | "teacher";

export interface NoteDocument {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  pageCount: number;
  sections: NoteSection[];
  pdfUrl?: string;
  pdfDataUrl?: string;
  slideImages?: string[];
  fileType?: string;
  fileFormat?: "pdf" | "docx" | "doc" | "pptx" | "ppt" | "markdown" | "code" | "text" | "google-drive";
  subject?: string;
  unit?: string;
  unitNumber?: number;
  unitTitle?: string;
  courseCode?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  isPublished?: boolean;
  tags?: string[];
  downloadUrl?: string;
  originalFileUrl?: string;
  originalFileName?: string;
}

export interface CourseAnnouncement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  important?: boolean;
  relatedDocId?: string;
  relatedDocTitle?: string;
}

export interface QuizQuestion {
  id: string;
  noteId: string;
  sectionId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface UserBookmark {
  id: string;
  noteId: string;
  sectionId: string;
  sectionTitle: string;
  textSnippet: string;
  createdTime: string;
  color?: string;
  note?: string;
}

export interface SearchResult {
  noteId: string;
  sectionId: string;
  sectionTitle: string;
  pageNumber: number;
  matchedText: string;
  context: string;
}
