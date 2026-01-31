import { useState } from "react";
import { useRef } from "react";
import { useEffect } from "react";
import "./App.css";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import { SYSTEM_PROMPT } from "../ai-data/route";
import DATA from "../ai-data/knowledge-markdown";

// 1. Initialize the API
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite", // Use 1.5-flash for local development stability
  systemInstruction: `${SYSTEM_PROMPT}. Here is some additional data about Sumant you can use: ${DATA}.
  CRITICAL INSTRUCTION FOR FOLLOW-UP QUESTIONS:
  1. Every single response MUST end with exactly 3 follow-up questions.
  2. These questions MUST be framed from the user's perspective (e.g., "How did you design that?" instead of "Would you like to hear how I designed that?").
  3. You MUST prefix these questions with the tag [SUGGESTIONS] and separate them with a pipe |.
  4. DO NOT include these questions in the main body of your response. They must ONLY appear after the [SUGGESTIONS] tag.

  Example format:
  "I worked on the AR project using Unity. [SUGGESTIONS] What was the biggest challenge? | How did users react to the AR? | How did you test this concept?
  "`,
});

function App() {
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [suggestions, setSuggestions] = useState([
    "So, who is Sumant 1.0?",
    "Give me a fun fact about Sumant 1.0!",
    "How can we work together?",
  ]);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  const handleSend = (e, textOverride = null) => {
    if (e) e.preventDefault();
    const messageText = textOverride || input;
    if (!messageText.trim()) return;

    if (isFirstMessage) setIsFirstMessage(false);

    const userMsg = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);

    const currentInput = messageText;
    setInput("");
    setSuggestions([]);
    setIsTyping(true);

    getAiResponse(currentInput);
  };

  async function getAiResponse(userInput) {
    try {
      // 1. Format history and filter it
      // We slice(1) to skip the initial "ask me anything!" greeting from the AI
      // OR we filter to ensure the first message in history is always 'user'
      const fullHistory = messages.map((msg) => ({
        role: msg.role === "ai" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      // Find the index of the first user message to satisfy Gemini's rule
      const firstUserIndex = fullHistory.findIndex((m) => m.role === "user");
      const validHistory =
        firstUserIndex !== -1 ? fullHistory.slice(firstUserIndex) : [];

      // 2. Start the chat session with the valid history
      const chat = model.startChat({ history: validHistory });

      // 3. Send the message
      const result = await chat.sendMessage(userInput);
      const response = await result.response;
      const fullText = response.text();

      // Split AI text from the suggestions marker
      const [cleanText, suggestionPart] = fullText.split("[SUGGESTIONS]");
      const newSuggestions = suggestionPart
        ? suggestionPart.split("|").map((s) => s.trim())
        : [];

      // ... rest of your code (safety checks and setMessages)
      if (
        response.candidates &&
        response.candidates[0].finishReason === "SAFETY"
      ) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: "I can't discuss that specific topic..." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: cleanText.trim() },
        ]);
        setSuggestions(newSuggestions.slice(0, 3));
      }
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Sorry, I hit a snag!" },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <>
      <div className="bg-[#110F12] w-screen h-screen fixed z-[-2] top-0 left-0"></div>
      <div
        className="w-screen h-[60vh] fixed z-[-1] bottom-0 left-0"
        style={{
          background: "linear-gradient(0deg, #2B1346 0%, #110F12 100%)",
        }}
      ></div>
      <div className="app-shell">
        <div
          className={`header-section ${
            isFirstMessage ? "header-hero" : "header-chat"
          }`}
        >
          <h1 className="title">Hi, I'm Sumant 2.0</h1>
          <p className="py-8 subtitle">
            I am an AI version of Sumant, feel free to ask me anything!
          </p>
        </div>

        <div
          ref={scrollRef}
          className={`chat-container scrollbar-hide pb-10 ${
            isFirstMessage ? "max-h-[0px]" : "max-h-[auto]"
          }`}
        >
          {" "}
          {!isFirstMessage && (
            <div className="message-list">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.role}`}>
                  {/* <strong>{msg.role === "ai" ? "Sumant 2.0" : "You"}:</strong>{" "} */}
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ))}
              {isTyping && (
                <div className="message ai" style={{ opacity: 0.5 }}>
                  Sumant 2.0 is thinking...
                </div>
              )}
            </div>
          )}
        </div>

        <div className="footer-section ">
          <div className="flex flex-wrap justify-end mb-4 w-full max-w-[800px]">
            <div
              className={`flex flex-row justify-self-end items-center gap-4 pb-8 bubble-transition w-full justify-center ${
                isFirstMessage ? undefined : "bubble-active"
              }`}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(null, s)}
                  className="suggestion-chip"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="w-full max-w-[800px] flex justify-center">
              <div className=" py-4 px-8 rounded-full glass-panel w-full max-w-[800px]">
                <form
                  onSubmit={handleSend}
                  className="w-full flex flex-row justify-between content-between"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                    }}
                    placeholder="Type here..."
                    disabled={isTyping}
                    className="w-full text-white"
                  ></input>
                  <button>Send</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
