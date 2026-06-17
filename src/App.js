import { useState, useEffect, useRef } from "react";
import axios from "axios";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FaMicrophone, FaStop, FaPaperPlane, FaHistory, FaPlus, FaDownload, FaTrash, FaEdit, FaCheck, FaTimes, FaSun, FaMoon } from "react-icons/fa";
import html2pdf from "html2pdf.js";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");

  // UI State Enhancements
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const printRef = useRef();
  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // Dynamic Theme Colors
  const theme = {
    bgMain: isDarkMode ? "#0f172a" : "#f8fafc",
    bgSide: isDarkMode ? "#111827" : "#f1f5f9",
    bgBox: isDarkMode ? "#1e293b" : "#ffffff",
    bgInput: isDarkMode ? "#1f2937" : "#ffffff",
    textMain: isDarkMode ? "white" : "#0f172a",
    textMuted: isDarkMode ? "#94a3b8" : "#64748b",
    border: isDarkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
    borderInput: isDarkMode ? "1px solid #334155" : "1px solid #cbd5e1",
    userBubble: "#2563eb",
    aiBubble: isDarkMode ? "#1e293b" : "#ffffff",
    aiText: isDarkMode ? "#f8fafc" : "#0f172a",
  };

  useEffect(() => { if (transcript) setMessage(transcript); }, [transcript]);
  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/chat-sessions");
      setHistory(res.data);
    } catch (err) { console.log("Error loading sidebar metadata: ", err); }
  };

  const loadChatSession = async (id) => {
    try {
      setLoading(true);
      setUploadStatus("Hydrating conversation session history logs...");
      const res = await axios.get(`http://localhost:5000/api/chat-sessions/${id}`);
      const historicalMessages = res.data.messages.map((msg) => ({
        sender: msg.role === "user" ? "user" : "ai",
        text: msg.text,
      }));
      setChat(historicalMessages);
      setActiveChatId(id);
    } catch (err) { console.log(err); } 
    finally { setLoading(false); setUploadStatus(""); }
  };

  const startNewChat = () => {
    setChat([]); setActiveChatId(null); setMessage(""); setFile(null); fetchHistory();
  };

  // ================= UI ACTION: DELETE CHAT =================
  // ================= UI ACTION: DELETE CHAT =================
  const deleteChatSession = async (id, e) => {
    e.stopPropagation(); 
    console.log("👉 1. DELETE BUTTON CLICKED! Targeted ID:", id);
    
    if (!id) {
      console.error("❌ ERROR: The ID is missing! React doesn't know what to delete.");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete this conversation?");
    if (!confirmDelete) {
      console.log("🛑 2. User clicked Cancel on the popup.");
      return;
    }
    
    try {
      console.log("📡 3. Sending network request to backend server...");
      const res = await axios.delete(`http://localhost:5000/api/chat-sessions/${id}`);
      
      console.log("✅ 4. Backend responded successfully:", res.data);
      
      // Remove it from the screen immediately
      setHistory((prevHistory) => prevHistory.filter((item) => item._id !== id));
      if (activeChatId === id) startNewChat();
      
    } catch (err) { 
      console.error("❌ 4. NETWORK FAILED:", err.response ? err.response.data : err.message); 
      alert("Delete failed! Check the F12 Console for details.");
    }
  };
  // ================= UI ACTION: RENAME CHAT =================
  const saveRenameChat = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.put(`http://localhost:5000/api/chat-sessions/${id}`, { title: editTitle });
      setEditingChatId(null);
      fetchHistory();
    } catch (err) { console.error("Failed to rename", err); }
  };

  const sendMessage = async () => {
    if (!message.trim() && !file) return;
    setLoading(true);
    let trackingChatId = activeChatId;
    let initialUserDisplayMessage = message;

    try {
      if (file) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        const cleanFileName = file.name.replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim();
        setUploadStatus("📤 Transferring file streams over secure cloud corridors...");
        setChat((prev) => [...prev, { sender: "user", text: `📄 Processing file: ${cleanFileName}...` }]);
        
        const uploadRes = await axios.post("http://localhost:5000/api/chat/upload", uploadForm, { headers: { "Content-Type": "multipart/form-data" } });
        setUploadStatus("🧠 Fragmenting metrics and mapping structural vector embeddings...");
        trackingChatId = uploadRes.data.chatId;
        setActiveChatId(trackingChatId);
        
        if (!initialUserDisplayMessage.trim()) initialUserDisplayMessage = "Analyze this file";
        setFile(null); 
      } else {
        setUploadStatus("📨 Distributing text input metrics to communication pipeline...");
        setChat((prev) => [...prev, { sender: "user", text: initialUserDisplayMessage }]);
      }

      setMessage("");
      setUploadStatus("🤖 Groq Llama architecture compiling inferences...");
      const res = await axios.post("http://localhost:5000/api/chat", { message: initialUserDisplayMessage, chatId: trackingChatId });
      setChat((prev) => [...prev, { sender: "ai", text: res.data.text }]);
      if (!activeChatId) setActiveChatId(res.data.chatId);

      const speech = new SpeechSynthesisUtterance(res.data.text);
      speech.lang = "en-US";
      window.speechSynthesis.speak(speech);
      fetchHistory(); 
    } catch (err) {
      setChat((prev) => [...prev, { sender: "ai", text: `⚠️ Error: Could not reach AI engine.` }]);
    } finally {
      setLoading(false); setUploadStatus("");
    }
  };

  const startListening = () => { resetTranscript(); SpeechRecognition.startListening({ continuous: true, language: "en-US" }); };
  const stopListening = () => { SpeechRecognition.stopListening(); };

  const handleDownloadPdf = () => {
    if (chat.length === 0) { alert("There is no chat history to download yet!"); return; }
    const printContainer = document.createElement("div");
    printContainer.style.padding = "40px"; printContainer.style.fontFamily = "Arial, sans-serif";
    printContainer.style.color = "black"; printContainer.style.background = "white"; printContainer.style.width = "800px"; 

    const header = document.createElement("h1");
    header.innerText = "AI Assistant Analysis Report";
    header.style.textAlign = "center"; header.style.color = "#1e293b";
    header.style.borderBottom = "2px solid #cbd5e1"; header.style.paddingBottom = "10px"; header.style.marginBottom = "30px";
    printContainer.appendChild(header);

    chat.forEach((msg) => {
      const msgWrapper = document.createElement("div");
      msgWrapper.style.marginBottom = "20px"; msgWrapper.style.padding = "15px"; msgWrapper.style.borderRadius = "8px";
      if (msg.sender === "user") {
        msgWrapper.style.background = "#f1f5f9"; msgWrapper.style.borderLeft = "4px solid #2563eb"; 
        msgWrapper.innerHTML = `<strong>User Query:</strong><br/><br/>${msg.text.replace(/\n/g, '<br/>')}`;
      } else {
        msgWrapper.style.background = "white"; msgWrapper.style.borderLeft = "4px solid #10b981"; 
        msgWrapper.innerHTML = `<strong>AI Analysis:</strong><br/><br/>${msg.text.replace(/\n/g, '<br/>')}`;
      }
      printContainer.appendChild(msgWrapper);
    });

    document.body.appendChild(printContainer);
    html2pdf().set({
      margin: 15, filename: `AI_Report_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    }).from(printContainer).save().then(() => document.body.removeChild(printContainer));
  };

  if (!browserSupportsSpeechRecognition) return <h3>Speech not supported.</h3>;

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bgMain, color: theme.textMain, fontFamily: "sans-serif", transition: "all 0.3s ease" }}>

      {/* SIDEBAR CONTAINER */}
      <div style={{ width: "300px", background: theme.bgSide, padding: "15px", display: "flex", flexDirection: "column", borderRight: theme.border, transition: "all 0.3s ease" }}>
        <button onClick={startNewChat} style={{ width: "100%", padding: "12px", marginBottom: "10px", background: theme.bgBox, color: theme.textMain, border: theme.borderInput, borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
          <FaPlus size={12} /> New Chat
        </button>
        <button onClick={handleDownloadPdf} style={{ width: "100%", padding: "12px", marginBottom: "15px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
          <FaDownload size={14} /> Download Chat PDF
        </button>

        <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", color: theme.textMuted, margin: "10px 0" }}>
          <FaHistory /> History
        </h3>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: "5px" }}>
          {history.map((item) => (
            <div 
              key={item._id} 
              onClick={() => loadChatSession(item._id)}
              style={{
                padding: "12px", margin: "8px 0", background: activeChatId === item._id ? "#2563eb" : theme.bgBox,
                color: activeChatId === item._id ? "white" : theme.textMain, borderRadius: "10px", cursor: "pointer",
                fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", border: activeChatId === item._id ? "1px solid #3b82f6" : theme.borderInput,
              }}
            >
              {/* If Editing, show input. Otherwise show Title. */}
              {editingChatId === item._id ? (
                <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "5px" }}>
                  <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onClick={(e) => e.stopPropagation()} style={{ flex: 1, padding: "4px", borderRadius: "4px", border: "none", outline: "none", color: "black" }} />
                  <FaCheck onClick={(e) => saveRenameChat(item._id, e)} style={{ cursor: "pointer", color: "#10b981" }} />
                  <FaTimes onClick={(e) => { e.stopPropagation(); setEditingChatId(null); }} style={{ cursor: "pointer", color: "#ef4444" }} />
                </div>
              ) : (
                <>
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>💬 {item.title || "Untitled Chat"}</span>
                  <div style={{ display: "flex", gap: "8px", opacity: 0.7 }}>
                    <FaEdit onClick={(e) => { e.stopPropagation(); setEditingChatId(item._id); setEditTitle(item.title); }} title="Rename" />
                    <FaTrash onClick={(e) => deleteChatSession(item._id, e)} title="Delete" style={{ color: activeChatId === item._id ? "white" : "#ef4444" }} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* LIGHT/DARK MODE TOGGLE */}
        <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ marginTop: "15px", width: "100%", padding: "12px", background: theme.bgBox, color: theme.textMain, border: theme.borderInput, borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", fontWeight: "bold" }}>
          {isDarkMode ? <><FaSun style={{ color: "#fbbf24" }}/> Switch to Light Mode</> : <><FaMoon style={{ color: "#6366f1" }}/> Switch to Dark Mode</>}
        </button>
      </div>

      {/* CHAT DISPLAY PANEL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.bgMain, transition: "all 0.3s ease" }}>
        <div ref={printRef} style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
          {chat.length === 0 && (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: theme.textMuted, fontSize: "14px", gap: "4px" }}>
              <span>Your voice & text AI assistant is ready.</span>
              <span style={{ fontSize: "12px", opacity: 0.8 }}>Select an existing thread or upload a document file to begin.</span>
            </div>
          )}

          {chat.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.sender === "user" ? "flex-end" : "flex-start", margin: "14px 0" }}>
              <div style={{ background: msg.sender === "user" ? theme.userBubble : theme.aiBubble, padding: "14px 20px", borderRadius: "12px", maxWidth: "75%", lineHeight: "1.6", fontSize: "14px", color: msg.sender === "user" ? "white" : theme.aiText, border: msg.sender === "user" ? "none" : theme.border, boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
                {msg.sender === "user" ? (
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.text}</p>
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: "0 0 10px 0" }}>{children}</p>,
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <div style={{ borderRadius: "8px", overflow: "hidden", margin: "12px 0" }}><SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>{String(children).replace(/\n$/, "")}</SyntaxHighlighter></div>
                        ) : (<code style={{ background: isDarkMode ? "#0f172a" : "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#f43f5e" }} {...props}>{children}</code>);
                      },
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && ( <p style={{ color: "#3b82f6", fontSize: "13px" }}>{uploadStatus || "Processing payload..."}</p> )}
        </div>

        {/* INPUT BAR */}
        <div style={{ display: "flex", gap: "10px", padding: "20px", background: theme.bgSide, alignItems: "center", borderTop: theme.border, transition: "all 0.3s ease" }}>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask something..." style={{ flex: 1, padding: "14px", borderRadius: "10px", border: theme.borderInput, background: theme.bgInput, color: theme.textMain, fontSize: "14px", outline: "none" }} />
          <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ color: theme.textMuted, fontSize: "13px", maxWidth: "180px" }} />
          <button onClick={listening ? stopListening : startListening} style={{ padding: "14px 16px", borderRadius: "10px", background: listening ? "#ef4444" : "#22c55e", color: "white", border: "none", cursor: "pointer" }}>{listening ? <FaStop /> : <FaMicrophone />}</button>
          <button onClick={sendMessage} style={{ padding: "14px 18px", borderRadius: "10px", background: "#2563eb", color: "white", border: "none", cursor: "pointer" }}><FaPaperPlane /></button>
        </div>
      </div>
    </div>
  );
}

export default App;