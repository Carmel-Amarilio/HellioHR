import { useState, useRef, useEffect } from 'react';
import { askQuestion, getAvailableModels } from '../services/chatService';
import type { ChatResponse } from '../types/index.js';
import './ChatPage.css';

interface Message {
  id: string;
  question: string;
  answer?: string;
  error?: string;
  suggestion?: string;
  trace?: ChatResponse['trace'];
  metrics?: ChatResponse['totalMetrics'];
  timestamp: Date;
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [selectedModel, setSelectedModel] = useState('amazon.nova-lite-v1:0');
  const [loading, setLoading] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const models = getAvailableModels();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim() || loading) return;

    const messageId = Date.now().toString();
    const userQuestion = question.trim();
    setQuestion('');
    setLoading(true);

    // Add user message immediately
    const newMessage: Message = {
      id: messageId,
      question: userQuestion,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);

    try {
      const response = await askQuestion(userQuestion, selectedModel);

      // Update message with answer
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                answer: response.answer,
                trace: response.trace,
                metrics: response.totalMetrics,
              }
            : msg
        )
      );
    } catch (error: any) {
      // Update message with error
      const errorMessage = error.message || 'An error occurred';
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                error: errorMessage,
                suggestion: error.suggestion,
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const toggleTrace = (messageId: string) => {
    setExpandedTraceId(prev => (prev === messageId ? null : messageId));
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(6)}`;
  };

  const formatLatency = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h1>SQL-RAG Chat</h1>
        <p>Ask questions about candidates and positions in natural language</p>
        <div className="model-selector">
          <label htmlFor="model-select">Model:</label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={loading}
          >
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet. Try asking:</p>
            <ul>
              <li>"List all candidates with React experience"</li>
              <li>"Which positions do not have any candidates?"</li>
              <li>"How many candidates are active?"</li>
              <li>"Show me all departments"</li>
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="message">
              <div className="message-question">
                <strong>Q:</strong> {message.question}
              </div>

              {message.answer && (
                <div className="message-answer">
                  <strong>A:</strong> {message.answer}
                </div>
              )}

              {message.error && (
                <div className="message-error">
                  <strong>Error:</strong> {message.error}
                  {message.suggestion && (
                    <div className="message-suggestion">
                      <strong>Suggestion:</strong> {message.suggestion}
                    </div>
                  )}
                </div>
              )}

              {message.trace && (
                <div className="message-trace">
                  <button
                    className="trace-toggle"
                    onClick={() => toggleTrace(message.id)}
                  >
                    {expandedTraceId === message.id ? '▼' : '▶'} Show Trace Details
                  </button>

                  {expandedTraceId === message.id && (
                    <div className="trace-details">
                      {message.trace.sqlGeneration && (
                        <div className="trace-section">
                          <h4>SQL Query</h4>
                          <pre className="sql-code">{message.trace.sqlGeneration.sql}</pre>
                          <p className="sql-reasoning">
                            <strong>Reasoning:</strong> {message.trace.sqlGeneration.reasoning}
                          </p>
                          {message.trace.sqlGeneration.validation.warnings.length > 0 && (
                            <div className="validation-warnings">
                              <strong>Warnings:</strong>
                              <ul>
                                {message.trace.sqlGeneration.validation.warnings.map(
                                  (warning, idx) => (
                                    <li key={idx}>{warning}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {message.trace.sqlExecution && (
                        <div className="trace-section">
                          <h4>Execution Results</h4>
                          <p>
                            <strong>Rows:</strong> {message.trace.sqlExecution.rowCount}
                          </p>
                          <p>
                            <strong>Columns:</strong>{' '}
                            {message.trace.sqlExecution.columns.join(', ')}
                          </p>
                          <p>
                            <strong>Execution Time:</strong>{' '}
                            {formatLatency(message.trace.sqlExecution.executionTimeMs)}
                          </p>
                        </div>
                      )}

                      {message.metrics && (
                        <div className="trace-section">
                          <h4>Metrics</h4>
                          <p>
                            <strong>Total Tokens:</strong> {message.metrics.totalTokens}
                          </p>
                          <p>
                            <strong>Cost:</strong> {formatCost(message.metrics.totalCostUsd)}
                          </p>
                          <p>
                            <strong>Total Latency:</strong>{' '}
                            {formatLatency(message.metrics.totalLatencyMs)}
                          </p>
                          <p>
                            <strong>LLM Calls:</strong> {message.metrics.llmCalls}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about candidates or positions..."
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="chat-submit" disabled={loading || !question.trim()}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}
