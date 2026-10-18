import React, { useState, useEffect } from "react";
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, Award, X, ChevronDown, Loader2 } from "lucide-react";
import { QuizQuestion, NoteDocument } from "../types";
import { quizQuestions } from "../data/notesData";
import { apiFetch } from "../utils/apiClient";

interface Props {
  selectedNote?: NoteDocument | null;
  allNotes?: NoteDocument[];
  onSelectNote?: (noteId: string) => void;
  onClose?: () => void;
}

export function getQuizForDocument(
  doc?: NoteDocument | null,
  allNotes?: NoteDocument[]
): { questions: QuizQuestion[] } {
  if (!doc || doc.id === "combined") {
    return { questions: quizQuestions };
  }

  const presetQuestions = quizQuestions.filter(q => q.noteId === doc.id);
  if (presetQuestions.length > 0) {
    return { questions: presetQuestions };
  }

  const generatedQuestions: QuizQuestion[] = [];

  doc.sections.forEach((sec, idx) => {
    const cleanBody = cleanMarkdownSnippet(sec.contentMarkdown);
    const keyPoints = extractKeyPoints(sec.contentMarkdown);

    generatedQuestions.push({
      id: `gen-${doc.id}-q1-${idx}`,
      noteId: doc.id,
      sectionId: sec.id,
      question: `According to ${doc.shortTitle || doc.title}, what is the key concept covered in section "${sec.title}"?`,
      options: [
        sec.subtitle ? `${sec.subtitle}` : (keyPoints[0] || "Core architectural principles and implementation guidelines"),
        "General database index tuning and table partitioning rules",
        "Configuring external DNS servers and domain registration",
        "Legacy physical tape drive rotation schedules"
      ],
      correctIndex: 0,
      explanation: `In section "${sec.title}", the document details: ${sec.subtitle || cleanBody.slice(0, 140)}...`,
      topic: sec.title
    });

    if (sec.callouts && sec.callouts.length > 0) {
      const callout = sec.callouts[0];
      generatedQuestions.push({
        id: `gen-${doc.id}-q2-${idx}`,
        noteId: doc.id,
        sectionId: sec.id,
        question: `In "${sec.title}", what key ${callout.type} note is emphasized regarding "${callout.title}"?`,
        options: [
          callout.content,
          "Bypass identity verification for internal administrative access",
          "Disable all monitoring and logging to minimize storage consumption",
          "Store root passwords in plain text in client code files"
        ],
        correctIndex: 0,
        explanation: `The ${callout.type} note in this section explicitly states: "${callout.content}"`,
        topic: callout.title
      });
    } else if (keyPoints.length >= 1) {
      generatedQuestions.push({
        id: `gen-${doc.id}-q2-${idx}`,
        noteId: doc.id,
        sectionId: sec.id,
        question: `Which of the following points is explicitly detailed in "${sec.title}"?`,
        options: [
          keyPoints[0],
          "Requires purchasing physical rack hardware on-premises",
          "Mandates manual server reboots every 24 hours",
          "Prohibits automated load balancing"
        ],
        correctIndex: 0,
        explanation: `Section "${sec.title}" notes: "${keyPoints[0]}"`,
        topic: sec.title
      });
    }
  });

  if (generatedQuestions.length === 0) {
    generatedQuestions.push({
      id: `gen-${doc.id}-fallback`,
      noteId: doc.id,
      sectionId: "sec-1",
      question: `What is the primary topic of the document "${doc.title}"?`,
      options: [
        doc.description || "Study notes and technical implementation specifications",
        "Unrelated marketing catalog",
        "Generic network troubleshooting guide",
        "Operating system driver manual"
      ],
      correctIndex: 0,
      explanation: `This document contains: ${doc.description}`,
      topic: doc.title
    });
  }

  const shuffledQuestions = generatedQuestions.map(q => shuffleOptions(q));
  return { questions: shuffledQuestions };
}

function cleanMarkdownSnippet(text: string): string {
  return text
    .replace(/#+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 180);
}

function extractKeyPoints(markdown: string): string[] {
  const lines = markdown.split("\n");
  const points: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      const cleaned = trimmed.replace(/^[-*•]\s*/, "").replace(/\*\*/g, "");
      if (cleaned.length > 15 && cleaned.length < 150) {
        points.push(cleaned);
      }
    }
  }
  return points;
}

function shuffleOptions(q: QuizQuestion): QuizQuestion {
  const options = [...q.options];
  const correctText = options[q.correctIndex];

  let seed = 0;
  for (let i = 0; i < q.id.length; i++) seed += q.id.charCodeAt(i);
  const targetIndex = seed % options.length;

  const temp = options[targetIndex];
  options[targetIndex] = correctText;
  options[q.correctIndex] = temp;

  return {
    ...q,
    options,
    correctIndex: targetIndex
  };
}

export const FlashcardsQuiz: React.FC<Props> = ({
  selectedNote,
  allNotes = [],
  onSelectNote,
  onClose
}) => {
  const [activeNoteDoc, setActiveNoteDoc] = useState<NoteDocument | null>(selectedNote || null);

  useEffect(() => {
    setActiveNoteDoc(selectedNote || null);
  }, [selectedNote]);

  const { questions } = getQuizForDocument(activeNoteDoc, allNotes);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  const [groqQuestionsMap, setGroqQuestionsMap] = useState<Record<string, QuizQuestion[]>>({});
  const [groqProviderMap, setGroqProviderMap] = useState<Record<string, string>>({});
  const [isGeneratingGroq, setIsGeneratingGroq] = useState<boolean>(false);
  const [groqError, setGroqError] = useState<string | null>(null);

  const docKey = activeNoteDoc?.id || "combined";
  const customQuestions = groqQuestionsMap[docKey];
  const activeQuestions = customQuestions && customQuestions.length > 0 ? customQuestions : questions;

  const handleNoteChange = (noteId: string) => {
    if (onSelectNote) {
      onSelectNote(noteId);
    }
    const found = allNotes.find(n => n.id === noteId);
    setActiveNoteDoc(found || null);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setScore(0);
    setQuizFinished(false);
    setGroqError(null);
  };

  const handleGenerateGroqQuiz = async () => {
    setIsGeneratingGroq(true);
    setGroqError(null);

    try {
      let documentContent = "";
      const docTitle = activeNoteDoc ? (activeNoteDoc.title || activeNoteDoc.shortTitle) : "All AWS Notes Combined";

      if (activeNoteDoc) {
        documentContent = (activeNoteDoc.sections || []).map(s => `Section Title: ${s.title}\nSubtitle: ${s.subtitle || ""}\nContent:\n${s.contentMarkdown}`).join("\n\n");
      } else {
        documentContent = (allNotes || []).map(n => `--- Document: ${n.title} ---\n` + (n.sections || []).map(s => `${s.title}:\n${s.contentMarkdown}`).join("\n")).join("\n\n");
      }

      const res = await apiFetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentTitle: docTitle,
          documentContent,
          docId: docKey
        })
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch (parseErr) {
        console.warn("Server returned non-JSON for generate-quiz:", resText.slice(0, 100));
      }

      if (res.ok && data.questions && data.questions.length > 0) {
        setGroqQuestionsMap(prev => ({
          ...prev,
          [docKey]: data.questions
        }));
        setGroqProviderMap(prev => ({
          ...prev,
          [docKey]: data.provider || "Groq AI"
        }));
        setCurrentQuestionIndex(0);
        setSelectedOption(null);
        setIsSubmitted(false);
        setScore(0);
        setQuizFinished(false);
      }
    } catch (err: any) {
      console.warn("Automatic AI quiz generation attempt error:", err?.message || err);
    } finally {
      setIsGeneratingGroq(false);
    }
  };

  useEffect(() => {
    if (!groqQuestionsMap[docKey] && !isGeneratingGroq) {
      handleGenerateGroqQuiz();
    }
  }, [docKey]);

  const currentQ = activeQuestions[currentQuestionIndex] || activeQuestions[0];

  const handleSelectOption = (index: number) => {
    if (isSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !currentQ) return;
    setIsSubmitted(true);
    if (selectedOption === currentQ.correctIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsSubmitted(false);
    if (currentQuestionIndex + 1 < activeQuestions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setScore(0);
    setQuizFinished(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100 bg-[#1e1e1e] rounded-2xl border border-slate-800 shadow-xl max-w-3xl mx-auto">
      {/* Quiz Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">
              {activeNoteDoc ? (activeNoteDoc.shortTitle || activeNoteDoc.title) : "All Notes Combined"} Practice Quiz
            </h2>
            {isGeneratingGroq && (
              <p className="text-xs text-amber-400/90 font-medium flex items-center gap-1.5 mt-0.5">
                <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
                <span>Framing practice questions...</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {allNotes.length > 0 && (
            <div className="relative">
              <select
                value={activeNoteDoc?.id || "combined"}
                onChange={(e) => handleNoteChange(e.target.value)}
                className="bg-slate-800 text-amber-400 font-bold border border-slate-700 hover:border-amber-500/50 rounded-xl pl-3 pr-7 py-1.5 text-xs cursor-pointer focus:outline-none appearance-none"
              >
                <option value="combined">All Notes Combined</option>
                {(allNotes || []).map(n => (
                  <option key={n.id} value={n.id}>
                    {n.shortTitle || n.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Practice Quiz"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {quizFinished ? (
        <div className="p-8 text-center bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm space-y-4">
          <Award className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
          <h3 className="text-xl font-bold text-white">Note Practice Quiz Completed!</h3>
          <p className="text-sm text-slate-300">
            You scored <strong className="text-amber-400 font-mono text-xl">{score}</strong> out of <strong className="font-mono text-xl">{activeQuestions.length}</strong> on <span className="text-amber-300 font-semibold">{activeNoteDoc?.shortTitle || "this Note"}</span>!
          </p>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
            {score === activeQuestions.length
              ? "Excellent! You have mastered all key concepts in this note."
              : score >= activeQuestions.length / 2
              ? "Good job! Review any missed topics directly in the note reader."
              : "Keep practicing! Re-read the note sections and test yourself again."}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRestartQuiz}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-colors shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Retake Note Quiz
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Return to Note
              </button>
            )}
          </div>
        </div>
      ) : !currentQ ? (
        <div className="p-8 text-center text-slate-400 text-xs">No questions available for this note.</div>
      ) : (
        <div className="p-5 sm:p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm space-y-5 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-semibold">
            <span>Question {currentQuestionIndex + 1} of {activeQuestions.length}</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / activeQuestions.length) * 100}%` }}
            ></div>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
            {currentQ.question}
          </h3>

          <div className="space-y-2.5">
            {currentQ.options.map((opt, idx) => {
              let btnStyle = "bg-slate-800/80 border-slate-700/80 text-slate-100 hover:border-amber-500 hover:bg-slate-800";
              let letterStyle = "text-amber-400 font-bold";

              if (selectedOption === idx) {
                btnStyle = "bg-amber-500/20 border-2 border-amber-500 text-amber-100 font-semibold shadow-xs";
                letterStyle = "text-amber-400 font-bold";
              }

              if (isSubmitted) {
                if (idx === currentQ.correctIndex) {
                  btnStyle = "bg-emerald-950/80 border-2 border-emerald-500 text-emerald-100 font-bold shadow-xs";
                  letterStyle = "text-emerald-400 font-bold";
                } else if (selectedOption === idx) {
                  btnStyle = "bg-rose-950/80 border-2 border-rose-500 text-rose-100 font-bold shadow-xs";
                  letterStyle = "text-rose-400 font-bold";
                } else {
                  btnStyle = "bg-slate-800/40 border border-slate-800 text-slate-400";
                  letterStyle = "text-slate-500 font-bold";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer disabled:cursor-default ${btnStyle}`}
                >
                  <span className={`font-mono shrink-0 ${letterStyle}`}>{String.fromCharCode(65 + idx)}.</span>
                  <span className="flex-1 leading-relaxed">{opt}</span>
                  {isSubmitted && idx === currentQ.correctIndex && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {isSubmitted && selectedOption === idx && idx !== currentQ.correctIndex && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {isSubmitted && (
            <div className="p-4 bg-slate-800/90 border border-slate-700 rounded-xl space-y-1">
              <strong className="text-amber-400 font-bold">Explanation:</strong>
              <p className="text-slate-300 text-xs leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            {!isSubmitted ? (
              <button
                disabled={selectedOption === null}
                onClick={handleSubmitAnswer}
                className="px-5 py-2 bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs hover:bg-amber-400 transition-colors disabled:opacity-40 shadow-xs cursor-pointer"
              >
                Check Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2 bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs hover:bg-amber-400 transition-colors shadow-xs cursor-pointer"
              >
                {currentQuestionIndex + 1 === activeQuestions.length ? "View Results" : "Next Question →"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
